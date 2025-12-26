import base64
import json
import os
import re
from datetime import datetime, timezone
from email.utils import parsedate_to_datetime

from google.auth.transport.requests import Request
from google.oauth2.credentials import Credentials
from googleapiclient.discovery import build
from bs4 import BeautifulSoup

SCOPES = ["https://www.googleapis.com/auth/gmail.readonly"]

THEME_RULES = [
    ("AI", ["ai", "machine learning", "llm", "openai", "anthropic", "model"]),
    ("Product", ["product", "growth", "roadmap", "feature", "launch"]),
    ("Engineering", ["engineering", "dev", "developer", "infra", "backend", "frontend", "api"]),
    ("Data", ["data", "analytics", "warehouse", "sql", "etl"]),
    ("Security", ["security", "vuln", "cve", "breach", "risk"]),
    ("Business", ["business", "revenue", "sales", "market", "pricing"]),
    ("Design", ["design", "ux", "ui", "prototype"]),
    ("Startups", ["startup", "founder", "funding", "vc"]),
]


def get_credentials():
    client_id = os.environ.get("GMAIL_CLIENT_ID")
    client_secret = os.environ.get("GMAIL_CLIENT_SECRET")
    refresh_token = os.environ.get("GMAIL_REFRESH_TOKEN")

    if not client_id or not client_secret or not refresh_token:
        raise RuntimeError("Missing Gmail OAuth env vars.")

    creds = Credentials(
        token=None,
        refresh_token=refresh_token,
        token_uri="https://oauth2.googleapis.com/token",
        client_id=client_id,
        client_secret=client_secret,
        scopes=SCOPES,
    )
    creds.refresh(Request())
    return creds


def extract_body(payload):
    if not payload:
        return ""

    mime_type = payload.get("mimeType", "")
    body = payload.get("body", {})
    data = body.get("data")

    if mime_type in ("text/plain", "text/html") and data:
        decoded = base64.urlsafe_b64decode(data.encode("utf-8", errors="ignore"))
        text = decoded.decode("utf-8", errors="ignore")
        if mime_type == "text/html":
            text = BeautifulSoup(text, "html.parser").get_text(" ")
        return text

    for part in payload.get("parts", []):
        extracted = extract_body(part)
        if extracted:
            return extracted

    return ""


def summarize(text, limit=320):
    cleaned = re.sub(r"\s+", " ", text).strip()
    if len(cleaned) <= limit:
        return cleaned
    return cleaned[: limit - 3] + "..."


def classify_theme(text):
    lowered = text.lower()
    for theme, keywords in THEME_RULES:
        if any(keyword in lowered for keyword in keywords):
            return theme
    return "General"


def fetch_messages(service, query, limit):
    response = (
        service.users().messages().list(userId="me", q=query, maxResults=limit).execute()
    )
    return response.get("messages", [])


def message_to_item(service, message_id):
    msg = (
        service.users()
        .messages()
        .get(userId="me", id=message_id, format="full")
        .execute()
    )

    headers = {h["name"].lower(): h["value"] for h in msg.get("payload", {}).get("headers", [])}
    subject = headers.get("subject", "(No subject)")
    date_header = headers.get("date")
    date_value = None

    if date_header:
        try:
            date_value = parsedate_to_datetime(date_header)
        except Exception:
            date_value = None

    if date_value:
        date_iso = date_value.astimezone(timezone.utc).isoformat()
    else:
        date_iso = datetime.now(timezone.utc).isoformat()

    body_text = extract_body(msg.get("payload"))
    snippet = msg.get("snippet", "")
    combined = f"{subject} {body_text}"

    return {
        "id": msg.get("id"),
        "title": subject,
        "summary": summarize(body_text or snippet),
        "theme": classify_theme(combined),
        "date": date_iso,
        "source": "TLDR",
    }


def main():
    query = os.environ.get(
        "GMAIL_QUERY",
        "from:dan@tldrnewsletter.com",
    )
    limit = int(os.environ.get("GMAIL_LIMIT", "40"))
    output_path = os.environ.get("OUTPUT_PATH", "tldr.json")

    creds = get_credentials()
    service = build("gmail", "v1", credentials=creds)

    messages = fetch_messages(service, query, limit)
    items = [message_to_item(service, msg["id"]) for msg in messages]
    items.sort(key=lambda item: item.get("date", ""), reverse=True)

    payload = {
        "updated_at": datetime.now(timezone.utc).isoformat(),
        "items": items,
    }

    with open(output_path, "w", encoding="utf-8") as handle:
        json.dump(payload, handle, indent=2)


if __name__ == "__main__":
    main()
