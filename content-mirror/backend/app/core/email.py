"""
Simple email utility — uses stdlib smtplib wrapped in a thread pool to avoid blocking.
If SMTP is not configured, the email content is logged instead (dev/staging fallback).
"""

import asyncio
import logging
import smtplib
from email.mime.multipart import MIMEMultipart
from email.mime.text import MIMEText
from functools import partial

from app.core.config import settings

logger = logging.getLogger("content_mirror.email")


def _send_sync(to: str, subject: str, html_body: str) -> None:
    msg = MIMEMultipart("alternative")
    msg["Subject"] = subject
    msg["From"] = settings.smtp_from
    msg["To"] = to
    msg.attach(MIMEText(html_body, "html"))

    with smtplib.SMTP(settings.smtp_host, settings.smtp_port, timeout=10) as server:
        server.ehlo()
        if settings.smtp_tls:
            server.starttls()
        if settings.smtp_user and settings.smtp_password:
            server.login(settings.smtp_user, settings.smtp_password)
        server.sendmail(settings.smtp_from, [to], msg.as_string())


async def send_email(to: str, subject: str, html_body: str) -> bool:
    """Send an email. Returns True on success. Logs on failure or when SMTP is unconfigured."""
    if not settings.smtp_host:
        logger.info(
            "SMTP not configured — would have sent '%s' to %s", subject, to
        )
        return False
    try:
        loop = asyncio.get_event_loop()
        await loop.run_in_executor(None, partial(_send_sync, to, subject, html_body))
        logger.info("Email sent to %s: %s", to, subject)
        return True
    except Exception as exc:
        logger.error("Failed to send email to %s: %s", to, exc)
        return False


def _password_reset_html(reset_url: str) -> str:
    return f"""
    <div style="font-family:-apple-system,sans-serif;max-width:480px;margin:0 auto;padding:40px 24px;color:#1e293b">
      <h2 style="color:#4f6ef7;margin-bottom:8px">Reset your password</h2>
      <p style="color:#64748b;font-size:14px">Click the button below to set a new password. This link expires in 1 hour.</p>
      <a href="{reset_url}"
         style="display:inline-block;margin-top:24px;padding:12px 28px;background:#4f6ef7;color:#fff;
                border-radius:8px;text-decoration:none;font-weight:600;font-size:14px">
        Reset password
      </a>
      <p style="margin-top:24px;font-size:12px;color:#94a3b8">
        If you didn't request this, you can safely ignore this email.
      </p>
    </div>"""


def _verify_email_html(verify_url: str) -> str:
    return f"""
    <div style="font-family:-apple-system,sans-serif;max-width:480px;margin:0 auto;padding:40px 24px;color:#1e293b">
      <h2 style="color:#4f6ef7;margin-bottom:8px">Verify your email</h2>
      <p style="color:#64748b;font-size:14px">Click the button below to verify your email address. This link expires in 24 hours.</p>
      <a href="{verify_url}"
         style="display:inline-block;margin-top:24px;padding:12px 28px;background:#4f6ef7;color:#fff;
                border-radius:8px;text-decoration:none;font-weight:600;font-size:14px">
        Verify email
      </a>
      <p style="margin-top:24px;font-size:12px;color:#94a3b8">
        If you didn't create a Content Mirror account, you can safely ignore this email.
      </p>
    </div>"""
