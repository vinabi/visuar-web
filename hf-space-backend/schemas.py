# schemas.py
from pydantic import BaseModel, EmailStr
from typing import Optional
from datetime import datetime

class UserCreate(BaseModel):
    email: EmailStr
    name: str

class UserResponse(BaseModel):
    id: int
    email: EmailStr
    full_name: str
    plan: str = "free"
    class Config:
        from_attributes = True

class PlanUpdate(BaseModel):
    plan: str

class ProfileBase(BaseModel):
    occupation: str
    average_screen_time: int
    glasses_user: str
    lens_power: Optional[str] = None
    lighting_environment: str
    work_environment: str
    diet_habits: str
    eye_pain_or_headache: str
    sleep_hours: int
    medical_history: Optional[str] = None
    smoker: Optional[str] = None
    alcohol_consumption: Optional[str] = None
    exercise_frequency: Optional[str] = None
    water_intake: Optional[str] = None

class ProfileCreate(ProfileBase):
    pass

class ProfileResponse(ProfileBase):
    id: int
    user_id: int
    class Config:
        from_attributes = True

# ─── Onboarding ──────────────────────────────────────────

class OnboardingProfileCreate(BaseModel):
    age: Optional[int] = None
    gender: Optional[str] = None
    occupation: Optional[str] = None
    average_screen_time: Optional[str] = None
    sleep_hours: Optional[str] = None
    outdoor_activity_hours: Optional[str] = None
    water_intake: Optional[str] = None
    screen_usage_type: Optional[str] = None
    wears_glasses: Optional[bool] = None
    wears_contacts: Optional[bool] = None
    blurry_vision: Optional[bool] = None
    night_vision_difficulty: Optional[bool] = None
    vision_focus: Optional[str] = None
    headaches_after_screen: Optional[bool] = None
    dry_or_irritated_eyes: Optional[bool] = None
    eye_fatigue: Optional[bool] = None
    has_diabetes: Optional[bool] = None
    has_high_blood_pressure: Optional[bool] = None
    family_vision_history: Optional[bool] = None
    preferred_language: Optional[str] = None
    additional_notes: Optional[str] = None
    is_completed: bool = False

class OnboardingProfileResponse(OnboardingProfileCreate):
    id: int
    user_id: int
    created_at: datetime
    updated_at: Optional[datetime] = None
    class Config:
        from_attributes = True

class OnboardingStatusResponse(BaseModel):
    completed: bool

# ─── Test Results ────────────────────────────────────────

# ─── AI Chat ─────────────────────────────────────────────

class ConversationCreate(BaseModel):
    title: Optional[str] = "New Chat"

class ConversationRename(BaseModel):
    title: str

class ConversationResponse(BaseModel):
    id: int
    user_id: int
    title: str
    message_count: int
    created_at: datetime
    updated_at: Optional[datetime] = None
    class Config:
        from_attributes = True

class MessageCreate(BaseModel):
    content: str

class MessageResponse(BaseModel):
    id: int
    conversation_id: int
    user_id: int
    role: str
    content: str
    extra_data: Optional[str] = None
    created_at: datetime
    class Config:
        from_attributes = True

class ChatResponse(BaseModel):
    message: str
    conversation_id: int
    message_id: int
    profile_update: Optional[dict] = None

class ProfileFieldUpdate(BaseModel):
    field: str
    value: str

# ─── Test Results ────────────────────────────────────────

class TestResultCreate(BaseModel):
    test_type: str = "snellen-acuity"
    left_eye_acuity: Optional[str] = None
    right_eye_acuity: Optional[str] = None
    left_eye_diopter: Optional[float] = None
    right_eye_diopter: Optional[float] = None
    result_json: Optional[str] = None
    overall_score: int = 0
    ai_findings: Optional[str] = None
    ai_recommendations: Optional[str] = None
    ai_summary: Optional[str] = None

class TestResultResponse(BaseModel):
    id: int
    user_id: int
    test_type: str
    left_eye_acuity: Optional[str] = None
    right_eye_acuity: Optional[str] = None
    left_eye_diopter: Optional[float] = None
    right_eye_diopter: Optional[float] = None
    result_json: Optional[str] = None
    overall_score: int
    ai_findings: Optional[str] = None
    ai_recommendations: Optional[str] = None
    ai_summary: Optional[str] = None
    created_at: datetime
    class Config:
        from_attributes = True