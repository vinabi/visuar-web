# main.py
from __future__ import annotations

from fastapi import FastAPI, Request, Depends, HTTPException, status, WebSocket, WebSocketDisconnect
import cv2
import numpy as np
import base64
import json
import asyncio
from gemini_analyzer import analyze_test_results
from vision_module.vision import VisionModule
from fastapi.responses import HTMLResponse, FileResponse
from fastapi.middleware.cors import CORSMiddleware
from dotenv import load_dotenv
import os
from pathlib import Path
from supabase import create_client, Client
from google import genai as google_genai
from google.genai import types as google_genai_types
from schemas import (
    UserCreate, UserResponse, ProfileCreate, ProfileResponse,
    TestResultCreate, TestResultResponse,
    OnboardingProfileCreate, OnboardingProfileResponse, OnboardingStatusResponse,
    ConversationCreate, ConversationRename, ConversationResponse,
    MessageResponse, ChatResponse, ProfileFieldUpdate,
    PlanUpdate,
)
from crud import (
    create_user, get_user_by_email, get_profile_by_user_id, upsert_profile,
    create_test_result, get_test_results_by_user, get_test_result_by_id_for_user,
    get_onboarding_status, get_onboarding_profile, upsert_onboarding_profile,
    get_user_plan, update_user_plan,
)
from ai_chat.embeddings import embed_text
from ai_chat.rag_engine import similarity_search, build_context_string
from ai_chat.prompt_builder import build_prompt, build_verification_prompt, parse_profile_update
from ai_chat.security import sanitize_input, is_field_name_safe
from ai_chat.chat_crud import (
    create_conversation, get_conversations, get_conversation,
    rename_conversation, delete_conversation,
    get_messages, add_message, increment_message_count,
    get_message_count, auto_title_conversation,
    MAX_MESSAGES_PER_CONVERSATION,
)
from database import get_db, init_db
from models import User, UserOnboardingProfile, TestResult
from sqlalchemy.future import select
from sqlalchemy import desc
from email_service import send_welcome_email, send_login_email, send_test_result_email
from datetime import datetime, timezone
from zoneinfo import ZoneInfo

# Load .env from the same directory as this file
env_path = Path(__file__).parent / ".env"
load_dotenv(dotenv_path=env_path)

SUPABASE_URL = os.getenv("SUPABASE_URL")
SUPABASE_KEY = os.getenv("SUPABASE_KEY")
GEMINI_API_KEY = os.getenv("GEMINI_API_KEY")

if not all([SUPABASE_URL, SUPABASE_KEY]):
    raise ValueError("Missing SUPABASE_URL or SUPABASE_KEY")

supabase: Client = create_client(SUPABASE_URL, SUPABASE_KEY)

# Gemini client for AI chat (lazy — vision tests work without GEMINI_API_KEY)
_gemini_client = None
CHAT_MODEL = "gemini-3-flash-preview"


def _get_gemini_client():
    global _gemini_client
    if _gemini_client is None:
        if not GEMINI_API_KEY:
            raise HTTPException(
                status_code=503,
                detail="GEMINI_API_KEY is not configured. AI chat is unavailable.",
            )
        _gemini_client = google_genai.Client(api_key=GEMINI_API_KEY)
    return _gemini_client

vision_module_instance = VisionModule()

app = FastAPI()

@app.on_event("startup")
async def startup_event():
    vision_module_instance.start()
    try:
        await init_db()
    except Exception as e:
        print(f"Warning: Database initialization failed: {e}")
        print("Server will run but database operations may fail until credentials are fixed.")
        # Don't re-raise - let server continue running

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

@app.get("/", response_class=HTMLResponse)
async def serve_home():
    try:
        return FileResponse("index.html")
    except FileNotFoundError:
        raise HTTPException(status_code=404, detail="index.html not found")

@app.post("/register-user", response_model=UserResponse)
async def register_user(user: UserCreate, db=Depends(get_db)):
    existing = await get_user_by_email(db, user.email)
    result = await create_user(db, user)
    # Send welcome email only for genuinely new users
    if not existing:
        asyncio.create_task(send_welcome_email(user.email, user.name))
    return result

# --- AUTH HELPER ---
async def get_current_user(request: Request, db):
    auth_header = request.headers.get("Authorization")
    if not auth_header or not auth_header.startswith("Bearer "):
        raise HTTPException(status_code=401, detail="Missing Authorization")

    token = auth_header.split(" ")[1]
    try:
        auth_user = supabase.auth.get_user(token)
    except Exception as e:
        print(f"[AUTH] Token validation failed: {e}")
        raise HTTPException(status_code=401, detail="Invalid token")

    if not auth_user.user:
        raise HTTPException(status_code=401, detail="Invalid user")

    email = auth_user.user.email
    print(f"[AUTH] Authenticated user: {email}")
    db_user = await get_user_by_email(db, email)

    if not db_user:
        print(f"[AUTH] New user — creating local record for {email}")
        name = auth_user.user.user_metadata.get("full_name") or "User"
        db_user = await create_user(db, UserCreate(email=email, name=name))

    print(f"[AUTH] DB user id={db_user.id} email={db_user.email}")
    return {"supabase": auth_user.user, "db": db_user}

@app.get("/me")
async def get_me(request: Request, db=Depends(get_db)):
    cur = await get_current_user(request, db)
    return {
        "supabase_user": cur["supabase"].dict(),
        "db_user": cur["db"]
    }

# --- NOTIFY ENDPOINTS ---
@app.post("/api/notify/login")
async def notify_login(request: Request, db=Depends(get_db)):
    """Called by the frontend once after a successful sign-in."""
    cur = await get_current_user(request, db)
    name = cur["db"].full_name or cur["supabase"].email.split("@")[0]
    tz = ZoneInfo(os.getenv("EMAIL_TIMEZONE", "Asia/Karachi"))
    login_time = datetime.now(tz).strftime("%B %d, %Y at %I:%M %p %Z")
    asyncio.create_task(send_login_email(cur["db"].email, name, login_time))
    return {"ok": True}

# --- PLAN ENDPOINTS ---
@app.get("/api/plan")
async def get_plan(request: Request, db=Depends(get_db)):
    cur = await get_current_user(request, db)
    plan = await get_user_plan(db, cur["db"].id)
    return {"plan": plan}

@app.put("/api/plan")
async def set_plan(payload: PlanUpdate, request: Request, db=Depends(get_db)):
    cur = await get_current_user(request, db)
    plan = await update_user_plan(db, cur["db"].id, payload.plan)
    return {"plan": plan}

# --- PROFILE ENDPOINTS ---
@app.post("/profile", response_model=ProfileResponse, status_code=status.HTTP_201_CREATED)
async def create_or_update_profile(payload: ProfileCreate, request: Request, db=Depends(get_db)):
    cur = await get_current_user(request, db)
    return await upsert_profile(db, cur["db"].id, payload)

@app.get("/profile", response_model=ProfileResponse)
async def read_profile(request: Request, db=Depends(get_db)):
    cur = await get_current_user(request, db)
    profile = await get_profile_by_user_id(db, cur["db"].id)
    if not profile:
        raise HTTPException(status_code=404, detail="Profile not found")
    return profile

# --- ONBOARDING ENDPOINTS ---

@app.get("/api/onboarding/status", response_model=OnboardingStatusResponse)
async def onboarding_status(request: Request, db=Depends(get_db)):
    cur = await get_current_user(request, db)
    return await get_onboarding_status(db, cur["db"].id)

@app.get("/api/onboarding", response_model=OnboardingProfileResponse)
async def read_onboarding_profile(request: Request, db=Depends(get_db)):
    cur = await get_current_user(request, db)
    profile = await get_onboarding_profile(db, cur["db"].id)
    if not profile:
        raise HTTPException(status_code=404, detail="Onboarding profile not found")
    return profile

@app.post("/api/onboarding", response_model=OnboardingProfileResponse, status_code=status.HTTP_201_CREATED)
async def save_onboarding_profile(payload: OnboardingProfileCreate, request: Request, db=Depends(get_db)):
    cur = await get_current_user(request, db)
    return await upsert_onboarding_profile(db, cur["db"].id, payload)


@app.post("/api/onboarding/skip", response_model=OnboardingStatusResponse)
async def skip_onboarding_profile(request: Request, db=Depends(get_db)):
    """Mark onboarding complete without requiring profile answers."""
    cur = await get_current_user(request, db)
    await upsert_onboarding_profile(
        db,
        cur["db"].id,
        OnboardingProfileCreate(is_completed=True),
    )
    return OnboardingStatusResponse(completed=True)

# --- VISION MODULE ENDPOINTS ---
@app.websocket("/ws/vision")
async def vision_websocket(websocket: WebSocket):
    try:
        await websocket.accept()
    except Exception:
        return
    try:
        while True:
            try:
                data = await websocket.receive_text()
            except (WebSocketDisconnect, RuntimeError):
                break
            if "," in data:
                data = data.split(",")[1]
            try:
                img_data = base64.b64decode(data)
                np_arr = np.frombuffer(img_data, np.uint8)
                frame = cv2.imdecode(np_arr, cv2.IMREAD_COLOR)
                if frame is not None:
                    result = vision_module_instance.process_frame(frame)
                    await websocket.send_json(result)
            except Exception as e:
                print(f"Vision processing error: {e}")
    except Exception:
        pass

@app.post("/api/vision/calibrate")
async def calibrate_vision(data: dict):
    img_b64 = data.get("image")
    distance = data.get("distance", 50.0)
    if not img_b64:
        raise HTTPException(status_code=400, detail="No image provided")
    
    if "," in img_b64:
        img_b64 = img_b64.split(",")[1]
        
    try:
        img_data = base64.b64decode(img_b64)
        np_arr = np.frombuffer(img_data, np.uint8)
        frame = cv2.imdecode(np_arr, cv2.IMREAD_COLOR)
        
        if frame is not None:
            success = vision_module_instance.calibrate(frame, distance)
            return {"success": success}
        return {"success": False, "error": "Invalid frame"}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

# --- TEST RESULTS ENDPOINTS ---
@app.post("/api/test-results", response_model=TestResultResponse, status_code=status.HTTP_201_CREATED)
async def save_test_result(payload: TestResultCreate, request: Request, db=Depends(get_db)):
    cur = await get_current_user(request, db)
    result = await create_test_result(db, cur["db"].id, payload)
    name = cur["db"].full_name or cur["supabase"].email.split("@")[0]
    # Extract plain-text AI summary if stored as JSON
    ai_summary = None
    if payload.ai_summary:
        try:
            import json
            parsed = json.loads(payload.ai_summary)
            ai_summary = parsed if isinstance(parsed, str) else None
        except Exception:
            ai_summary = payload.ai_summary[:300] if len(payload.ai_summary) <= 300 else None
    asyncio.create_task(send_test_result_email(
        to_email=cur["db"].email,
        name=name,
        test_type=payload.test_type,
        score=payload.overall_score,
        left_acuity=payload.left_eye_acuity,
        right_acuity=payload.right_eye_acuity,
        ai_summary=ai_summary,
        result_id=result.id,
    ))
    return result

@app.get("/api/test-results")
async def list_test_results(request: Request, db=Depends(get_db)):
    cur = await get_current_user(request, db)
    user_id = cur["db"].id
    print(f"[TEST-RESULTS] Fetching results for user_id={user_id} email={cur['db'].email}")
    results = await get_test_results_by_user(db, user_id)
    print(f"[TEST-RESULTS] Found {len(results)} records")
    return results

@app.get("/api/test-results/{result_id}", response_model=TestResultResponse)
async def get_test_result_by_id(result_id: int, request: Request, db=Depends(get_db)):
    cur = await get_current_user(request, db)
    return await get_test_result_by_id_for_user(db, result_id, cur["db"].id)

# --- AI ANALYSIS ENDPOINT ---
@app.post("/api/analyze-results")
async def analyze_results(data: dict):
    # Run sync Gemini call off the event loop so saves/WS stay responsive
    return await asyncio.to_thread(analyze_test_results, data)


# =============================================================================
# AI CHAT ENDPOINTS
# =============================================================================

@app.get("/api/chat/ping-gemini")
async def ping_gemini():
    """Quick connectivity test for Gemini — call from browser to verify."""
    try:
        resp = await asyncio.to_thread(
            _call_gemini_sync,
            "You are a helpful assistant.",
            "User: Say hello in one short sentence.\nAssistant:"
        )
        return {"ok": True, "response": resp}
    except Exception as e:
        return {"ok": False, "error": str(e)}

async def _get_user_context(db, user_id: int) -> tuple[dict | None, list[dict]]:
    """Load onboarding profile and recent test results for the user."""
    onboarding = (await db.execute(
        select(UserOnboardingProfile).filter_by(user_id=user_id)
    )).scalars().first()
    profile = None
    if onboarding:
        profile = {c.name: getattr(onboarding, c.name)
                   for c in UserOnboardingProfile.__table__.columns
                   if c.name not in ("id", "user_id", "is_completed", "created_at", "updated_at")}

    test_rows = (await db.execute(
        select(TestResult)
        .filter_by(user_id=user_id)
        .order_by(desc(TestResult.created_at))
        .limit(3)
    )).scalars().all()
    tests = [
        {
            "test_type": r.test_type,
            "left_eye_acuity": r.left_eye_acuity,
            "right_eye_acuity": r.right_eye_acuity,
            "overall_score": r.overall_score,
            "created_at": str(r.created_at),
        }
        for r in test_rows
    ]
    return profile, tests


def _call_gemini_sync(system_instruction: str, user_prompt: str) -> str:
    """Synchronous Gemini call — same pattern as gemini_analyzer.py.

    max_output_tokens is set to 2048: at 1024 the model would hit the cap and
    return mid-sentence ("cracked"/cut-off) answers once the reply ran a little
    long. 2048 gives the 2-5 short paragraphs the prompt asks for full room to
    finish cleanly. If the model still stops on MAX_TOKENS we log it so the
    cause of any truncation is visible rather than silent.
    """
    response = _get_gemini_client().models.generate_content(
        model=CHAT_MODEL,
        contents=user_prompt,
        config=google_genai_types.GenerateContentConfig(
            system_instruction=system_instruction,
            temperature=0.4,
            max_output_tokens=2048,
        ),
    )
    try:
        finish = response.candidates[0].finish_reason if response.candidates else None
        if finish and str(finish).upper().endswith("MAX_TOKENS"):
            print("[GEMINI CHAT] WARNING: response truncated on MAX_TOKENS — "
                  "raise max_output_tokens if this recurs.")
    except Exception:
        pass
    return (response.text or "").strip()


# ── Conversation management ───────────────────────────────────────────────────

@app.post("/api/chat/conversations", response_model=ConversationResponse)
async def create_chat_conversation(payload: ConversationCreate, request: Request, db=Depends(get_db)):
    cur = await get_current_user(request, db)
    conv = await create_conversation(db, cur["db"].id, payload.title or "New Chat")
    return ConversationResponse(
        id=conv.id, user_id=conv.user_id, title=conv.title,
        message_count=conv.message_count,
        created_at=conv.created_at, updated_at=conv.updated_at,
    )


@app.get("/api/chat/conversations", response_model=list[ConversationResponse])
async def list_chat_conversations(request: Request, db=Depends(get_db)):
    cur = await get_current_user(request, db)
    convs = await get_conversations(db, cur["db"].id)
    return [
        ConversationResponse(
            id=c.id, user_id=c.user_id, title=c.title,
            message_count=c.message_count,
            created_at=c.created_at, updated_at=c.updated_at,
        )
        for c in convs
    ]


@app.patch("/api/chat/conversations/{conv_id}", response_model=ConversationResponse)
async def rename_chat_conversation(conv_id: int, payload: ConversationRename, request: Request, db=Depends(get_db)):
    cur = await get_current_user(request, db)
    conv = await rename_conversation(db, conv_id, cur["db"].id, payload.title)
    return ConversationResponse(
        id=conv.id, user_id=conv.user_id, title=conv.title,
        message_count=conv.message_count,
        created_at=conv.created_at, updated_at=conv.updated_at,
    )


@app.delete("/api/chat/conversations/{conv_id}", status_code=204)
async def delete_chat_conversation(conv_id: int, request: Request, db=Depends(get_db)):
    cur = await get_current_user(request, db)
    await delete_conversation(db, conv_id, cur["db"].id)


# ── Messages ──────────────────────────────────────────────────────────────────

@app.get("/api/chat/conversations/{conv_id}/messages", response_model=list[MessageResponse])
async def list_chat_messages(conv_id: int, request: Request, db=Depends(get_db)):
    cur = await get_current_user(request, db)
    msgs = await get_messages(db, conv_id, cur["db"].id)
    return [
        MessageResponse(
            id=m.id, conversation_id=m.conversation_id, user_id=m.user_id,
            role=m.role, content=m.content, extra_data=m.extra_data,
            created_at=m.created_at,
        )
        for m in msgs
    ]


@app.post("/api/chat/conversations/{conv_id}/messages", response_model=ChatResponse)
async def send_chat_message(conv_id: int, payload: dict, request: Request, db=Depends(get_db)):
    cur = await get_current_user(request, db)
    user_id = cur["db"].id

    # Verify conversation ownership
    await get_conversation(db, conv_id, user_id)

    # Check message limit
    current_count = await get_message_count(db, conv_id)
    if current_count >= MAX_MESSAGES_PER_CONVERSATION:
        raise HTTPException(
            status_code=429,
            detail=f"This conversation has reached the {MAX_MESSAGES_PER_CONVERSATION}-message limit. Please start a new chat."
        )

    raw_content = payload.get("content", "")
    user_text, is_suspicious = sanitize_input(raw_content)
    if not user_text:
        raise HTTPException(status_code=400, detail="Message content is required")

    # Persist user message
    user_msg = await add_message(db, conv_id, user_id, "user", user_text)

    # Auto-title the conversation from the first message
    if current_count == 0:
        await auto_title_conversation(db, conv_id, user_text)

    # Increment message count (tracks user messages only)
    await increment_message_count(db, conv_id)

    # Load user context (profile + recent tests)
    profile, recent_tests = await _get_user_context(db, user_id)

    # Get prior chat history (exclude just-added user message)
    all_msgs = await get_messages(db, conv_id, user_id)
    history = [
        {"role": m.role, "content": m.content}
        for m in all_msgs
        if m.id != user_msg.id
    ]

    # RAG: embed query and retrieve relevant knowledge chunks
    try:
        print(f"\n[RAG DEBUG] Starting retrieval for query: '{user_text}'")
        query_embedding = await embed_text(user_text)
        print(f"[RAG DEBUG] Query embedding generated: {len(query_embedding)} dimensions")
        print(f"[RAG DEBUG] Embedding sample (first 5 values): {query_embedding[:5]}")
        
        # match_count=3: the rag_engine over-fetches, applies a similarity
        # threshold and de-duplicates, so these 3 are filtered/clean — far less
        # noisy than the previous unfiltered top-4.
        chunks = await similarity_search(query_embedding, match_count=3)
        print(f"[RAG DEBUG] Retrieved {len(chunks)} chunks (post-filter)")
        if chunks:
            for i, chunk in enumerate(chunks, 1):
                print(f"  - Chunk {i}: category='{chunk.get('category')}', content length={len(chunk.get('content', ''))}")
        else:
            print(f"[RAG DEBUG] ⚠️  No chunks retrieved from similarity search!")
        
        rag_context = build_context_string(chunks)
        print(f"[RAG DEBUG] Final RAG context length: {len(rag_context)} chars")
    except Exception as e:
        import traceback
        print(f"[RAG DEBUG] ❌ Retrieval error (non-fatal): {e}")
        print(f"[RAG DEBUG] Traceback:\n{traceback.format_exc()}")
        rag_context = ""

    # Build prompt and call Gemini
    system_instruction, user_prompt = build_prompt(
        user_message=user_text,
        profile=profile,
        recent_tests=recent_tests,
        rag_context=rag_context,
        chat_history=history,
        is_suspicious=is_suspicious,
    )

    # # 🔍 DEBUG: Print the final prompt being sent to AI
    # print("\n" + "="*80)
    # print("[FINAL PROMPT DEBUG]")
    # print("="*80)
    # print("\n📝 RAG CONTEXT (Retrieved Knowledge Chunks):")
    # print("-" * 80)
    # if rag_context:
    #     print(rag_context)
    # else:
    #     print("(No knowledge chunks retrieved)")
    # print("\n" + "-" * 80)
    # print("\n🔧 SYSTEM INSTRUCTION:")
    # print("-" * 80)
    # print(system_instruction)
    # print("\n" + "-" * 80)
    # print("\n💬 USER PROMPT (with history):")
    # print("-" * 80)
    # print(user_prompt)
    # print("\n" + "="*80)
    # print("[END OF FINAL PROMPT DEBUG]")
    # print("="*80 + "\n")

    try:
        raw_response = await asyncio.to_thread(_call_gemini_sync, system_instruction, user_prompt)
    except Exception as e:
        print(f"[GEMINI CHAT] Error ({type(e).__name__}): {e}")
        raw_response = f"I encountered an error: {str(e)[:120]}"

    # Parse for profile update tag emitted by the main response
    clean_response, profile_update = parse_profile_update(raw_response)

    # ── Verification pass ─────────────────────────────────────────────────────
    # If the main response didn't include a PROFILE_UPDATE tag, run a cheap
    # second Gemini call whose only job is to check whether the user's message
    # contains a profile mismatch.  This catches cases where the AI was focused
    # on answering the question and silently skipped tag emission.
    if profile_update is None and profile:
        try:
            ver_system, ver_user = build_verification_prompt(user_text, profile)
            ver_raw = await asyncio.to_thread(
                _call_gemini_sync, ver_system, ver_user
            )
            ver_raw = ver_raw.strip()
            if ver_raw and ver_raw.upper() != "NO_UPDATE":
                # Parse whatever the verifier returned — may be just the tag line
                _, profile_update = parse_profile_update(ver_raw)
        except Exception as e:
            print(f"[GEMINI VERIFY] skipped: {e}")

    # Persist assistant message
    assistant_msg = await add_message(db, conv_id, user_id, "assistant", clean_response,
                                       metadata={"profile_update": profile_update} if profile_update else None)  # chat_crud receives this as 'metadata' kwarg → extra_data column

    return ChatResponse(
        message=clean_response,
        conversation_id=conv_id,
        message_id=assistant_msg.id,
        profile_update=profile_update,
    )


# ── Profile field update from chat ────────────────────────────────────────────

@app.patch("/api/chat/update-profile-field")
async def update_profile_field_from_chat(payload: ProfileFieldUpdate, request: Request, db=Depends(get_db)):
    cur = await get_current_user(request, db)
    user_id = cur["db"].id

    if not is_field_name_safe(payload.field):
        raise HTTPException(status_code=400, detail="Invalid field name")

    # Load and update onboarding profile
    result = await db.execute(
        select(UserOnboardingProfile).filter_by(user_id=user_id)
    )
    profile = result.scalars().first()
    if not profile:
        raise HTTPException(status_code=404, detail="Profile not found. Complete onboarding first.")

    # Type-coerce value safely
    field = payload.field
    value = payload.value
    bool_fields = {
        "wears_glasses", "wears_contacts", "blurry_vision", "night_vision_difficulty",
        "headaches_after_screen", "dry_or_irritated_eyes", "eye_fatigue",
        "has_diabetes", "has_high_blood_pressure", "family_vision_history",
    }
    int_fields = {"age"}

    try:
        if field in bool_fields:
            typed_value = value.lower() in ("true", "yes", "1")
        elif field in int_fields:
            typed_value = int(value)
        else:
            typed_value = str(value)[:255]
    except (ValueError, AttributeError):
        raise HTTPException(status_code=400, detail=f"Invalid value for field '{field}'")

    setattr(profile, field, typed_value)
    try:
        await db.commit()
        await db.refresh(profile)
    except Exception as e:
        await db.rollback()
        raise HTTPException(status_code=500, detail=f"Profile update error: {e}")

    return {"success": True, "field": field, "value": typed_value}