"""Pydantic v2 request/response schemas."""
from pydantic import BaseModel, Field, EmailStr, ConfigDict
from typing import Optional, List
from datetime import datetime
from enum import Enum


class SkillLevel(str, Enum):
    BEGINNER = "Beginner"
    INTERMEDIATE = "Intermediate"
    ADVANCED = "Advanced"
    EXPERT = "Expert"


class GoalStatus(str, Enum):
    NOT_STARTED = "Not Started"
    IN_PROGRESS = "In Progress"
    AT_RISK = "At Risk"
    COMPLETED = "Completed"
    DEFERRED = "Deferred"


class GoalPriority(str, Enum):
    LOW = "Low"
    MEDIUM = "Medium"
    HIGH = "High"
    CRITICAL = "Critical"


class GoalCategory(str, Enum):
    QUARTERLY = "Quarterly"
    ANNUAL = "Annual"
    PERSONAL_DEVELOPMENT = "Personal Development"
    ORGANIZATIONAL = "Organizational"


class NoteCategory(str, Enum):
    COACHING = "Coaching"
    RECOGNITION = "Recognition"
    LEADERSHIP_POTENTIAL = "Leadership Potential"
    PERFORMANCE_OBSERVATION = "Performance Observation"
    CAREER_ASPIRATIONS = "Career Aspirations"
    SUCCESSION_PLANNING = "Succession Planning"
    CONCERNS = "Concerns"
    FOLLOW_UP_ACTIONS = "Follow-Up Actions"


class PromotionReadiness(str, Enum):
    READY_NOW = "Ready Now"
    READY_6_MONTHS = "Ready in 6 Months"
    READY_12_MONTHS = "Ready in 12 Months"
    DEVELOPMENT_NEEDED = "Development Needed"


# ---- Skills ----

class SkillBase(BaseModel):
    name: str
    category: str
    current_level: SkillLevel
    target_level: SkillLevel

class SkillCreate(SkillBase):
    employee_id: str

class SkillUpdate(BaseModel):
    current_level: Optional[SkillLevel] = None
    target_level: Optional[SkillLevel] = None

class SkillResponse(SkillBase):
    model_config = ConfigDict(from_attributes=True)
    id: str
    employee_id: str
    score: int
    last_updated: datetime


# ---- Goals ----

class GoalBase(BaseModel):
    title: str
    description: Optional[str] = None
    strategic_alignment: Optional[str] = None
    due_date: datetime
    priority: GoalPriority
    category: GoalCategory

class GoalCreate(GoalBase):
    employee_id: str

class GoalUpdate(BaseModel):
    title: Optional[str] = None
    description: Optional[str] = None
    progress: Optional[int] = Field(None, ge=0, le=100)
    status: Optional[GoalStatus] = None
    due_date: Optional[datetime] = None
    priority: Optional[GoalPriority] = None

class GoalResponse(GoalBase):
    model_config = ConfigDict(from_attributes=True)
    id: str
    employee_id: str
    progress: int
    status: GoalStatus
    created_at: datetime
    updated_at: datetime


# ---- Projects ----

class ProjectContributionBase(BaseModel):
    project_name: str
    initiative: Optional[str] = None
    description: str
    business_impact: Optional[str] = None
    technical_impact: Optional[str] = None
    leadership_score: int = Field(ge=1, le=5)
    collaboration_score: int = Field(ge=1, le=5)
    innovation_score: int = Field(ge=1, le=5)
    date: datetime
    evidence_links: List[str] = []

class ProjectContributionCreate(ProjectContributionBase):
    employee_id: str

class ProjectContributionResponse(ProjectContributionBase):
    model_config = ConfigDict(from_attributes=True)
    id: str
    employee_id: str
    created_at: datetime


# ---- Notes ----

class DirectorNoteBase(BaseModel):
    category: NoteCategory
    title: str
    content: str
    follow_up_date: Optional[datetime] = None
    is_private: bool = True
    tags: List[str] = []

class DirectorNoteCreate(DirectorNoteBase):
    employee_id: str

class DirectorNoteUpdate(BaseModel):
    title: Optional[str] = None
    content: Optional[str] = None
    follow_up_date: Optional[datetime] = None
    tags: Optional[List[str]] = None

class DirectorNoteResponse(DirectorNoteBase):
    model_config = ConfigDict(from_attributes=True)
    id: str
    employee_id: str
    author_id: str
    author_name: str
    created_at: datetime
    updated_at: datetime


# ---- Performance Score ----

class PerformanceScoreResponse(BaseModel):
    model_config = ConfigDict(from_attributes=True)
    overall: float
    goal_achievement: float
    project_contributions: float
    professional_development: float
    leadership_behaviors: float
    collaboration: float
    innovation: float
    growth_score: float
    leadership_readiness: float
    promotion_readiness: float
    trend: str
    last_calculated: datetime


# ---- Employee ----

class EmployeeBase(BaseModel):
    name: str
    title: str
    level: Optional[str] = None
    department: Optional[str] = None
    location: Optional[str] = None
    email: EmailStr
    employee_id: str
    bio: Optional[str] = None
    career_aspirations: Optional[str] = None
    is_high_potential: bool = False
    needs_coaching: bool = False
    tags: List[str] = []

class EmployeeCreate(EmployeeBase):
    manager_id: Optional[str] = None
    hire_date: Optional[datetime] = None

class EmployeeUpdate(BaseModel):
    title: Optional[str] = None
    level: Optional[str] = None
    department: Optional[str] = None
    location: Optional[str] = None
    bio: Optional[str] = None
    career_aspirations: Optional[str] = None
    is_high_potential: Optional[bool] = None
    needs_coaching: Optional[bool] = None
    promotion_readiness: Optional[PromotionReadiness] = None
    tags: Optional[List[str]] = None

class EmployeeSummary(BaseModel):
    model_config = ConfigDict(from_attributes=True)
    id: str
    name: str
    title: str
    level: Optional[str]
    department: Optional[str]
    email: str
    employee_id: str
    is_high_potential: bool
    needs_coaching: bool
    promotion_readiness: Optional[PromotionReadiness]
    overall_score: Optional[float] = None
    tags: List[str]

class EmployeeDetail(EmployeeBase):
    model_config = ConfigDict(from_attributes=True)
    id: str
    hire_date: Optional[datetime]
    manager_id: Optional[str]
    manager_name: Optional[str] = None
    promotion_readiness: Optional[PromotionReadiness]
    skills: List[SkillResponse] = []
    goals: List[GoalResponse] = []
    performance_score: Optional[PerformanceScoreResponse] = None
    created_at: datetime


# ---- AI Insights ----

class AIQuery(BaseModel):
    question: str
    context: Optional[dict] = None
    employee_ids: Optional[List[str]] = None

class AIInsightResponse(BaseModel):
    id: str
    type: str
    title: str
    summary: str
    details: str
    employees: List[str]
    severity: str
    action_items: List[str]
    generated_at: datetime


# ---- Score Weights ----

class ScoreWeightConfig(BaseModel):
    goal_achievement_weight: float = Field(0.30, ge=0, le=1)
    project_contributions_weight: float = Field(0.25, ge=0, le=1)
    professional_development_weight: float = Field(0.15, ge=0, le=1)
    leadership_behaviors_weight: float = Field(0.15, ge=0, le=1)
    collaboration_weight: float = Field(0.10, ge=0, le=1)
    innovation_weight: float = Field(0.05, ge=0, le=1)

    def validate_weights(self) -> bool:
        total = (
            self.goal_achievement_weight +
            self.project_contributions_weight +
            self.professional_development_weight +
            self.leadership_behaviors_weight +
            self.collaboration_weight +
            self.innovation_weight
        )
        return abs(total - 1.0) < 0.001


# ---- Report ----

class ReportRequest(BaseModel):
    type: str
    date_range_start: datetime
    date_range_end: datetime
    employee_ids: Optional[List[str]] = None
    sections: List[str] = []
    format: str = "PDF"


# ---- Team Metrics ----

class TeamMetricsResponse(BaseModel):
    total_members: int
    team_health_score: float
    goal_completion_rate: float
    skills_growth_score: float
    promotion_ready_count: int
    needs_coaching_count: int
    active_projects: int
    completed_trainings: int


# ---- Auth ----

class TokenResponse(BaseModel):
    access_token: str
    token_type: str = "bearer"
    expires_in: int
    user_id: str
    role: str

class AzureTokenRequest(BaseModel):
    azure_token: str  # Token from Entra ID MSAL flow
