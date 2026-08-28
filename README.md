# Team Insight AI

An enterprise performance management platform for engineering managers and directors. Team Insight consolidates performance data, goal management, AI-driven insights and — at its centre — a rigorous **technical skills assessment framework**, with integrations to Degreed, Azure DevOps, GitHub, Jira and Pluralsight.

> ### 📖 User Guide
>
> A full walkthrough — the rubric, how to run an assessment, reading each tab, the Excel round-trip, four worked examples and an FAQ — ships **inside the app**.
>
> - **Running the app?** Click **Guide** in the top-right of the header, or go to **[localhost:3000/guide](http://localhost:3000/guide)**.
> - **Browsing on GitHub?** The source is [`app/guide/page.tsx`](app/guide/page.tsx), and the sections below cover the same ground.

![Skills Matrix overview](public/docs/skills-overview.png)

---

## Quick start

The Skills Matrix runs entirely in the browser — **no database, backend or API keys required**. This is the fastest way to see the product:

```bash
git clone https://github.com/willtip/team_insight.git
cd team_insight
npm install
npm run dev
```

Open **[http://localhost:3000](http://localhost:3000)**. The app loads with a demo team of ten engineers already assessed against the skill catalog, so every screen has real data from the first click.

**Requirements:** Node.js 20+. That's it.

Then head to **Skills Matrix** in the sidebar, or click **Guide** in the header for the walkthrough.

<details>
<summary><strong>Full stack with Docker</strong> — needed only for the Degreed integration and AI insights</summary>

```bash
cp .env.example .env      # then fill in the values below
docker compose up --build
```

This starts PostgreSQL (`5432`), Redis (`6379`), the FastAPI backend (`8000`) and the Next.js frontend (`3000`).

```env
DB_USER=teaminsight
DB_PASSWORD=your_secure_password

AZURE_TENANT_ID=xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx
AZURE_CLIENT_ID=xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx
AZURE_CLIENT_SECRET=your_client_secret

OPENAI_API_KEY=sk-...
AZURE_OPENAI_ENDPOINT=https://your-instance.openai.azure.com/

JWT_SECRET_KEY=your_very_long_random_secret_key
NEXTAUTH_SECRET=your_nextauth_secret

# Degreed (optional — can also be set in Admin → Integrations)
DEGREED_CLIENT_ID=
DEGREED_CLIENT_SECRET=
DEGREED_ORG=your-organization
DEGREED_BASE_URL=https://api.degreed.com
DEGREED_AUTH_URL=https://degreed.com/oauth/token
```

</details>

<details>
<summary><strong>Backend without Docker</strong></summary>

```bash
cd backend
python -m venv .venv
source .venv/bin/activate       # Windows: .venv\Scripts\activate
pip install -r requirements.txt

export DATABASE_URL=postgresql+asyncpg://teaminsight:password@localhost:5432/team_insight_ai
export JWT_SECRET_KEY=dev-secret-key
export OPENAI_API_KEY=sk-...

uvicorn app.main:app --reload --port 8000
```

API docs at [http://localhost:8000/api/docs](http://localhost:8000/api/docs).

</details>

### Useful commands

| Command | What it does |
|---|---|
| `npm run dev` | Start the dev server on port 3000 |
| `npm run build` | Production build |
| `npm run start` | Serve the production build |
| `npx tsc --noEmit` | Type-check the whole project |

---

## Features

| Area | Description |
|---|---|
| **Skills Matrix** | Catalog-driven technical assessment on a 0–5 anchored rubric — domain heat map, self vs reviewer ratings with evidence, computed gap and priority, bus-factor risk, role-profile fit, development plans, and full Excel round-trip |
| **User Guide** | Built-in documentation at `/guide` with screenshots, step-by-step walkthroughs, worked examples and an FAQ |
| **Dashboard** | Team health score, goal completion rate, skills growth, promotion pipeline, recent activity |
| **Team / Employees** | Employee profiles, performance scores across 6 dimensions, promotion readiness tracking |
| **Goals** | Quarterly and annual goal tracking with risk flagging, progress monitoring, strategic alignment |
| **Projects** | Engineering project contributions with business and technical impact scoring |
| **AI Insights** | GPT-4 powered performance summaries, coaching recommendations, promotion readiness analysis |
| **Director Notes** | Private coaching notes by category (Recognition, Concerns, Leadership Potential…) |
| **Reports** | Exportable performance reports (PDF, Excel, CSV) |
| **Degreed Integration** | Live skill ratings, focus skills, assignments and skill insights from Degreed LXP |
| **Admin** | Scoring model weights, integration config, notifications, org settings |

---

## The skills assessment framework

The Skills Matrix is built on a reference model rather than free-text skill tags. Four ideas hold it together.

### 1. A catalog of observable capabilities

`lib/skill-catalog.ts` ships **69 assessable capabilities across 8 domains** — 53 flagged critical. Each carries:

| Field | Purpose |
|---|---|
| **Observable capability** | What "doing this" actually looks like — the thing raters judge against |
| **Example evidence** | What proof at target level looks like |
| **Critical?** | Feeds critical coverage, bus-factor risk, and gap priority |
| **Target level** | The bar every rating is measured against |
| **Weight** (1.1–1.6) | Relative importance in the weighted capability index |

Domains: AAP platform engineering (14), Software engineering (12), Platform engineering and DevOps (9), Enterprise integration (7), AI and agentic automation (10), Reliability engineering (6), Security and governance (5), Product and leadership (6).

The catalog is **fully editable in-app** on the Framework tab — create, edit and delete any skill, including introducing new domains. Criticality, target and weight are also editable inline in the table for quick bulk passes. The shipped set is a preset you can reset to, so replacing it wholesale for a non-automation team is safe.

#### Breadth and depth: the shape of a role

These are the two most consequential numbers in the framework, and both are **counts of skills** — not percentages, not scores.

| | **Breadth** | **Depth** |
|---|---|---|
| **The question** | How wide does this role reach? | How far down does this role go? |
| **What it counts** | Skills the engineer can *work* — rated at the breadth threshold (level 2) or above | Skills the engineer *owns* — rated at the depth threshold (level 4) or above |
| **Low number** | A specialist; narrow surface area, deliberately | A contributor rather than an owner |
| **High number** | A generalist who can pick up most work with review | A primary owner across many areas — what protects you from bus-factor risk |

The shipped **Automation Architect / Technical Lead** sits at breadth 45 / depth 17 against a 69-skill catalog: able to work in about two-thirds of what the team does, personally owning about a quarter. The **AAP Platform Engineer** sits at 34 / 11 — narrower and less deep, because it's a focused operational role.

#### Measurement thresholds

"Level 2 or above" and "level 4 or above" are **defaults, not laws**. All three levels are configurable on **Framework → Role profiles**, and changing one re-scores the whole team immediately:

| Threshold | Default | Decides | Drives |
|---|---|---|---|
| **Breadth** | `2 · Guided practitioner` | When an engineer counts as having a skill at all | Per-engineer breadth; every role profile's breadth target |
| **Coverage** | `3 · Independent` | When the team as a whole is covered for a skill | Critical coverage; the "nobody at working proficiency" list |
| **Depth** | `4 · Advanced/lead` | When an engineer genuinely owns a skill | Per-engineer depth; role depth targets; bus-factor risk |

Each control shows its live effect before you commit — moving depth from 4 to 3 on the demo team takes bus-factor risks from 32 to 8. Raising a threshold doesn't change anyone's capability, only what you're willing to call ownership, so pick levels that match how your organisation talks and then leave them alone; cross-quarter comparisons only mean something if the thresholds held still. Keep them ordered breadth ≤ coverage ≤ depth — the app warns you if they aren't.

### 2. One anchored 0–5 rubric

| Level | Label | Independence | Scope | Counts toward |
|---|---|---|---|---|
| 0 | Not exposed | Cannot perform | None | — |
| 1 | Aware | Needs detailed help | Lab | — |
| 2 | Guided practitioner | Routine work with review | Known pattern | **Breadth** |
| 3 | Independent | End-to-end ownership | Production | **Coverage** |
| 4 | Advanced/lead | Leads and coaches | Complex/cross-system | **Depth** |
| 5 | Strategic expert | Sets direction | Enterprise | Depth |

Three thresholds do the analytical work — **breadth**, **coverage** and **depth**, defaulting to levels 2, 3 and 4 respectively and configurable as described above. The full rubric, including evidence expectations per level, is available in-app from the **Scoring guide** button.

### 3. Assessments that calculate themselves

Ratings are stored per person × catalog skill. You record two things — what the person can do, and what the role requires. Everything else is derived, in `lib/skill-analytics.ts`, as pure functions:

```
finalRating = reviewerRating ?? selfRating        # reviewer supersedes self
gap         = max(0, target − finalRating)
priority    = critical && gap >= 2  → High
              gap >= 2              → Medium
              gap == 1              → Low
              gap == 0              → Maintain
```

**Per engineer:** assessed count, breadth, depth, critical breadth, average level, target attainment, High-priority gaps, and a weighted capability index:

```
capabilityIndex = Σ(min(level, target) × weight) ÷ Σ(target × weight)
```

Measured against what the role *requires*, not a theoretical maximum — someone fully meeting a set of level-3 targets scores 100%, not 60%.

**Per skill, across the team:** coverage (people at 3+), depth owners (4+), team average, shortfall to target, upskilling candidates (people exactly one level below target), and **bus-factor risk** — a critical skill with at most one depth owner.

### 4. Role profiles with numeric targets

Role profiles carry a breadth target, a depth target (both explained above), and the specific catalog skills that make up that role's depth areas. They are **fully editable** — create your own, edit the shipped ones, or delete what doesn't apply. The six that ship:

| Profile | Breadth | Depth |
|---|---|---|
| AAP Platform Engineer | 34 | 11 |
| Automation Content Engineer | 32 | 10 |
| Integration and EDA Engineer | 32 | 11 |
| Automation Software Engineer | 30 | 12 |
| Automation Reliability Engineer | 34 | 11 |
| Automation Architect / Technical Lead | 45 | 17 |

Assign a profile to an engineer and their breadth/depth are measured against it, with a list of role depth areas still below level 4.

#### Editing the framework safely

Assessments key on a skill's **id**, not its name, and assignments key on a profile's **id**, not its name — so renaming either keeps every rating and assignment attached. The editors surface impact before you commit:

| Action | What you are told, and what cascades |
|---|---|
| Edit a skill | How many engineers are already rated on it, and which role profiles name it as a depth area |
| Delete a skill | How many ratings will be hidden. The skill is also stripped from every role profile's depth areas |
| Edit a role profile | How many engineers are assigned; changing targets re-scores their role fit immediately |
| Delete a role profile | How many engineers will be unassigned. They keep all their ratings — only the target comparison stops |
| Edit a measurement threshold | Re-scores every engineer and every role fit immediately; the control shows the effect before you commit |
| Reset to preset | Restores the shipped catalog, role profiles and thresholds. Assessments are untouched |

Deleting a skill hides its ratings rather than erasing them — re-adding a skill with the same id brings them back.

---

## Working with the Skills Matrix

Six tabs under **Skills Matrix**. Each is deep-linkable — `/skills?view=gaps` opens straight to that tab.

| Tab | What it's for |
|---|---|
| **Overview** | Four derived KPIs (critical coverage, High-priority gaps, bus-factor risks, assessment completeness), capability by domain, per-person capability index |
| **Heat Map** | Every engineer × every skill, grouped into collapsible domains. Filter by domain, critical-only, below-target-only |
| **Assessment** | The rating grid: one engineer at a time, with self/reviewer/final/gap/priority/evidence per skill |
| **Gaps & Risk** | Single points of failure naming the sole owner, ranked development gaps, upskilling candidates |
| **Development** | Gaps converted to assignments — objective, experience assignment, coach, course, due date, success evidence |
| **Framework** | Full CRUD on the skill catalog and role profiles, plus role assignment |

### Assessment grid

![Assessment tab](public/docs/skills-assessment.png)

Self and reviewer ratings are captured separately; the reviewer's rating wins where both exist. Edits are held as a draft until you press **Save**, so you can work a whole domain and commit once. The Target column is editable per row when someone's role legitimately needs more or less than the catalog default.

### Gaps and risk

![Gaps and Risk tab](public/docs/skills-gaps.png)

"Only James Wilson" means exactly that — if James is unavailable, that capability leaves with him. "No depth owner" is worse: nobody on the team owns it at all.

---

## Excel round-trip

Assess in the app or in the spreadsheet — the two stay in sync.

**Export** writes an eight-sheet workbook mirroring the reference model: *Read Me, Skill Catalog, Assessment, Team Summary, Role Profiles, Scoring Guide, Development Plan, Sources*. It carries both live values **and** working formulas, so it doubles as a standalone offline template — hand it to a manager with no app access and their edits still calculate.

```
Assessment!L   =IF(K5<>"",K5,IF(J5<>"",J5,""))                    # Final rating
Assessment!M   =IF(OR(L5="",I5=""),"",MAX(0,I5-L5))               # Gap
Assessment!O   =IF(M5="","",IF(AND(H5="Yes",M5>=2),"High", …))    # Priority
Team Summary   COUNTIFS / AVERAGEIFS rollups over the Assessment sheet
```

**Import** reads a filled Assessment sheet back in, matching rows on **Skill ID + employee name**, and shows a reviewable diff before anything is written:

![Import review dialog](public/docs/import-review.png)

Unmatched employee names and unknown skill IDs are reported rather than silently skipped. Catalog changes (criticality, target, weight) are applied via a separate checkbox, so you can take ratings without taking target changes.

`exceljs` is loaded dynamically, so it stays out of the initial bundle.

The **Reports** page also exports a flat `skills-readiness` CSV with domain, criticality, target, self, reviewer, final, gap, priority and evidence per row.

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

- **Frontend**: Next.js 14 (App Router), Tailwind CSS, Recharts, ExcelJS
- **Backend**: FastAPI (Python 3.12), SQLAlchemy (async), Pydantic v2
- **Database**: PostgreSQL 16 · **Cache**: Redis 7
- **Auth**: Microsoft Entra ID (MSAL) + JWT · **AI**: Azure OpenAI / OpenAI GPT-4

> **Note:** the Skills Matrix is currently frontend-only and persists to browser storage. The backend's `skills` router is still stubbed, and `database/schema.sql` reflects the older four-level skill model. Everything documented above works without the backend running.

### Where your data lives

| localStorage key | Contents |
|---|---|
| `asi-employees-v2` | Engineers, skill assessments, development plans |
| `asi-skill-catalog` | Your edited catalog (absent until you change something) |
| `asi-role-profiles` | Your edited role profiles (absent until you change something) |
| `asi-skill-thresholds` | Your breadth / coverage / depth threshold levels (absent until you change them) |
| `asi-skill-migration-v2` | Marker showing the one-time upgrade from the pre-catalog format has run |

Assessments are **not synced to a server** — they live in the browser profile you entered them in. Export the workbook at the end of each cycle; that file is your record and your backup.

Upgrading from an earlier version? Ratings on the old four-level scale migrate automatically on first load: Beginner → 1, Intermediate → 2, Advanced → 3, Expert → 4, leaving level 5 as new headroom. Skills with no catalog equivalent are preserved as custom catalog entries rather than dropped.

---

## Project structure

```
team_insight/
├── app/
│   ├── page.tsx                    # Dashboard
│   ├── guide/                      # 📖 In-app user guide
│   ├── skills/                     # Skills Matrix (tab host, deep-linkable via ?view=)
│   ├── employees/                  # Team profiles + read-only shared view
│   ├── goals/  projects/  notes/   # Goal, project and coaching-note tracking
│   ├── insights/  reports/         # AI insights, report export
│   ├── degreed/  admin/            # Degreed LXP integration, admin settings
├── components/
│   ├── skills/                     # Assessment UI
│   │   ├── SkillOverview.tsx       #   derived KPIs, domain rollup, capability index
│   │   ├── AssessmentGrid.tsx      #   the rating grid
│   │   ├── GapAnalysis.tsx         #   bus-factor + gap ranking + upskill candidates
│   │   ├── DevelopmentPlan.tsx     #   gap → assignment
│   │   ├── CatalogEditor.tsx       #   catalog CRUD + role profiles
│   │   ├── SkillEditorModal.tsx    #   create / edit / delete a catalog skill
│   │   ├── RoleProfileModal.tsx    #   create / edit / delete a role profile
│   │   ├── ThresholdSettings.tsx   #   breadth / coverage / depth levels, with live impact
│   │   ├── ScoringGuide.tsx        #   the rubric, reachable everywhere
│   │   ├── ImportPreviewModal.tsx  #   review-before-write import diff
│   │   └── LevelPicker.tsx         #   the one 0–5 rating control
│   ├── guide/                      # Documentation page primitives
│   ├── charts/                     # SkillsHeatmap, SkillsRadar, Recharts visualisations
│   ├── layout/  ui/  employees/    # Header/Sidebar, design system, employee cards
├── lib/
│   ├── skill-catalog.ts            # 69 skills, 6 anchors, 6 role profiles, sources
│   ├── skill-analytics.ts          # every derived measure, as pure functions
│   ├── skill-workbook.ts           # Excel export + import
│   ├── skill-catalog-store.tsx     # editable catalog (localStorage)
│   ├── skill-migration.ts          # one-time upgrade from the pre-catalog model
│   ├── seed-assessments.ts         # demo ratings for the ten seeded engineers
│   ├── employee-store.tsx          # employee + assessment state
│   ├── types.ts  utils.ts          # shared types; level math and colour helpers
├── public/docs/                    # User-guide screenshots
├── backend/                        # FastAPI service (see Architecture note above)
├── database/schema.sql
└── docker-compose.yml
```

---

## Degreed integration

Team Insight integrates with the [Degreed API v2](https://developer.degreed.com) to pull learning and skills data into your team view.

1. Obtain API credentials from your Degreed Technical Admin (Client ID + Secret).
2. In Team Insight, go to **Admin → Integrations → Degreed**, or set the environment variables above.
3. Required OAuth scopes: `users:read`, `user_skills:read`, `skill_ratings:read`, `skill_plans:read`, `required_learning:read`, `completions:read`.

| Data | Degreed endpoint | Team Insight view |
|---|---|---|
| Team skill ratings | `GET /api/v2/skill-ratings` | Degreed → Skill Ratings |
| User skills / focus skills | `GET /api/v2/user-skills` | Degreed → Team Skills |
| Skill plans (assignments) | `GET /api/v2/skill-plans` | Degreed → Assignments |
| Required learning | `GET /api/v2/required-learning` | Degreed → Assignments |
| Skill insights (aggregated) | Aggregated from ratings | Degreed → Insights |
| Skill ratings breakdown | `GET /api/v2/users/{id}/skill-ratings` | Degreed → Breakdown |

> Degreed data is currently a **parallel view**, not a feed into the Skills Matrix. Degreed uses its own 5-level scale with no employee↔Degreed-user mapping; wiring its `organization-skills` taxonomy and ratings into the catalog is the natural next integration.

---

## Environment variables

| Variable | Required | Description |
|---|---|---|
| `DB_USER` | Yes¹ | PostgreSQL username |
| `DB_PASSWORD` | Yes¹ | PostgreSQL password |
| `AZURE_TENANT_ID` | Yes¹ | Azure/Entra ID tenant |
| `AZURE_CLIENT_ID` | Yes¹ | Azure app client ID |
| `AZURE_CLIENT_SECRET` | Yes¹ | Azure app client secret |
| `OPENAI_API_KEY` | Yes¹˒² | OpenAI API key |
| `AZURE_OPENAI_ENDPOINT` | No | Azure OpenAI endpoint (replaces OpenAI) |
| `JWT_SECRET_KEY` | Yes¹ | Secret for signing JWTs |
| `NEXTAUTH_SECRET` | Yes¹ | NextAuth.js session secret |
| `NEXT_PUBLIC_API_URL` | No | Backend base URL (default `http://localhost:8000`) |
| `DEGREED_CLIENT_ID` | No | Degreed OAuth client ID |
| `DEGREED_CLIENT_SECRET` | No | Degreed OAuth client secret |
| `DEGREED_ORG` | No | Your Degreed organization subdomain |
| `DEGREED_BASE_URL` | No | Degreed API base (default `https://api.degreed.com`) |
| `DEGREED_AUTH_URL` | No | Degreed OAuth token URL |
| `ENVIRONMENT` | No | `development` or `production` |

¹ Backend only — not needed for the frontend-only Quick start.  ² Or Azure OpenAI.

---

## API endpoints

| Method | Path | Description |
|---|---|---|
| `GET` | `/api/health` | Health check |
| `GET` | `/api/v1/team/metrics` | Aggregated team metrics |
| `POST` | `/api/v1/auth/token` | Exchange Entra token for JWT |
| `GET` | `/api/v1/employees` | List team members |
| `GET/POST` | `/api/v1/goals` | Goals CRUD |
| `GET` | `/api/v1/skills/matrix` | Full skills heat map data *(stub)* |
| `GET` | `/api/v1/skills/gaps` | Team skill gap analysis *(stub)* |
| `GET` | `/api/v1/insights` | AI-generated insights |
| `GET` | `/api/v1/notes` | Director coaching notes |
| `GET` | `/api/v1/reports` | Report generation |
| `GET` | `/api/v1/degreed/status` | Degreed connection status |
| `GET` | `/api/v1/degreed/team/skills` | Team skills from Degreed |
| `GET` | `/api/v1/degreed/team/skill-ratings` | Team skill ratings |
| `GET` | `/api/v1/degreed/team/focus-skills` | Focus/target skills |
| `GET` | `/api/v1/degreed/team/assignments` | Required learning/assignments |
| `GET` | `/api/v1/degreed/team/insights` | Aggregated skill insights |
| `GET` | `/api/v1/degreed/users/{user_id}/skill-ratings` | Per-user ratings breakdown |
| `POST` | `/api/v1/degreed/sync` | Trigger a Degreed data sync |

Interactive docs: [http://localhost:8000/api/docs](http://localhost:8000/api/docs).

---

## Performance scoring model

Separate from skills assessment, each employee receives a composite performance score (0–100):

| Dimension | Default weight |
|---|---|
| Goal Achievement | 30% |
| Project Contributions | 25% |
| Professional Development | 15% |
| Leadership Behaviors | 15% |
| Collaboration | 10% |
| Innovation | 5% |

Configurable per organization via **Admin → Scoring Model**.

---

## Integrations supported

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
| **Degreed** | **Skills, ratings, assignments and learning insights** |

---

## Troubleshooting

| Symptom | Cause and fix |
|---|---|
| **A skill shows a gap for a strong engineer** | Gaps are measured against *target*, not the top of the scale. Adjust the target on the Framework tab, or override it for that one person in the Assessment tab's Target column. |
| **Overview numbers look alarming** | Check the *Assessment complete* tile first. Unrated skills are excluded from averages but not from coverage and bus-factor counts, so a partly-assessed team looks worse than it is. |
| **A Final rating appears with no reviewer rating** | That's the self-rating standing in. Hover the badge to see which source it came from. |
| **Import reports unmatched employees** | Rows match on the Employee column against the name in the app, case-insensitively. Renames, middle initials or trailing spaces break the match — the review dialog lists every one. |
| **Ratings vanished after deleting a catalog skill** | They're retained in storage but hidden, because a rating with no definition can't be interpreted. Re-adding a skill with the same ID restores them. |
| **`npm run lint` prompts to configure ESLint** | No ESLint config is committed. Use `npx tsc --noEmit` for type checking, or run the prompt once to create a config. |
| **Changes to `tailwind.config.ts` don't take effect** | Restart the dev server — Tailwind config is not hot-reloaded. |

---

## License

Private — internal use only.
