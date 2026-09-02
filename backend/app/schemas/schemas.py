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


# ---- Skill Catalog ----

class SkillDefinitionBase(BaseModel):
    domain: str
    subdomain: Optional[str] = None
    name: str
    observable_capability: Optional[str] = None
    example_evidence: Optional[str] = None
    critical: bool = False
    target_level: int = Field(ge=0, le=5)
    weight: float = 1.0

class SkillDefinitionCreate(SkillDefinitionBase):
    pass

class SkillDefinitionUpdate(BaseModel):
    domain: Optional[str] = None
    subdomain: Optional[str] = None
    name: Optional[str] = None
    observable_capability: Optional[str] = None
    example_evidence: Optional[str] = None
    critical: Optional[bool] = None
    target_level: Optional[int] = Field(None, ge=0, le=5)
    weight: Optional[float] = None

class SkillDefinitionResponse(SkillDefinitionBase):
    model_config = ConfigDict(from_attributes=True)
    id: str
    code: int
    custom: bool


# ---- Role Profiles ----

class RoleProfileBase(BaseModel):
    name: str
    primary_outcome: Optional[str] = None
    depth_areas: Optional[str] = None
    working_breadth: Optional[str] = None
    ai_expectation: Optional[str] = None
    evidence: Optional[str] = None
    breadth_target: int = 0
    depth_target: int = 0
    depth_skill_ids: List[str] = []

class RoleProfileCreate(RoleProfileBase):
    pass

class RoleProfileUpdate(BaseModel):
    name: Optional[str] = None
    primary_outcome: Optional[str] = None
    depth_areas: Optional[str] = None
    working_breadth: Optional[str] = None
    ai_expectation: Optional[str] = None
    evidence: Optional[str] = None
    breadth_target: Optional[int] = None
    depth_target: Optional[int] = None
    depth_skill_ids: Optional[List[str]] = None

class RoleProfileResponse(RoleProfileBase):
    model_config = ConfigDict(from_attributes=True)
    id: str


# ---- Skill Thresholds (single org-wide row) ----

class SkillThresholdsUpdate(BaseModel):
    breadth: Optional[int] = Field(None, ge=0, le=5)
    coverage: Optional[int] = Field(None, ge=0, le=5)
    depth: Optional[int] = Field(None, ge=0, le=5)

class SkillThresholdsResponse(BaseModel):
    model_config = ConfigDict(from_attributes=True)
    breadth: int
    coverage: int
    depth: int


# ---- Skill Assessments (employee x catalog skill) ----

class SkillAssessmentBase(BaseModel):
    self_rating: Optional[int] = Field(None, ge=0, le=5)
    reviewer_rating: Optional[int] = Field(None, ge=0, le=5)
    target_override: Optional[int] = Field(None, ge=0, le=5)
    evidence: Optional[str] = None
    evidence_url: Optional[str] = None

class SkillAssessmentUpsert(SkillAssessmentBase):
    skill_id: str

class SkillAssessmentResponse(SkillAssessmentBase):
    model_config = ConfigDict(from_attributes=True)
    id: str
    employee_id: str
    skill_id: str
    assessed_at: Optional[datetime] = None
    assessed_by: Optional[str] = None


# ---- One-on-Ones ----

class OneOnOneIDSItem(BaseModel):
    id: str
    issue: str
    discussion: str
    solve: str

class OneOnOneActionItem(BaseModel):
    id: str
    who: str
    what: str
    dueDate: Optional[str] = None
    completed: bool = False
    goalId: Optional[str] = None

class OneOnOneBase(BaseModel):
    date: datetime
    company_updates: Optional[str] = None
    scorecard_highlights: Optional[str] = None
    feedback: Optional[str] = None
    ids: List[OneOnOneIDSItem] = []
    action_items: List[OneOnOneActionItem] = []

class OneOnOneCreate(OneOnOneBase):
    employee_id: str

class OneOnOneUpdate(BaseModel):
    date: Optional[datetime] = None
    company_updates: Optional[str] = None
    scorecard_highlights: Optional[str] = None
    feedback: Optional[str] = None
    ids: Optional[List[OneOnOneIDSItem]] = None
    action_items: Optional[List[OneOnOneActionItem]] = None

class OneOnOneResponse(OneOnOneBase):
    model_config = ConfigDict(from_attributes=True)
    id: str
    employee_id: str
    created_at: datetime
    updated_at: datetime


# ---- Development Plan Items ----

class DevelopmentPlanItemBase(BaseModel):
    skill_id: str
    objective: Optional[str] = None
    experience_assignment: Optional[str] = None
    coach: Optional[str] = None
    course: Optional[str] = None
    due_date: Optional[datetime] = None
    success_evidence: Optional[str] = None
    status: str = "Planned"
    linked_goal_id: Optional[str] = None

class DevelopmentPlanItemCreate(DevelopmentPlanItemBase):
    pass

class DevelopmentPlanItemResponse(DevelopmentPlanItemBase):
    model_config = ConfigDict(from_attributes=True)
    id: str
    employee_id: str
    created_at: datetime


# ---- Accomplishments ----

class AccomplishmentBase(BaseModel):
    title: str
    description: Optional[str] = None
    date: Optional[datetime] = None
    impact: Optional[str] = None
    category: str = "Other"
    recognized_by: Optional[str] = None

class AccomplishmentCreate(AccomplishmentBase):
    pass

class AccomplishmentUpdate(BaseModel):
    title: Optional[str] = None
    description: Optional[str] = None
    date: Optional[datetime] = None
    impact: Optional[str] = None
    category: Optional[str] = None
    recognized_by: Optional[str] = None

class AccomplishmentResponse(AccomplishmentBase):
    model_config = ConfigDict(from_attributes=True)
    id: str
    employee_id: str


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

class ProjectContributionUpdate(BaseModel):
    project_name: Optional[str] = None
    initiative: Optional[str] = None
    description: Optional[str] = None
    business_impact: Optional[str] = None
    technical_impact: Optional[str] = None
    leadership_score: Optional[int] = Field(None, ge=1, le=5)
    collaboration_score: Optional[int] = Field(None, ge=1, le=5)
    innovation_score: Optional[int] = Field(None, ge=1, le=5)
    date: Optional[datetime] = None
    evidence_links: Optional[List[str]] = None

class ProjectContributionResponse(ProjectContributionBase):
    model_config = ConfigDict(from_attributes=True)
    id: str
    employee_id: str
    created_at: datetime


# ---- Professional Development (certs, training, conferences, mentoring) ----

class CertificationResponse(BaseModel):
    model_config = ConfigDict(from_attributes=True)
    id: str
    name: str
    provider: Optional[str] = None
    date_earned: Optional[datetime] = None
    expiration_date: Optional[datetime] = None
    credential_id: Optional[str] = None

class TrainingResponse(BaseModel):
    model_config = ConfigDict(from_attributes=True)
    id: str
    course_name: str
    platform: Optional[str] = None
    status: Optional[str] = None
    completion_date: Optional[datetime] = None
    hours_completed: Optional[int] = None

class ConferenceResponse(BaseModel):
    model_config = ConfigDict(from_attributes=True)
    id: str
    event_name: str
    date: Optional[datetime] = None
    role: Optional[str] = None
    key_learnings: Optional[str] = None

class MentoringRelationResponse(BaseModel):
    model_config = ConfigDict(from_attributes=True)
    id: str
    type: Optional[str] = None
    partner_name: Optional[str] = None
    start_date: Optional[datetime] = None
    end_date: Optional[datetime] = None
    outcomes: Optional[str] = None
    active: bool = True

class ProfessionalDevelopmentResponse(BaseModel):
    certifications: List[CertificationResponse] = []
    training: List[TrainingResponse] = []
    conferences: List[ConferenceResponse] = []
    mentoring: List[MentoringRelationResponse] = []

class CertificationCreate(BaseModel):
    name: str
    provider: Optional[str] = None
    date_earned: Optional[datetime] = None
    expiration_date: Optional[datetime] = None
    credential_id: Optional[str] = None

class CertificationUpdate(BaseModel):
    name: Optional[str] = None
    provider: Optional[str] = None
    date_earned: Optional[datetime] = None
    expiration_date: Optional[datetime] = None
    credential_id: Optional[str] = None

class TrainingCreate(BaseModel):
    course_name: str
    platform: Optional[str] = None
    status: Optional[str] = None
    completion_date: Optional[datetime] = None
    hours_completed: Optional[int] = None

class TrainingUpdate(BaseModel):
    course_name: Optional[str] = None
    platform: Optional[str] = None
    status: Optional[str] = None
    completion_date: Optional[datetime] = None
    hours_completed: Optional[int] = None

class ConferenceCreate(BaseModel):
    event_name: str
    date: Optional[datetime] = None
    role: Optional[str] = None
    key_learnings: Optional[str] = None

class ConferenceUpdate(BaseModel):
    event_name: Optional[str] = None
    date: Optional[datetime] = None
    role: Optional[str] = None
    key_learnings: Optional[str] = None

class MentoringRelationCreate(BaseModel):
    type: Optional[str] = None
    partner_name: Optional[str] = None
    start_date: Optional[datetime] = None
    end_date: Optional[datetime] = None
    outcomes: Optional[str] = None
    active: bool = True

class MentoringRelationUpdate(BaseModel):
    type: Optional[str] = None
    partner_name: Optional[str] = None
    start_date: Optional[datetime] = None
    end_date: Optional[datetime] = None
    outcomes: Optional[str] = None
    active: Optional[bool] = None


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
    role_profile_id: Optional[str] = None

class EmployeeUpdate(BaseModel):
    name: Optional[str] = None
    title: Optional[str] = None
    level: Optional[str] = None
    department: Optional[str] = None
    location: Optional[str] = None
    email: Optional[EmailStr] = None
    hire_date: Optional[datetime] = None
    bio: Optional[str] = None
    career_aspirations: Optional[str] = None
    is_high_potential: Optional[bool] = None
    needs_coaching: Optional[bool] = None
    promotion_readiness: Optional[PromotionReadiness] = None
    tags: Optional[List[str]] = None
    role_profile_id: Optional[str] = None

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
    role_profile_id: Optional[str] = None
    promotion_readiness: Optional[PromotionReadiness]
    skills: List[SkillAssessmentResponse] = []
    goals: List[GoalResponse] = []
    project_contributions: List[ProjectContributionResponse] = []
    development: ProfessionalDevelopmentResponse = ProfessionalDevelopmentResponse()
    notes: List[DirectorNoteResponse] = []
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

class DevLoginRequest(BaseModel):
    """Local-development-only login bypass (see ENVIRONMENT=development)."""
    email: EmailStr
    name: str = "Dev User"
