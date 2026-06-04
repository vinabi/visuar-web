import os
import json
from google import genai
from google.genai import types

def _get_client():
    api_key = os.getenv("GEMINI_API_KEY")
    if not api_key:
        return None
    return genai.Client(api_key=api_key)

SCREENING_SYSTEM = """\
You are VISUAR, a vision screening assistant. You ONLY explain values provided in the input JSON.
Never invent diopters, acuity, cylinder, axis, or confidence. Never call results an exact prescription,
confirmed diagnosis, or guaranteed glasses number.

Use these terms only:
- estimated eyesight number
- approximate diopter
- screening result
- confidence level (Low, Medium, Higher screening confidence)

Return ONLY valid JSON (no markdown) with this structure:
{
  "summary_en": "2-3 sentences in simple English",
  "summary_ur": "2-3 sentences in simple Urdu (Urdu script)",
  "findings": [
    {"type": "success|warning|info", "title": "short title", "description_en": "one sentence", "description_ur": "one sentence Urdu"}
  ],
  "recommendations_en": ["actionable sentence"],
  "recommendations_ur": ["actionable sentence in Urdu"],
  "units_explained_en": "brief plain English on Snellen, Jaeger, D, CYL, axis if relevant",
  "units_explained_ur": "same in Urdu",
  "safety_note_en": "VISUAR is a screening tool, not a medical prescription...",
  "safety_note_ur": "Urdu safety note",
  "single_test_warning": true or false,
  "confidence_explained_en": "what the confidence level means",
  "confidence_explained_ur": "Urdu version"
}
"""

LEGACY_SYSTEM = """\
You are a clinical vision screening assistant. Analyze vision test results and provide structured clinical insights.
Return ONLY a valid JSON object with this exact structure — no markdown, no explanation.

Rules for your response:
- Findings: 3-5 entries, each with "type" (must be exactly "success", "warning", or "info"), "title" (4-6 words), "description" (one clear clinical sentence)
- Recommendations: 2-4 actionable sentences
- Summary: one-sentence overall clinical impression
- Be professional, concise, and grounded in clinical vision science
- Avoid alarm; focus on practical next steps
- Never say exact prescription or confirmed diagnosis
"""

SCREENING_PROMPT = """\
Explain this screening result data. Use ONLY the numbers and labels in the JSON.

Input:
{test_data}

Context rules:
- If correctionMode is "corrected", say the test was done with glasses or contacts.
- If "uncorrected", say without glasses or contacts.
- If visionFocus is "far", frame as distance blur tendency; minus sphere often relates to far blur in screening (not a diagnosis).
- If visionFocus is "near", frame as near focus difficulty; plus sphere often relates to near blur in screening (not a diagnosis).
- If visionFocus is "both", cover distance and near screening without claiming an exact prescription.
- If visionFocus is "unsure", note tests were chosen after a short screener.
- Use testsCompleted to mention which modules ran; do not invent tests not listed.
- If single_test_warning is true, say the estimate is based on only one test.
- If multiple tests in testsUsed, say confidence may be higher but still screening only.
- If confidence is Low and tests disagree, suggest retesting or visiting an eye care professional.
- Never say confirmed myopia, confirmed hyperopia, or exact prescription.
"""

LEGACY_PROMPT = """\
Test data:
{test_data}

Return exactly this JSON structure:
{{
  "findings": [
    {{"type": "success|warning|info", "title": "4-6 word title", "description": "One clear clinical sentence."}}
  ],
  "recommendations": [
    "One actionable recommendation sentence."
  ],
  "summary": "One-sentence overall clinical impression."
}}
"""


def _parse_json_response(text: str) -> dict:
    text = text.strip()
    if text.startswith("```"):
        parts = text.split("```")
        text = parts[1] if len(parts) > 1 else text
        if text.startswith("json"):
            text = text[4:]
    text = text.strip()
    try:
        return json.loads(text)
    except json.JSONDecodeError:
        # Gemini sometimes wraps JSON in extra text — find the first { } block
        import re
        match = re.search(r'\{[\s\S]*\}', text)
        if match:
            return json.loads(match.group())
        raise


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
    return {
        "findings": findings,
        "recommendations": screening.get("recommendations_en") or [],
        "recommendations_ur": screening.get("recommendations_ur") or [],
        "summary": screening.get("summary_en") or "",
        "summary_ur": screening.get("summary_ur") or "",
        "safety_note_en": screening.get("safety_note_en", ""),
        "safety_note_ur": screening.get("safety_note_ur", ""),
        "screening": screening,
    }


def analyze_test_results(test_data: dict) -> dict:
    """
    Call Gemini to explain vision test results. Uses screening prompt when
    finalEstimate or screening_explanation flag is present.
    """
    client = _get_client()
    if not client:
        return {
            "findings": [],
            "recommendations": [],
            "summary": "",
            "error": "GEMINI_API_KEY not configured",
        }

    is_screening = bool(
        test_data.get("screening_explanation")
        or test_data.get("finalEstimate")
        or test_data.get("leftEye", {}).get("sphereD") is not None
    )

    try:
        if is_screening:
            prompt = SCREENING_PROMPT.format(test_data=json.dumps(test_data, indent=2))
            system = SCREENING_SYSTEM
        else:
            prompt = LEGACY_PROMPT.format(test_data=json.dumps(test_data, indent=2))
            system = LEGACY_SYSTEM

        response = client.models.generate_content(
            model="gemini-3-flash-preview",
            config=types.GenerateContentConfig(
                system_instruction=system,
                temperature=0.4,
            ),
            contents=prompt,
        )

        parsed = _parse_json_response(response.text)
        if is_screening:
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
