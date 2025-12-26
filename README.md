# TLDR Tiles

A static web page that shows your TLDR emails as themed tiles. A GitHub Action pulls the latest emails daily and updates `tldr.json` for the UI.

## How it works
- `scripts/fetch_gmail.py` pulls TLDR emails from Gmail and writes `tldr.json`.
- `index.html` + `app.js` read `tldr.json` and render tiles grouped by theme.
- Read/archived state is stored in your browser `localStorage` (no database).
- GitHub Actions runs daily and publishes to GitHub Pages.

## One-time Gmail setup
1) Create a Google Cloud project and enable the Gmail API.
2) Configure the OAuth consent screen (External or Internal).
3) Create OAuth credentials (Desktop app) and download the JSON.
4) Save the file as `client_secret.json` next to `scripts/get_refresh_token.py`.
5) Install dependencies locally:

```bash
python -m venv .venv
source .venv/bin/activate
python -m pip install -r requirements.txt
```

6) Get a refresh token:

```bash
python scripts/get_refresh_token.py
```

Keep the printed refresh token.

## GitHub Secrets
Add these repository secrets:
- `GMAIL_CLIENT_ID`
- `GMAIL_CLIENT_SECRET`
- `GMAIL_REFRESH_TOKEN`
- Optional: `GMAIL_QUERY` (override the default Gmail search query)

Default query:
```
from:tldr OR from:info@tldr.tech OR subject:"TLDR"
```

## Deploy on GitHub Pages
1) Push this repo to GitHub.
2) In GitHub: Settings -> Pages -> Build and deployment -> Source: GitHub Actions.
3) Run the workflow once (Actions tab) or wait for the daily schedule.

Your page will be available at the GitHub Pages URL.

## Customize
- Theme rules: edit `scripts/fetch_gmail.py` in `THEME_RULES`.
- Tile styling: edit `styles.css`.
- UI copy: edit `index.html`.

## Local preview
You can open `index.html` directly in the browser. To refresh data locally:

```bash
GMAIL_CLIENT_ID=... \
GMAIL_CLIENT_SECRET=... \
GMAIL_REFRESH_TOKEN=... \
python scripts/fetch_gmail.py
```

## Notes
- Gmail API access requires OAuth and will not work with a front-only page.
- The Gmail query is intentionally broad. You can narrow it to your TLDR list.
