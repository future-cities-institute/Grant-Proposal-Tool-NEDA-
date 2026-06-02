# Grant Proposal Tool

AI-assisted grant proposal workspace for community-focused grant drafting, review, and export.

## What It Includes

- FastAPI backend for parsing grant calls, drafting proposal content, compliance checks, and export
- Next.js frontend for the proposal workflow and section editor
- User workspace records for saved proposals, progress, and export timestamps
- Local RAG pipeline backed by Chroma for retrieval over proposal/program documents
- Optional Google Document AI support for stronger PDF form parsing

## Workflow

1. Upload a grant package (PDF, DOCX, or TXT)
2. Review extracted requirements and prompts
3. Enter community profile details
4. Generate and refine the draft
5. Review warnings/compliance gaps and fill missing info
6. Export the proposal to PDF

## Prerequisites

- Python 3.9+
- Node.js 18+ and npm
- `OPENAI_API_KEY`

## Setup

From the repo root:

```powershell
python -m venv .venv
.\.venv\Scripts\Activate.ps1
python -m pip install -r requirements.txt
python -m pip install -r api\requirements.txt
```

Create the frontend env file and install dependencies:

```powershell
cd frontend
npm install
Copy-Item .env.example .env.local
cd ..
```

## Environment Variables

Set these in the same terminal where you run the backend:

```powershell
$env:OPENAI_API_KEY = "your_key_here"
$env:PYTHONPATH = (Get-Location).Path
```

Local workspace persistence and auth defaults:

```powershell
$env:AUTH_MODE = "dev"
$env:DEV_USER_EMAIL = "prave@example.com"
$env:DEV_USER_NAME = "Prave"
$env:PROPOSAL_WORKSPACE_DB = "data\proposal_workspace.sqlite3"
```

For Cognito-backed auth, set:

```powershell
$env:AUTH_MODE = "cognito"
$env:AWS_REGION = "ca-central-1"
$env:COGNITO_USER_POOL_ID = "your-user-pool-id"
$env:COGNITO_APP_CLIENT_ID = "your-app-client-id"
```

Optional Google Document AI parsing:

```powershell
$env:GOOGLE_CLOUD_PROJECT = "your-google-cloud-project-id"
$env:DOCUMENTAI_LOCATION = "us"
$env:DOCUMENTAI_PROCESSOR_ID = "your-processor-id"
```

If using Google Document AI locally, authenticate once with:

```powershell
gcloud auth application-default login
```

## Run The App

Run the backend from the repo root:

```powershell
.\.venv\Scripts\Activate.ps1
$env:PYTHONPATH = (Get-Location).Path
python -m uvicorn api.main:app --reload --port 8000
```

Use `python -m uvicorn` instead of `uvicorn` directly. On Windows, copied or moved virtual environments can leave `uvicorn.exe` pointing at an old Python path.

In a second terminal, run the frontend:

```powershell
cd frontend
npm run dev
```

Backend: `http://localhost:8000`

Frontend: check the URL printed by `npm run dev` (usually `http://localhost:3002` or `http://localhost:3000`).

## RAG Index

If you intentionally add or update `.txt` source files in `backend/app/data/app_library/`, rebuild the index:

```powershell
python scripts/build_index.py --use-case default --reset
```

This writes to `backend/app/data/app_library/vector_store/`. Do not commit generated vector store artifacts unless intentionally versioning them.

## License

MIT (see `LICENSE`)
