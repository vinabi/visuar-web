"""
VISUAR Email Service
Sends HTML emails via Gmail SMTP (aiosmtplib) with retries and TLS modes for cloud hosts.
"""
from __future__ import annotations

import os
import asyncio
from email.mime.multipart import MIMEMultipart
from email.mime.text import MIMEText
from pathlib import Path
from dotenv import load_dotenv
import aiosmtplib

load_dotenv(dotenv_path=Path(__file__).parent / ".env")

SMTP_TIMEOUT = 30
MAX_SEND_ATTEMPTS = 2


def _email_config() -> dict:
    """Read env at send time so HF/Vercel secrets are always picked up."""
    port = int(os.getenv("EMAIL_SMTP_PORT", "587"))
    return {
        "user": os.getenv("EMAIL_USER", "").strip(),
        "password": os.getenv("EMAIL_APP_PASSWORD", "").strip(),
        "host": os.getenv("EMAIL_SMTP_HOST", "smtp.gmail.com").strip(),
        "port": port,
        "app_url": os.getenv("EMAIL_APP_URL", "http://localhost:5173").strip().rstrip("/"),
        "from_name": os.getenv("EMAIL_FROM_NAME", "VISUAR").strip(),
        # Port 465 = implicit TLS; 587 = STARTTLS (Gmail supports both)
        "use_tls": port == 465,
        "start_tls": port == 587,
    }


def is_email_configured() -> bool:
    cfg = _email_config()
    return bool(cfg["user"] and cfg["password"])


def log_email_config_status() -> None:
    cfg = _email_config()
    if is_email_configured():
        print(
            f"[EMAIL] Ready — smtp={cfg['host']}:{cfg['port']} "
            f"from={cfg['user']} app_url={cfg['app_url']}"
        )
    else:
        print("[EMAIL] Not configured — set EMAIL_USER and EMAIL_APP_PASSWORD.")

# ── Shared styles ─────────────────────────────────────────────────────────────

_BASE = """
<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="UTF-8"/>
<meta name="viewport" content="width=device-width,initial-scale=1"/>
<title>{subject}</title>
</head>
<body style="margin:0;padding:0;background:#0f172a;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,sans-serif;">
<table width="100%" cellpadding="0" cellspacing="0" style="background:#0f172a;padding:40px 16px;">
  <tr><td align="center">
    <table width="600" cellpadding="0" cellspacing="0" style="max-width:600px;width:100%;">

      <!-- LOGO HEADER -->
      <tr>
        <td style="background:linear-gradient(135deg,#0891b2 0%,#0e7490 50%,#155e75 100%);border-radius:16px 16px 0 0;padding:32px 40px;text-align:center;">
          <div style="display:inline-flex;align-items:center;gap:12px;">
            <div style="width:48px;height:48px;background:rgba(255,255,255,0.15);border-radius:12px;display:inline-block;line-height:48px;text-align:center;font-size:24px;">👁️</div>
            <span style="font-size:28px;font-weight:800;color:#ffffff;letter-spacing:-0.5px;">VISUAR</span>
          </div>
          <p style="margin:8px 0 0;color:rgba(255,255,255,0.75);font-size:13px;letter-spacing:0.5px;">Vision University Accessibility Research</p>
        </td>
      </tr>

      <!-- CONTENT -->
      <tr>
        <td style="background:#1e293b;padding:40px;border-left:1px solid #334155;border-right:1px solid #334155;">
          {content}
        </td>
      </tr>

      <!-- FOOTER -->
      <tr>
        <td style="background:#0f172a;border:1px solid #1e293b;border-top:none;border-radius:0 0 16px 16px;padding:24px 40px;text-align:center;">
          <p style="margin:0 0 8px;color:#475569;font-size:12px;">
            This email was sent by <strong style="color:#0891b2;">VISUAR</strong> · Vision screening platform
          </p>
          <p style="margin:0;color:#334155;font-size:11px;">
            © 2026 VISUAR · All rights reserved · This is an automated message
          </p>
        </td>
      </tr>

    </table>
  </td></tr>
</table>
</body>
</html>
"""

# ── Template helpers ──────────────────────────────────────────────────────────

def _btn(text, url, color="#0891b2"):
    return f"""
    <table cellpadding="0" cellspacing="0" style="margin:24px auto 0;">
      <tr>
        <td style="background:{color};border-radius:12px;padding:14px 32px;text-align:center;">
          <a href="{url}" style="color:#ffffff;font-size:15px;font-weight:700;text-decoration:none;letter-spacing:0.3px;">{text}</a>
        </td>
      </tr>
    </table>"""

def _divider():
    return '<hr style="border:none;border-top:1px solid #334155;margin:28px 0;"/>'

def _badge(text, color="#0891b2", bg="rgba(8,145,178,0.15)"):
    return f'<span style="background:{bg};color:{color};padding:4px 12px;border-radius:20px;font-size:12px;font-weight:700;letter-spacing:0.5px;">{text}</span>'

def _stat_box(label, value, color="#0891b2"):
    return f"""
    <td style="width:33%;text-align:center;padding:16px 8px;">
      <div style="background:#0f172a;border:1px solid #334155;border-radius:12px;padding:16px 12px;">
        <div style="font-size:24px;font-weight:800;color:{color};margin-bottom:4px;">{value}</div>
        <div style="font-size:11px;color:#64748b;text-transform:uppercase;letter-spacing:0.5px;">{label}</div>
      </div>
    </td>"""

# ── Email 1: Welcome (Sign Up) ────────────────────────────────────────────────

def _welcome_html(name: str, email: str, app_url: str) -> str:
    content = f"""
    <!-- Hero -->
    <div style="text-align:center;margin-bottom:32px;">
      <div style="font-size:48px;margin-bottom:16px;">🎉</div>
      <h1 style="margin:0 0 8px;font-size:28px;font-weight:800;color:#f1f5f9;letter-spacing:-0.5px;">Welcome aboard, {name}!</h1>
      <p style="margin:0;color:#94a3b8;font-size:15px;line-height:1.6;">Your VISUAR account is ready. Start screening your vision from anywhere.</p>
    </div>

    {_divider()}

    <!-- Features -->
    <p style="margin:0 0 16px;color:#cbd5e1;font-size:14px;font-weight:600;text-transform:uppercase;letter-spacing:1px;">What you can do with VISUAR</p>
    <table cellpadding="0" cellspacing="0" width="100%">
      <tr>
        <td style="padding:0 8px 12px 0;width:33%;vertical-align:top;">
          <div style="background:#0f172a;border:1px solid #334155;border-top:3px solid #0891b2;border-radius:12px;padding:20px 16px;">
            <div style="font-size:24px;margin-bottom:10px;">👁️</div>
            <p style="margin:0 0 6px;color:#f1f5f9;font-size:14px;font-weight:700;">Vision Tests</p>
            <p style="margin:0;color:#64748b;font-size:12px;line-height:1.5;">Distance & Near Eyesight Number, Contrast, Refraction & more</p>
          </div>
        </td>
        <td style="padding:0 8px 12px;width:33%;vertical-align:top;">
          <div style="background:#0f172a;border:1px solid #334155;border-top:3px solid #8b5cf6;border-radius:12px;padding:20px 16px;">
            <div style="font-size:24px;margin-bottom:10px;">🤖</div>
            <p style="margin:0 0 6px;color:#f1f5f9;font-size:14px;font-weight:700;">AI Consultant</p>
            <p style="margin:0;color:#64748b;font-size:12px;line-height:1.5;">Personalized AI-powered eye health advice</p>
          </div>
        </td>
        <td style="padding:0 0 12px 8px;width:33%;vertical-align:top;">
          <div style="background:#0f172a;border:1px solid #334155;border-top:3px solid #10b981;border-radius:12px;padding:20px 16px;">
            <div style="font-size:24px;margin-bottom:10px;">📊</div>
            <p style="margin:0 0 6px;color:#f1f5f9;font-size:14px;font-weight:700;">Health Reports</p>
            <p style="margin:0;color:#64748b;font-size:12px;line-height:1.5;">Download PDF reports with AI findings</p>
          </div>
        </td>
      </tr>
    </table>

    {_divider()}

    <!-- Account info -->
    <div style="background:#0f172a;border:1px solid #334155;border-radius:12px;padding:20px 24px;margin-bottom:8px;">
      <p style="margin:0 0 12px;color:#64748b;font-size:12px;text-transform:uppercase;letter-spacing:1px;">Your account</p>
      <table cellpadding="0" cellspacing="0" width="100%">
        <tr>
          <td style="color:#94a3b8;font-size:13px;padding:4px 0;">Email</td>
          <td style="color:#f1f5f9;font-size:13px;font-weight:600;text-align:right;">{email}</td>
        </tr>
        <tr>
          <td style="color:#94a3b8;font-size:13px;padding:4px 0;">Plan</td>
          <td style="text-align:right;">{_badge("Free Plan")}</td>
        </tr>
      </table>
    </div>

    {_btn("Start Your First Vision Test", f"{app_url}/test-selection")}
    """
    return _BASE.format(subject="Welcome to VISUAR 👁️", content=content)


# ── Email 2: Login Notification ───────────────────────────────────────────────

def _login_html(name: str, email: str, login_time: str, app_url: str) -> str:
    content = f"""
    <!-- Hero -->
    <div style="text-align:center;margin-bottom:32px;">
      <div style="width:64px;height:64px;background:rgba(8,145,178,0.15);border:2px solid #0891b2;border-radius:50%;margin:0 auto 16px;line-height:60px;font-size:28px;">🔐</div>
      <h1 style="margin:0 0 8px;font-size:24px;font-weight:800;color:#f1f5f9;">New sign-in detected</h1>
      <p style="margin:0;color:#94a3b8;font-size:15px;">Someone just signed in to your VISUAR account.</p>
    </div>

    <!-- Info card -->
    <div style="background:#0f172a;border:1px solid #334155;border-left:4px solid #0891b2;border-radius:12px;padding:24px;margin-bottom:24px;">
      <table cellpadding="0" cellspacing="0" width="100%">
        <tr>
          <td style="color:#64748b;font-size:13px;padding:6px 0;width:40%;">Account</td>
          <td style="color:#f1f5f9;font-size:13px;font-weight:600;">{email}</td>
        </tr>
        <tr>
          <td style="color:#64748b;font-size:13px;padding:6px 0;">Name</td>
          <td style="color:#f1f5f9;font-size:13px;font-weight:600;">{name}</td>
        </tr>
        <tr>
          <td style="color:#64748b;font-size:13px;padding:6px 0;">Time</td>
          <td style="color:#f1f5f9;font-size:13px;font-weight:600;">{login_time}</td>
        </tr>
        <tr>
          <td style="color:#64748b;font-size:13px;padding:6px 0;">Platform</td>
          <td style="color:#f1f5f9;font-size:13px;font-weight:600;">VISUAR Web App</td>
        </tr>
      </table>
    </div>

    <!-- Security notice -->
    <div style="background:rgba(245,158,11,0.08);border:1px solid rgba(245,158,11,0.3);border-radius:12px;padding:16px 20px;margin-bottom:8px;">
      <p style="margin:0;color:#fbbf24;font-size:13px;line-height:1.6;">
        ⚠️ <strong>Wasn't you?</strong> If you didn't sign in, please change your password immediately and contact support.
      </p>
    </div>

    {_btn("Go to Dashboard", f"{app_url}/dashboard", "#0891b2")}
    """
    return _BASE.format(subject="New sign-in to your VISUAR account", content=content)


# ── Email 3: Test Completion ──────────────────────────────────────────────────

_TEST_LABELS = {
    "snellen-acuity":          "Distance Eyesight Number Test",
    "contrast-sensitivity":    "Contrast Sensitivity",
    "orientation-discrimination": "Orientation Discrimination",
    "rapid-recognition":       "Rapid Recognition",
    "refraction-battery":      "Full Refraction Battery",
    "duochrome-refinement":    "Duochrome Test",
    "refraction-simulator":    "Refraction Simulator",
    "astigmatism-fan":         "Astigmatism Fan",
    "near-far-switching":      "Near-Far Switching",
    "jaeger-acuity":           "Near Eyesight Number Test",
    "complete":                "Complete Vision Assessment",
}

def _score_color(score: int) -> str:
    if score >= 80: return "#10b981"
    if score >= 50: return "#f59e0b"
    return "#ef4444"

def _score_label(score: int) -> str:
    if score >= 80: return "Excellent"
    if score >= 50: return "Good"
    return "Needs Attention"

def _test_result_html(
    name: str,
    test_type: str,
    score: int,
    left_acuity: str | None,
    right_acuity: str | None,
    ai_summary: str | None,
    result_id: int,
    app_url: str,
) -> str:
    label = _TEST_LABELS.get(test_type, test_type.replace("-", " ").title())
    color = _score_color(score)
    status = _score_label(score)

    acuity_rows = ""
    if left_acuity:
        acuity_rows += f"""
        <tr>
          <td style="color:#64748b;font-size:13px;padding:6px 0;width:50%;">Left eye</td>
          <td style="color:#f1f5f9;font-size:14px;font-weight:700;">{left_acuity}</td>
        </tr>"""
    if right_acuity:
        acuity_rows += f"""
        <tr>
          <td style="color:#64748b;font-size:13px;padding:6px 0;">Right eye</td>
          <td style="color:#f1f5f9;font-size:14px;font-weight:700;">{right_acuity}</td>
        </tr>"""

    acuity_section = ""
    if acuity_rows:
        acuity_section = f"""
        {_divider()}
        <p style="margin:0 0 12px;color:#cbd5e1;font-size:12px;font-weight:600;text-transform:uppercase;letter-spacing:1px;">Visual Acuity</p>
        <div style="background:#0f172a;border:1px solid #334155;border-radius:12px;padding:16px 20px;">
          <table cellpadding="0" cellspacing="0" width="100%">{acuity_rows}</table>
        </div>"""

    ai_section = ""
    if ai_summary:
        ai_section = f"""
        {_divider()}
        <p style="margin:0 0 12px;color:#cbd5e1;font-size:12px;font-weight:600;text-transform:uppercase;letter-spacing:1px;">AI Summary</p>
        <div style="background:rgba(8,145,178,0.08);border:1px solid rgba(8,145,178,0.25);border-radius:12px;padding:18px 20px;">
          <p style="margin:0;color:#94a3b8;font-size:14px;line-height:1.7;">🤖 {ai_summary}</p>
        </div>"""

    content = f"""
    <!-- Hero -->
    <div style="text-align:center;margin-bottom:32px;">
      <p style="margin:0 0 8px;color:#64748b;font-size:13px;letter-spacing:0.5px;">TEST COMPLETED</p>
      <h1 style="margin:0 0 4px;font-size:26px;font-weight:800;color:#f1f5f9;">{label}</h1>
      <p style="margin:0;color:#94a3b8;font-size:14px;">Great work, {name}! Here are your results.</p>
    </div>

    <!-- Score card -->
    <div style="background:linear-gradient(135deg,{color}18 0%,{color}08 100%);border:2px solid {color}40;border-radius:16px;padding:32px;text-align:center;margin-bottom:24px;">
      <div style="font-size:64px;font-weight:900;color:{color};line-height:1;margin-bottom:8px;">{score}</div>
      <div style="font-size:13px;color:{color};font-weight:700;text-transform:uppercase;letter-spacing:1px;margin-bottom:12px;">out of 100</div>
      <div style="display:inline-block;">
        {_badge(status, color, f"{color}20")}
      </div>
      <!-- Score bar -->
      <div style="background:#1e293b;border-radius:100px;height:8px;margin:20px 0 0;overflow:hidden;">
        <div style="background:linear-gradient(90deg,{color}aa,{color});width:{min(score,100)}%;height:100%;border-radius:100px;"></div>
      </div>
    </div>

    {acuity_section}
    {ai_section}

    {_divider()}
    {_btn("View Full Results & AI Analysis", f"{app_url}/results/{result_id}")}
    """
    return _BASE.format(subject=f"✅ Your {label} results — VISUAR", content=content)


# ── Sender ────────────────────────────────────────────────────────────────────

async def _send_smtp_once(to_email: str, subject: str, html: str, cfg: dict) -> None:
    msg = MIMEMultipart("alternative")
    msg["Subject"] = subject
    msg["From"] = f"{cfg['from_name']} 👁️ <{cfg['user']}>"
    msg["To"] = to_email
    msg.attach(MIMEText(html, "html"))

    await aiosmtplib.send(
        msg,
        hostname=cfg["host"],
        port=cfg["port"],
        username=cfg["user"],
        password=cfg["password"],
        use_tls=cfg["use_tls"],
        start_tls=cfg["start_tls"],
        timeout=SMTP_TIMEOUT,
    )


async def _send(to_email: str, subject: str, html: str) -> None:
    cfg = _email_config()
    if not is_email_configured():
        print("[EMAIL] Credentials not configured — skipping.")
        return

    last_error: Exception | None = None
    for attempt in range(1, MAX_SEND_ATTEMPTS + 1):
        try:
            await _send_smtp_once(to_email, subject, html, cfg)
            print(f"[EMAIL] Sent '{subject}' → {to_email}")
            return
        except Exception as e:
            last_error = e
            print(f"[EMAIL] Attempt {attempt}/{MAX_SEND_ATTEMPTS} failed for {to_email}: {e}")
            if attempt < MAX_SEND_ATTEMPTS:
                await asyncio.sleep(2)

    raise last_error or RuntimeError("Email send failed")


async def _send_safe(to_email: str, subject: str, html: str) -> None:
    """Fire-and-forget wrapper — never raises, so emails never break endpoints."""
    try:
        await _send(to_email, subject, html)
    except Exception as e:
        print(f"[EMAIL] Failed to send '{subject}' → {to_email}: {e}")


# ── Public API ────────────────────────────────────────────────────────────────

async def send_welcome_email(to_email: str, name: str) -> None:
    cfg = _email_config()
    html = _welcome_html(name, to_email, cfg["app_url"])
    await _send_safe(to_email, "Welcome to VISUAR 👁️ — Your vision journey starts now", html)


async def send_login_email(to_email: str, name: str, login_time: str) -> None:
    cfg = _email_config()
    html = _login_html(name, to_email, login_time, cfg["app_url"])
    await _send_safe(to_email, "New sign-in to your VISUAR account 🔐", html)


async def send_test_result_email(
    to_email: str,
    name: str,
    test_type: str,
    score: int,
    left_acuity: str | None,
    right_acuity: str | None,
    ai_summary: str | None,
    result_id: int,
) -> None:
    cfg = _email_config()
    html = _test_result_html(
        name, test_type, score, left_acuity, right_acuity, ai_summary, result_id, cfg["app_url"]
    )
    label = _TEST_LABELS.get(test_type, test_type.replace("-", " ").title())
    await _send_safe(to_email, f"✅ {label} results ready — VISUAR", html)
