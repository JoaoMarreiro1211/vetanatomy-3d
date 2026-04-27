from typing import Any
import logging
import smtplib
from email.message import EmailMessage
import requests

from app.core.config import settings

logger = logging.getLogger("email_service")


def _send_smtp(to_email: str, subject: str, body: str) -> bool:
    msg = EmailMessage()
    msg["Subject"] = subject
    msg["From"] = settings.EMAIL_FROM
    msg["To"] = to_email
    msg.set_content(body)

    try:
        with smtplib.SMTP(settings.SMTP_HOST, settings.SMTP_PORT) as server:
            server.starttls()
            if settings.SMTP_USER and settings.SMTP_PASSWORD:
                server.login(settings.SMTP_USER, settings.SMTP_PASSWORD)
            server.send_message(msg)
        logger.info("SMTP email sent to %s", to_email)
        return True
    except Exception as e:
        logger.exception("Failed to send SMTP email: %s", e)
        return False


def _send_sendgrid(to_email: str, subject: str, body: str) -> bool:
    if not settings.SENDGRID_API_KEY:
        logger.error("SendGrid API key not configured")
        return False
    url = "https://api.sendgrid.com/v3/mail/send"
    payload = {
        "personalizations": [{"to": [{"email": to_email}]}],
        "from": {"email": settings.EMAIL_FROM},
        "subject": subject,
        "content": [{"type": "text/plain", "value": body}],
    }
    headers = {"Authorization": f"Bearer {settings.SENDGRID_API_KEY}", "Content-Type": "application/json"}
    try:
        r = requests.post(url, json=payload, headers=headers, timeout=10)
        if r.status_code in (200, 202):
            logger.info("SendGrid accepted email to %s", to_email)
            return True
        else:
            logger.error("SendGrid error %s: %s", r.status_code, r.text)
            return False
    except Exception as e:
        logger.exception("Failed to send SendGrid email: %s", e)
        return False


def send_password_reset(email: str, token: str) -> bool:
    reset_link = f"https://your-frontend.example.com/reset-password?token={token}"
    subject = "[VetAnatomy] Redefinição de senha"
    body = f"Clique no link para redefinir sua senha: {reset_link}\n\nSe você não solicitou, ignore este e-mail."
    if settings.EMAIL_PROVIDER == "sendgrid":
        return _send_sendgrid(email, subject, body)
    return _send_smtp(email, subject, body)


def send_generic(email: str, subject: str, body: str) -> bool:
    if settings.EMAIL_PROVIDER == "sendgrid":
        return _send_sendgrid(email, subject, body)
    return _send_smtp(email, subject, body)
