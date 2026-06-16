"""
Performance Evaluation Engine.
Calculates composite performance scores using configurable weights.
"""
from dataclasses import dataclass
from typing import Optional


@dataclass
class ScoreWeights:
    goal_achievement: float = 0.30
    project_contributions: float = 0.25
    professional_development: float = 0.15
    leadership_behaviors: float = 0.15
    collaboration: float = 0.10
    innovation: float = 0.05

    def validate(self) -> bool:
        total = sum([
            self.goal_achievement,
            self.project_contributions,
            self.professional_development,
            self.leadership_behaviors,
            self.collaboration,
            self.innovation,
        ])
        return abs(total - 1.0) < 0.001


def calculate_goal_achievement_score(goals: list) -> float:
    """
    Score based on:
    - % goals completed (50%)
    - Average progress on active goals (30%)
    - Priority weighting — Critical/High goals count more (20%)
    """
    if not goals:
        return 50.0  # Neutral score if no goals

    priority_weights = {"Critical": 1.5, "High": 1.2, "Medium": 1.0, "Low": 0.8}
    active_goals = [g for g in goals if g["status"] != "Deferred"]

    if not active_goals:
        return 50.0

    # Completion score
    completed = sum(1 for g in active_goals if g["status"] == "Completed")
    completion_rate = completed / len(active_goals)

    # Weighted progress
    total_weight = sum(priority_weights.get(g["priority"], 1.0) for g in active_goals)
    weighted_progress = sum(
        (g["progress"] / 100) * priority_weights.get(g["priority"], 1.0)
        for g in active_goals
    ) / total_weight if total_weight > 0 else 0

    # Risk penalty
    at_risk = sum(1 for g in active_goals if g["status"] == "At Risk")
    risk_penalty = (at_risk / len(active_goals)) * 0.15

    raw_score = (completion_rate * 0.5 + weighted_progress * 0.5 - risk_penalty) * 100
    return max(0, min(100, round(raw_score)))


def calculate_project_contribution_score(contributions: list) -> float:
    """Score based on recency-weighted average of leadership, collaboration, and innovation scores."""
    if not contributions:
        return 50.0

    import math
    from datetime import datetime

    now = datetime.now()
    total_weight = 0
    weighted_sum = 0

    for contrib in contributions:
        # Recency weight: more recent = higher weight (exponential decay over 12 months)
        try:
            contrib_date = datetime.fromisoformat(str(contrib.get("date", now)))
            months_ago = (now - contrib_date).days / 30
            recency_weight = math.exp(-months_ago / 12)
        except Exception:
            recency_weight = 1.0

        avg_score = (
            contrib.get("leadership_score", 3) +
            contrib.get("collaboration_score", 3) +
            contrib.get("innovation_score", 3)
        ) / 3

        weighted_sum += avg_score * recency_weight
        total_weight += recency_weight

    if total_weight == 0:
        return 50.0

    raw_avg = weighted_sum / total_weight  # 1-5 scale
    return round((raw_avg / 5) * 100)


def calculate_development_score(development: dict) -> float:
    """Score professional development activity."""
    score = 50.0  # Base

    certs = development.get("certifications", [])
    training = development.get("training", [])
    conferences = development.get("conferences", [])
    mentoring = development.get("mentoring", [])

    # Recent certifications (last 24 months)
    recent_certs = len([c for c in certs if c])  # simplified
    score += min(recent_certs * 10, 20)

    # Completed training
    completed_training = len([t for t in training if t.get("status") == "Completed"])
    score += min(completed_training * 5, 15)

    # Conference participation
    speaking = len([c for c in conferences if c.get("role") in ("Speaker", "Panelist")])
    attending = len([c for c in conferences if c.get("role") == "Attendee"])
    score += min(speaking * 8 + attending * 3, 10)

    # Active mentoring
    active_mentoring = len([m for m in mentoring if m.get("active")])
    score += min(active_mentoring * 5, 5)

    return min(100.0, round(score))


def calculate_overall_score(
    goal_score: float,
    project_score: float,
    development_score: float,
    leadership_score: float,
    collaboration_score: float,
    innovation_score: float,
    weights: Optional[ScoreWeights] = None,
) -> float:
    """Calculate weighted composite performance score."""
    if weights is None:
        weights = ScoreWeights()

    return round(
        goal_score * weights.goal_achievement +
        project_score * weights.project_contributions +
        development_score * weights.professional_development +
        leadership_score * weights.leadership_behaviors +
        collaboration_score * weights.collaboration +
        innovation_score * weights.innovation
    )


def calculate_promotion_readiness_score(
    overall: float,
    growth_score: float,
    leadership_readiness: float,
    tenure_at_level_months: int,
    has_cross_team_influence: bool,
) -> float:
    """Composite promotion readiness score 0-100."""
    base = overall * 0.4 + growth_score * 0.3 + leadership_readiness * 0.3
    tenure_bonus = min((tenure_at_level_months / 18) * 5, 10)
    influence_bonus = 5 if has_cross_team_influence else 0
    return min(100, round(base + tenure_bonus + influence_bonus))


def score_to_promotion_readiness(score: float) -> str:
    """Map numeric readiness score to label."""
    if score >= 88:
        return "Ready Now"
    if score >= 75:
        return "Ready in 6 Months"
    if score >= 62:
        return "Ready in 12 Months"
    return "Development Needed"
