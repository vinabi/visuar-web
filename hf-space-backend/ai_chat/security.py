"""
Input sanitization and prompt injection protection.
"""
import re

MAX_INPUT_LENGTH = 1500

# Patterns that indicate prompt injection or jailbreak attempts
_INJECTION_PATTERNS = [
    r"ignore\s+(all\s+)?(previous|prior|above)\s+instructions?",
    r"(you are|act as|pretend|roleplay|simulate)\s+(now\s+)?(a|an|the)?\s*(different|new|evil|unrestricted|jailbroken)",
    r"disregard\s+(your|the|all)\s+(rules?|instructions?|guidelines?|constraints?)",
    r"(reveal|show|print|output|repeat|display)\s+(your\s+)?(system\s+prompt|instructions?|prompt|hidden)",
    r"(bypass|override|disable|turn\s+off)\s+(your\s+)?(safety|filter|restriction|constraint)",
    r"(do\s+anything|DAN|jailbreak|unrestricted\s+mode)",
    r"<\s*(script|iframe|img|object|embed)\s*[^>]*>",
    r"(select|insert|update|delete|drop|truncate|alter|create)\s+.*(from|into|table|database)",
    r"(union\s+select|xp_cmdshell|exec\s*\(|execute\s*\()",
]

_COMPILED = [re.compile(p, re.IGNORECASE) for p in _INJECTION_PATTERNS]


def sanitize_input(text: str) -> tuple[str, bool]:
    """
    Returns (sanitized_text, is_suspicious).
    Suspicious inputs are still processed but with a warning flag —
    the prompt builder will harden the context accordingly.
    """
    if not text or not isinstance(text, str):
        return "", False

    # Truncate to max length
    text = text[:MAX_INPUT_LENGTH].strip()

    # Remove null bytes and control chars (except newlines/tabs)
    text = re.sub(r"[\x00-\x08\x0b\x0c\x0e-\x1f\x7f]", "", text)

    # Check for injection patterns
    is_suspicious = any(p.search(text) for p in _COMPILED)

    return text, is_suspicious


def is_field_name_safe(field: str) -> bool:
    """Validate that a profile field name is a known, safe column name."""
    allowed = {
        "age", "gender", "occupation", "average_screen_time", "sleep_hours",
        "outdoor_activity_hours", "water_intake", "screen_usage_type",
        "wears_glasses", "wears_contacts", "blurry_vision", "night_vision_difficulty",
        "headaches_after_screen", "dry_or_irritated_eyes", "eye_fatigue",
        "has_diabetes", "has_high_blood_pressure", "family_vision_history",
        "additional_notes",
    }
    return field in allowed
