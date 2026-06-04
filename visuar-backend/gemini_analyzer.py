import os
import json
from google import genai
from google.genai import types

GEMINI_API_KEY = os.getenv("GEMINI_API_KEY")
if not GEMINI_API_KEY:
    print("[GEMINI] Warning: GEMINI_API_KEY not set — analysis will fail until configured.")
client = genai.Client(api_key=GEMINI_API_KEY) if GEMINI_API_KEY else None

SCREENING_TEST_TYPES = {
    "screening",
    "snellen_acuity",
    "jaeger_acuity",
    "near_far_switching",
    "contrast_sensitivity",
    "orientation_discrimination",
    "color_vision",
    "landolt_acuity",
    "rapid_recognition",
    "complete_assessment",
    "refraction_battery",
    "duochrome_refinement",
    "refraction_simulator",
    "astigmatism_fan",
}

ENRICHED_SYSTEM = """\
You are VISUAR, a vision screening assistant. You ONLY explain values provided in the input JSON.
Never invent diopters, acuity, cylinder, axis, or confidence. Never call results an exact prescription,
confirmed diagnosis, or guaranteed glasses number. Never claim foods cure eye disease.

Use these terms only:
- estimated eyesight number
- approximate diopter
- screening result
- confidence level (Low, Medium, Higher screening confidence)

If userProfile.diet_habits is present, tailor nutrition_notes gently to that habit — still general wellness only.

Return ONLY valid JSON (no markdown) with this structure:
{
  "summary_en": "2-4 sentences in simple English explaining what the scores mean for this specific test",
  "summary_ur": "2-4 sentences in simple Urdu (Urdu script)",
  "findings": [
    {"type": "success|warning|info", "title": "short title", "description_en": "one sentence", "description_ur": "one sentence Urdu"}
  ],
  "recommendations_en": ["2-4 actionable habits: screen breaks, lighting, exam follow-up — not medical treatment"],
  "recommendations_ur": ["same count in Urdu"],
  "lifestyle_do_en": ["2-4 helpful daily habits relevant to the test result"],
  "lifestyle_do_ur": ["Urdu versions"],
  "lifestyle_avoid_en": ["2-3 things to limit that may strain vision or worsen comfort — no fearmongering"],
  "lifestyle_avoid_ur": ["Urdu versions"],
  "nutrition_notes_en": "2-3 sentences on general eye-friendly nutrition (leafy greens, omega-3, hydration) — wellness only, not a diet prescription",
  "nutrition_notes_ur": "Urdu version",
  "units_explained_en": "brief plain English on Snellen, Jaeger, D, CYL, axis, contrast % if relevant to input",
  "units_explained_ur": "same in Urdu",
  "safety_note_en": "VISUAR is a screening tool, not a medical prescription. See an eye care professional for diagnosis.",
  "safety_note_ur": "Urdu safety note",
  "single_test_warning": true or false,
  "confidence_explained_en": "what confidence means if relevant, else short screening disclaimer",
  "confidence_explained_ur": "Urdu version"
}
"""

ENRICHED_PROMPT = """\
Explain this vision test result for test_type="{test_type}". Use ONLY the numbers and labels in the JSON.

Input:
{test_data}

Per-test guidance:
- snellen_acuity / screening: explain distance acuity and sphere/cyl/axis if present; minus sphere often relates to distance blur in screening only.
- jaeger_acuity: explain near J-numbers / reading add screening values.
- near_far_switching: explain accommodation / focus switching score.
- contrast_sensitivity: explain contrast ability and faintest contrast read; mention fatigue if high.
- orientation_discrimination: explain orientation threshold and precision.
- color_vision: explain Ishihara-style screening outcome; never claim color blindness is cured by diet.
- landolt_acuity: explain gap resolution / decimal acuity per eye.
- rapid_recognition: explain speed and accuracy of symbol ID.
- refraction_battery / duochrome_refinement / refraction_simulator / astigmatism_fan: explain sphere, cylinder, axis as screening estimates only.
- complete_assessment: summarize distance + near acuity together.

Context rules:
- correctionMode "corrected" = with glasses/contacts; "uncorrected" = without.
- visionFocus "far" / "near" / "both" / "unsure" as provided.
- If single_test_warning is true, stress limited confidence from one module.
- If results_disagree, suggest retest or professional exam.
- lifestyle_do / lifestyle_avoid must be practical and safe for general audiences.
- Never say confirmed myopia, hyperopia, or exact glasses prescription.
"""


def _parse_json_response(text: str) -> dict:
    text = text.strip()
    if text.startswith("```"):
        parts = text.split("```")
        text = parts[1] if len(parts) > 1 else text
        if text.startswith("json"):
            text = text[4:]
    return json.loads(text.strip())


def _normalize_screening_to_legacy(screening: dict) -> dict:
    """Map bilingual screening output to legacy fields for DB compatibility."""
    findings = []
    for f in screening.get("findings") or []:
        findings.append({
            "type": f.get("type", "info"),
            "title": f.get("title", ""),
            "description": f.get("description_en") or f.get("description", ""),
            "description_ur": f.get("description_ur", ""),
        })
    if screening.get("units_explained_en"):
        findings.append({
            "type": "info",
            "title": "What the units mean",
            "description": screening["units_explained_en"],
            "description_ur": screening.get("units_explained_ur", ""),
        })
    if screening.get("confidence_explained_en"):
        findings.append({
            "type": "info",
            "title": "Confidence level",
            "description": screening["confidence_explained_en"],
            "description_ur": screening.get("confidence_explained_ur", ""),
        })

    recs = list(screening.get("recommendations_en") or [])
    for item in screening.get("lifestyle_do_en") or []:
        if item and item not in recs:
            recs.append(item)

    return {
        "findings": findings,
        "recommendations": recs,
        "recommendations_ur": screening.get("recommendations_ur") or [],
        "summary": screening.get("summary_en") or "",
        "summary_ur": screening.get("summary_ur") or "",
        "safety_note_en": screening.get("safety_note_en", ""),
        "safety_note_ur": screening.get("safety_note_ur", ""),
        "lifestyle_do_en": screening.get("lifestyle_do_en") or [],
        "lifestyle_do_ur": screening.get("lifestyle_do_ur") or [],
        "lifestyle_avoid_en": screening.get("lifestyle_avoid_en") or [],
        "lifestyle_avoid_ur": screening.get("lifestyle_avoid_ur") or [],
        "nutrition_notes_en": screening.get("nutrition_notes_en") or "",
        "nutrition_notes_ur": screening.get("nutrition_notes_ur") or "",
        "screening": screening,
    }


def _uses_enriched_prompt(test_data: dict) -> bool:
    test_type = (test_data.get("test_type") or "").replace("-", "_")
    if test_type in SCREENING_TEST_TYPES:
        return True
    if test_data.get("screening_explanation"):
        return True
    if test_data.get("finalEstimate"):
        return True
    left = test_data.get("leftEye") or {}
    if isinstance(left, dict) and left.get("sphereD") is not None:
        return True
    return test_type != "" and test_type != "unknown"


def analyze_test_results(test_data: dict) -> dict:
    """
    Call Gemini to explain vision test results with per-test context and lifestyle guidance.
    """
    if not client:
        return {
            "findings": [],
            "recommendations": [],
            "summary": "",
            "error": "GEMINI_API_KEY not configured",
        }

    test_type = (test_data.get("test_type") or "screening").replace("-", "_")

    try:
        if _uses_enriched_prompt(test_data):
            prompt = ENRICHED_PROMPT.format(
                test_type=test_type,
                test_data=json.dumps(test_data, indent=2),
            )
            system = ENRICHED_SYSTEM
            response = client.models.generate_content(
                model="gemini-3-flash-preview",
                config=types.GenerateContentConfig(
                    system_instruction=system,
                    temperature=0.4,
                ),
                contents=prompt,
            )
            parsed = _parse_json_response(response.text)
            return _normalize_screening_to_legacy(parsed)

        # Fallback minimal legacy shape
        prompt = f"Test data:\n{json.dumps(test_data, indent=2)}\nReturn JSON with findings, recommendations, summary."
        response = client.models.generate_content(
            model="gemini-3-flash-preview",
            config=types.GenerateContentConfig(
                system_instruction=ENRICHED_SYSTEM,
                temperature=0.4,
            ),
            contents=prompt,
        )
        parsed = _parse_json_response(response.text)
        if "summary_en" in parsed:
            return _normalize_screening_to_legacy(parsed)
        return parsed

    except Exception as e:
        print(f"[GEMINI] Analysis error: {e}")
        return {
            "findings": [],
            "recommendations": [],
            "summary": "",
            "error": str(e),
        }
