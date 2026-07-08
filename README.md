# Team Insight AI

An enterprise performance management platform for engineering managers and directors. Team Insight AI consolidates employee performance data, skills tracking, goal management, and AI-driven insights into a single interface — with integrations to tools like Degreed, Azure DevOps, GitHub, Jira, and Pluralsight.

---

## Features

| Area | Description |
|---|---|
| **Dashboard** | Team health score, goal completion rate, skills growth, promotion pipeline, recent activity |
| **Team / Employees** | Employee profiles, performance scores across 6 dimensions, promotion readiness tracking |
| **Goals** | Quarterly and annual goal tracking with risk flagging, progress monitoring, and strategic alignment |
| **Skills Matrix** | Heatmap of team skills by category, gap analysis, skill-level editing |
| **Projects** | Engineering project contributions with business and technical impact scoring |
| **AI Insights** | GPT-4 powered performance summaries, coaching recommendations, promotion readiness analysis |
| **Director Notes** | Private coaching notes with categories (Recognition, Concerns, Leadership Potential, etc.) |
| **Reports** | Exportable performance reports (PDF, Excel, PowerPoint) |
| **Degreed Integration** | Pull live skill ratings, focus skills, assignments, and skill insights directly from Degreed LXP |
| **Admin** | Scoring model weights, integration config, notifications, org settings |

---

## Architecture

```
┌─────────────────────┐     ┌──────────────────────┐     ┌─────────────────┐
│   Next.js Frontend  │────▶│  FastAPI Backend API  │────▶│  PostgreSQL DB  │
│   (Port 3000)       │     │  (Port 8000)          │     │  (Port 5432)    │
└─────────────────────┘     └──────────────────────┘     └─────────────────┘
                                       │                          │
                             ┌─────────┴────────┐      ┌─────────┘
                             │   External APIs   │      │   Redis Cache
                             │  - Azure OpenAI   │      │   (Port 6379)
                             │  - Degreed API    │      └──────────────────
                             │  - MS Entra ID    │
                             └───────────────────┘
```

- **Frontend**: Next.js 14 (App Router), Tailwind CSS, Recharts
- **Backend**: FastAPI (Python 3.12), SQLAlchemy (async), Pydantic v2
- **Database**: PostgreSQL 16
- **Cache**: Redis 7 (AI response caching, sessions)
- **Auth**: Microsoft Entra ID (MSAL) + JWT
- **AI**: Azure OpenAI / OpenAI GPT-4

---

## Prerequisites

- [Docker Desktop](https://www.docker.com/products/docker-desktop/) (recommended)
- Or: Node.js 20+, Python 3.12+, PostgreSQL 16, Redis 7

---

## Quick Start (Docker)

### 1. Clone the repository

```bash
git clone https://github.com/willtip/team_insight.git
cd team_insight
```

### 2. Configure environment variables

Copy the example env file and fill in your values:

```bash
cp .env.example .env
```

Edit `.env`:

```env
# Database
DB_USER=teaminsight
DB_PASSWORD=your_secure_password

# Azure / Entra ID
AZURE_TENANT_ID=xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx
AZURE_CLIENT_ID=xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx
AZURE_CLIENT_SECRET=your_client_secret

# OpenAI / Azure OpenAI
OPENAI_API_KEY=sk-...
AZURE_OPENAI_ENDPOINT=https://your-instance.openai.azure.com/

# App secrets
JWT_SECRET_KEY=your_very_long_random_secret_key
NEXTAUTH_SECRET=your_nextauth_secret

# Degreed (optional — configure in Admin UI or here)
DEGREED_CLIENT_ID=
DEGREED_CLIENT_SECRET=
DEGREED_ORG=your-organization
DEGREED_BASE_URL=https://api.degreed.com
DEGREED_AUTH_URL=https://degreed.com/oauth/token
```

### 3. Start all services

```bash
docker compose up --build
```

This starts:
- **PostgreSQL** on port `5432`
- **Redis** on port `6379`
- **FastAPI backend** on port `8000`
- **Next.js frontend** on port `3000`

Open [http://localhost:3000](http://localhost:3000) in your browser.

---

## Local Development (without Docker)

### Backend

```bash
cd backend
python -m venv .venv
source .venv/bin/activate       # Windows: .venv\Scripts\activate
pip install -r requirements.txt

# Set environment variables (or use a .env file)
export DATABASE_URL=postgresql+asyncpg://teaminsight:password@localhost:5432/team_insight_ai
export JWT_SECRET_KEY=dev-secret-key
export OPENAI_API_KEY=sk-...

# Run the API server
uvicorn app.main:app --reload --port 8000
```

API docs available at: [http://localhost:8000/api/docs](http://localhost:8000/api/docs)

### Frontend

```bash
# From project root
npm install
npm run dev
```

Frontend available at: [http://localhost:3000](http://localhost:3000)

---

## Environment Variables Reference

| Variable | Required | Description |
|---|---|---|
| `DB_USER` | Yes | PostgreSQL username |
| `DB_PASSWORD` | Yes | PostgreSQL password |
| `AZURE_TENANT_ID` | Yes | Azure/Entra ID tenant |
| `AZURE_CLIENT_ID` | Yes | Azure app client ID |
| `AZURE_CLIENT_SECRET` | Yes | Azure app client secret |
| `OPENAI_API_KEY` | Yes* | OpenAI API key (*or Azure OpenAI) |
| `AZURE_OPENAI_ENDPOINT` | No | Azure OpenAI endpoint (replaces OpenAI) |
| `JWT_SECRET_KEY` | Yes | Secret for signing JWTs |
| `NEXTAUTH_SECRET` | Yes | NextAuth.js session secret |
| `DEGREED_CLIENT_ID` | No | Degreed OAuth client ID |
| `DEGREED_CLIENT_SECRET` | No | Degreed OAuth client secret |
| `DEGREED_ORG` | No | Your Degreed organization subdomain |
| `DEGREED_BASE_URL` | No | Degreed API base (default: `https://api.degreed.com`) |
| `DEGREED_AUTH_URL` | No | Degreed OAuth token URL (default: `https://degreed.com/oauth/token`) |
| `ENVIRONMENT` | No | `development` or `production` |

---

## Project Structure

```
team_insight/
├── app/                        # Next.js App Router pages
│   ├── page.tsx                # Dashboard
│   ├── employees/              # Team member profiles
│   ├── goals/                  # Goal tracking
│   ├── skills/                 # Skills matrix
│   ├── projects/               # Project contributions
│   ├── insights/               # AI insights
│   ├── notes/                  # Director notes
│   ├── reports/                # Reports export
│   ├── degreed/                # Degreed LXP integration
│   └── admin/                  # Admin settings
├── components/                 # Shared React components
│   ├── layout/                 # Header, Sidebar
│   ├── dashboard/              # Dashboard widgets
│   ├── charts/                 # Recharts visualizations
│   ├── employees/              # Employee cards, modals
│   ├── ui/                     # Design system (Button, Card, Badge…)
│   └── admin/                  # Integration config modal
├── lib/                        # Utilities, types, mock data
├── backend/
│   ├── app/
│   │   ├── main.py             # FastAPI app + router registration
│   │   ├── routers/            # API route handlers
│   │   │   ├── auth.py
│   │   │   ├── employees.py
│   │   │   ├── goals.py
│   │   │   ├── skills.py
│   │   │   ├── projects.py
│   │   │   ├── insights.py
│   │   │   ├── notes.py
│   │   │   ├── reports.py
│   │   │   └── degreed.py      # Degreed integration endpoints
│   │   ├── services/
│   │   │   ├── ai_service.py   # OpenAI integration
│   │   │   ├── evaluation_service.py
│   │   │   └── degreed_service.py  # Degreed API client
│   │   ├── schemas/schemas.py  # Pydantic request/response models
│   │   └── models/models.py    # SQLAlchemy ORM models
│   ├── requirements.txt
│   └── Dockerfile
├── database/schema.sql         # PostgreSQL schema
├── docker-compose.yml
└── .env                        # Environment variables (git-ignored)
```

---

## Degreed Integration

Team Insight AI integrates with the [Degreed API v2](https://developer.degreed.com) to pull learning and skills data directly into your team performance view.

### Setup

1. Obtain API credentials from your Degreed Technical Admin (Client ID + Client Secret with appropriate scopes).
2. In Team Insight, go to **Admin → Integrations → Degreed** and enter your credentials, or set them as environment variables.
3. Required OAuth scopes:
   - `users:read`
   - `user_skills:read`
   - `skill_ratings:read`
   - `skill_plans:read`
   - `required_learning:read`
   - `completions:read`

### What Gets Pulled

| Data | Degreed Endpoint | Team Insight View |
|---|---|---|
| Team skill ratings | `GET /api/v2/skill-ratings` | Degreed → Skill Ratings tab |
| User skills / focus skills | `GET /api/v2/user-skills` | Degreed → Team Skills tab |
| Skill plans (assignments) | `GET /api/v2/skill-plans` | Degreed → Assignments tab |
| Required learning | `GET /api/v2/required-learning` | Degreed → Assignments tab |
| Skill insights (aggregated) | Aggregated from ratings | Degreed → Insights tab |
| Skill ratings breakdown | `GET /api/v2/users/{id}/skill-ratings` | Degreed → Breakdown tab |

Navigate to the **Degreed** section in the sidebar to view and query this data.

---

## API Endpoints

The FastAPI backend exposes:

| Method | Path | Description |
|---|---|---|
| `GET` | `/api/health` | Health check |
| `GET` | `/api/v1/team/metrics` | Aggregated team metrics |
| `POST` | `/api/v1/auth/token` | Exchange Entra token for JWT |
| `GET` | `/api/v1/employees` | List team members |
| `GET/POST` | `/api/v1/goals` | Goals CRUD |
| `GET` | `/api/v1/skills/matrix` | Full skills heatmap data |
| `GET` | `/api/v1/skills/gaps` | Team skill gap analysis |
| `GET` | `/api/v1/insights` | AI-generated insights |
| `GET` | `/api/v1/notes` | Director coaching notes |
| `GET` | `/api/v1/reports` | Report generation |
| `GET` | `/api/v1/degreed/status` | Degreed connection status |
| `GET` | `/api/v1/degreed/team/skills` | Team skills from Degreed |
| `GET` | `/api/v1/degreed/team/skill-ratings` | Team skill ratings from Degreed |
| `GET` | `/api/v1/degreed/team/focus-skills` | Focus/target skills from Degreed |
| `GET` | `/api/v1/degreed/team/assignments` | Required learning/assignments |
| `GET` | `/api/v1/degreed/team/insights` | Aggregated skill insights |
| `GET` | `/api/v1/degreed/users/{user_id}/skill-ratings` | Per-user skill ratings breakdown |
| `POST` | `/api/v1/degreed/sync` | Trigger full Degreed data sync |

Full interactive docs: [http://localhost:8000/api/docs](http://localhost:8000/api/docs)

---

## Performance Scoring Model

Each employee receives a composite performance score (0–100) weighted across six dimensions:

| Dimension | Default Weight |
|---|---|
| Goal Achievement | 30% |
| Project Contributions | 25% |
| Professional Development | 15% |
| Leadership Behaviors | 15% |
| Collaboration | 10% |
| Innovation | 5% |

Weights are configurable per organization via **Admin → Scoring Model**.

---

## Integrations Supported

| Integration | Purpose |
|---|---|
| Microsoft Entra ID | SSO and user provisioning |
| Microsoft Teams | Coaching reminders and notifications |
| Azure DevOps | Project contribution auto-import |
| GitHub | PR and commit activity signals |
| Jira | Sprint completion and velocity |
| Pluralsight | Training completion auto-sync |
| LinkedIn Learning | Course completion import |
| Workday | HR data and org hierarchy sync |
| **Degreed** | **Skills, ratings, assignments, and learning insights** |

---

## License

Private — internal use only.
