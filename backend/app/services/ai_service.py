"""
AI Service — integrates with Azure OpenAI / OpenAI API for:
- Employee performance summaries
- Promotion readiness analysis
- Coaching recommendations
- Team health analysis
- Skill gap recommendations
"""
from typing import Optional
import json
from openai import AsyncAzureOpenAI, AsyncOpenAI

# Initialize client — uses Azure OpenAI by default, falls back to OpenAI
def get_openai_client(use_azure: bool = True):
    if use_azure:
        return AsyncAzureOpenAI(
            azure_endpoint="https://your-instance.openai.azure.com/",
            api_version="2024-02-15-preview",
        )
    return AsyncOpenAI()


SYSTEM_PROMPT = """You are Team Insight AI, an enterprise performance management assistant for engineering managers and directors.

You have access to structured performance data including:
- Employee performance scores across 6 dimensions (goal achievement, project contributions, professional development, leadership behaviors, collaboration, innovation)
- Goal completion rates, statuses, and risks
- Skills profiles with current and target levels
- Project contributions with business and technical impact
- Professional development records (certifications, training, conferences, mentoring)
- Private director coaching notes
- Historical trend data

You provide:
1. Data-driven, evidence-based insights
2. Specific, actionable recommendations with owner and timeline
3. Balanced assessments that consider the full context
4. Clear risk identification with severity ratings

You do NOT:
- Make final performance ratings (those require human judgment)
- Share confidential note content verbatim
- Make discriminatory assessments
- Speculate without data evidence

Always cite specific metrics, scores, or events when making recommendations."""


async def generate_employee_summary(
    employee_data: dict,
    period: str = "quarterly",
    client=None,
) -> str:
    """Generate a structured performance summary for a single employee."""
    if client is None:
        client = get_openai_client()

    prompt = f"""Generate a {period} performance summary for {employee_data['name']}.

Employee Data:
{json.dumps(employee_data, indent=2, default=str)}

Structure your response as:
## {period.title()} Performance Summary

**Accomplishments:**
[3-5 key accomplishments with measurable impact]

**Challenges & Growth Areas:**
[2-3 areas with constructive framing]

**Leadership & Collaboration Behaviors:**
[Specific observations with evidence]

**Development Progress:**
[Training, certifications, mentoring updates]

**Recommendations for Next {period.title()}:**
[3 specific, actionable development recommendations]

**Promotion Readiness Assessment:**
[Evidence-based assessment with timeline if applicable]"""

    response = await client.chat.completions.create(
        model="gpt-4o",
        messages=[
            {"role": "system", "content": SYSTEM_PROMPT},
            {"role": "user", "content": prompt},
        ],
        temperature=0.3,
        max_tokens=1500,
    )
    return response.choices[0].message.content


async def analyze_promotion_readiness(
    employee_data: dict,
    next_level_criteria: dict,
    client=None,
) -> dict:
    """
    Analyze promotion readiness with evidence-based reasoning.
    Returns: { readiness: str, confidence: float, evidence: [], gaps: [], timeline: str }
    """
    if client is None:
        client = get_openai_client()

    prompt = f"""Analyze promotion readiness for {employee_data['name']} (current level: {employee_data.get('level', 'unknown')}).

Employee Performance Data:
{json.dumps(employee_data, indent=2, default=str)}

Next Level Criteria:
{json.dumps(next_level_criteria, indent=2)}

Return a JSON object with:
{{
  "readiness": "Ready Now | Ready in 6 Months | Ready in 12 Months | Development Needed",
  "confidence": 0.0-1.0,
  "evidence": ["specific evidence point 1", "..."],
  "gaps": ["specific gap 1 with recommendation", "..."],
  "timeline": "specific timeline with milestones",
  "overall_assessment": "2-3 sentence summary"
}}"""

    response = await client.chat.completions.create(
        model="gpt-4o",
        messages=[
            {"role": "system", "content": SYSTEM_PROMPT},
            {"role": "user", "content": prompt},
        ],
        response_format={"type": "json_object"},
        temperature=0.2,
    )
    return json.loads(response.choices[0].message.content)


async def answer_team_question(
    question: str,
    team_data: dict,
    client=None,
) -> str:
    """
    Answer a manager's question about their team using performance data.
    Supports: coaching needs, promotion candidates, skill gaps, at-risk goals, etc.
    """
    if client is None:
        client = get_openai_client()

    prompt = f"""A manager asks: "{question}"

Team Performance Data:
{json.dumps(team_data, indent=2, default=str)}

Provide a specific, data-driven answer. Use bullet points for clarity.
Include concrete recommendations with owner and timeline where appropriate.
Reference specific engineers and metrics to support your answer."""

    response = await client.chat.completions.create(
        model="gpt-4o",
        messages=[
            {"role": "system", "content": SYSTEM_PROMPT},
            {"role": "user", "content": prompt},
        ],
        temperature=0.3,
        max_tokens=1000,
    )
    return response.choices[0].message.content


async def identify_team_insights(team_data: dict, client=None) -> list[dict]:
    """
    Proactively identify key insights about the team.
    Returns a list of insight objects sorted by severity.
    """
    if client is None:
        client = get_openai_client()

    prompt = f"""Analyze this engineering team's performance data and identify the top 5 insights that require manager attention.

Team Data:
{json.dumps(team_data, indent=2, default=str)}

Return a JSON array of insight objects:
[{{
  "type": "promotion | coaching | risk | opportunity | team",
  "title": "concise title",
  "summary": "1-2 sentence summary",
  "details": "detailed explanation with evidence",
  "employees": ["employee_id1", ...],
  "severity": "critical | warning | info | success",
  "action_items": ["specific action 1", "..."]
}}]

Sort by severity (critical first). Include only high-confidence, evidence-based insights."""

    response = await client.chat.completions.create(
        model="gpt-4o",
        messages=[
            {"role": "system", "content": SYSTEM_PROMPT},
            {"role": "user", "content": prompt},
        ],
        response_format={"type": "json_object"},
        temperature=0.2,
    )
    result = json.loads(response.choices[0].message.content)
    return result.get("insights", result) if isinstance(result, dict) else result
