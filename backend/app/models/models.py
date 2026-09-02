"""SQLAlchemy ORM models."""
from sqlalchemy import (
    Column, String, Integer, Float, Boolean, DateTime, Text,
    ForeignKey, Enum, JSON, Table, UniqueConstraint
)
from sqlalchemy.orm import relationship, declarative_base
from sqlalchemy.sql import func
import enum
import uuid

Base = declarative_base()


def generate_uuid():
    return str(uuid.uuid4())


# Enums
class SkillLevelEnum(str, enum.Enum):
    BEGINNER = "Beginner"
    INTERMEDIATE = "Intermediate"
    ADVANCED = "Advanced"
    EXPERT = "Expert"


class GoalStatusEnum(str, enum.Enum):
    NOT_STARTED = "Not Started"
    IN_PROGRESS = "In Progress"
    AT_RISK = "At Risk"
    COMPLETED = "Completed"
    DEFERRED = "Deferred"


class GoalPriorityEnum(str, enum.Enum):
    LOW = "Low"
    MEDIUM = "Medium"
    HIGH = "High"
    CRITICAL = "Critical"


class GoalCategoryEnum(str, enum.Enum):
    QUARTERLY = "Quarterly"
    ANNUAL = "Annual"
    PERSONAL_DEVELOPMENT = "Personal Development"
    ORGANIZATIONAL = "Organizational"


class PromotionReadinessEnum(str, enum.Enum):
    READY_NOW = "Ready Now"
    READY_6_MONTHS = "Ready in 6 Months"
    READY_12_MONTHS = "Ready in 12 Months"
    DEVELOPMENT_NEEDED = "Development Needed"


class NoteCategoryEnum(str, enum.Enum):
    COACHING = "Coaching"
    RECOGNITION = "Recognition"
    LEADERSHIP_POTENTIAL = "Leadership Potential"
    PERFORMANCE_OBSERVATION = "Performance Observation"
    CAREER_ASPIRATIONS = "Career Aspirations"
    SUCCESSION_PLANNING = "Succession Planning"
    CONCERNS = "Concerns"
    FOLLOW_UP_ACTIONS = "Follow-Up Actions"


class UserRoleEnum(str, enum.Enum):
    DIRECTOR = "director"
    MANAGER = "manager"
    EMPLOYEE = "employee"
    ADMIN = "admin"


class User(Base):
    __tablename__ = "users"

    id = Column(String, primary_key=True, default=generate_uuid)
    email = Column(String, unique=True, nullable=False, index=True)
    name = Column(String, nullable=False)
    role = Column(Enum(UserRoleEnum), nullable=False, default=UserRoleEnum.EMPLOYEE)
    azure_oid = Column(String, unique=True, index=True)  # Entra ID object ID
    is_active = Column(Boolean, default=True)
    created_at = Column(DateTime, server_default=func.now())
    updated_at = Column(DateTime, server_default=func.now(), onupdate=func.now())

    employee = relationship("Employee", back_populates="user", uselist=False)


class Employee(Base):
    __tablename__ = "employees"

    id = Column(String, primary_key=True, default=generate_uuid)
    user_id = Column(String, ForeignKey("users.id"), unique=True)
    employee_id = Column(String, unique=True, index=True)  # ENG-XXXX

    # Personal info
    name = Column(String, nullable=False)
    title = Column(String, nullable=False)
    level = Column(String)  # L3, L4, L5, L6
    department = Column(String)
    manager_id = Column(String, ForeignKey("employees.id"), nullable=True)
    hire_date = Column(DateTime)
    location = Column(String)
    email = Column(String)
    bio = Column(Text)
    career_aspirations = Column(Text)

    # Flags
    is_high_potential = Column(Boolean, default=False)
    needs_coaching = Column(Boolean, default=False)
    promotion_readiness = Column(Enum(PromotionReadinessEnum))
    role_profile_id = Column(String, ForeignKey("role_profiles.id"), nullable=True)

    # Metadata
    tags = Column(JSON, default=list)  # ["SRE", "HiPo", ...]
    created_at = Column(DateTime, server_default=func.now())
    updated_at = Column(DateTime, server_default=func.now(), onupdate=func.now())

    # Relationships
    user = relationship("User", back_populates="employee")
    manager = relationship("Employee", remote_side=[id], backref="reports")
    role_profile = relationship("RoleProfile", back_populates="employees")
    skills = relationship("SkillAssessment", back_populates="employee", cascade="all, delete-orphan")
    goals = relationship("Goal", back_populates="employee", cascade="all, delete-orphan")
    project_contributions = relationship("ProjectContribution", back_populates="employee", cascade="all, delete-orphan")
    certifications = relationship("Certification", back_populates="employee", cascade="all, delete-orphan")
    training_records = relationship("Training", back_populates="employee", cascade="all, delete-orphan")
    conferences = relationship("Conference", back_populates="employee", cascade="all, delete-orphan")
    mentoring_relations = relationship("MentoringRelation", foreign_keys="MentoringRelation.employee_id", cascade="all, delete-orphan")
    director_notes = relationship("DirectorNote", back_populates="employee", cascade="all, delete-orphan")
    performance_score = relationship("PerformanceScore", back_populates="employee", uselist=False, cascade="all, delete-orphan")
    one_on_ones = relationship("OneOnOne", back_populates="employee", cascade="all, delete-orphan")
    development_plan = relationship("DevelopmentPlanItem", back_populates="employee", cascade="all, delete-orphan")
    accomplishments = relationship("Accomplishment", back_populates="employee", cascade="all, delete-orphan")


class SkillDefinition(Base):
    """Catalog of assessable capabilities, shared org-wide (not per-employee)."""
    __tablename__ = "skill_definitions"

    id = Column(String, primary_key=True)  # slug, e.g. "aap-01"
    code = Column(Integer, unique=True, nullable=False)  # workbook Skill ID
    domain = Column(String, nullable=False)
    subdomain = Column(String)
    name = Column(String, nullable=False)
    observable_capability = Column(Text)
    example_evidence = Column(Text)
    critical = Column(Boolean, default=False)
    target_level = Column(Integer, nullable=False)  # 0-5
    weight = Column(Float, default=1.0)
    custom = Column(Boolean, default=False)

    assessments = relationship("SkillAssessment", back_populates="skill")


class RoleProfile(Base):
    """Org-wide role expectations (breadth/depth targets), not per-employee."""
    __tablename__ = "role_profiles"

    id = Column(String, primary_key=True)  # slug, e.g. "staff-engineer"
    name = Column(String, nullable=False)
    primary_outcome = Column(Text)
    depth_areas = Column(Text)
    working_breadth = Column(Text)
    ai_expectation = Column(Text)
    evidence = Column(Text)
    breadth_target = Column(Integer, default=0)  # skills expected at level >= breadth threshold
    depth_target = Column(Integer, default=0)  # skills expected at level >= depth threshold
    depth_skill_ids = Column(JSON, default=list)  # list of skill_definitions.id

    employees = relationship("Employee", back_populates="role_profile")


class SkillThresholds(Base):
    """Single active row: org-wide breadth/coverage/depth proficiency cutoffs."""
    __tablename__ = "skill_thresholds"

    id = Column(String, primary_key=True, default=generate_uuid)
    breadth = Column(Integer, default=2)
    coverage = Column(Integer, default=3)
    depth = Column(Integer, default=4)
    is_active = Column(Boolean, default=True)


class SkillAssessment(Base):
    """One employee's rating against one catalog skill."""
    __tablename__ = "skill_assessments"
    __table_args__ = (UniqueConstraint("employee_id", "skill_id", name="uq_employee_skill"),)

    id = Column(String, primary_key=True, default=generate_uuid)
    employee_id = Column(String, ForeignKey("employees.id", ondelete="CASCADE"), nullable=False, index=True)
    skill_id = Column(String, ForeignKey("skill_definitions.id"), nullable=False, index=True)
    self_rating = Column(Integer, nullable=True)  # 0-5
    reviewer_rating = Column(Integer, nullable=True)  # 0-5
    target_override = Column(Integer, nullable=True)  # 0-5
    evidence = Column(Text, nullable=True)
    evidence_url = Column(String, nullable=True)
    assessed_at = Column(DateTime, nullable=True)
    assessed_by = Column(String, ForeignKey("users.id"), nullable=True)

    employee = relationship("Employee", back_populates="skills")
    skill = relationship("SkillDefinition", back_populates="assessments")


class OneOnOne(Base):
    """A parsed 1:1 meeting record."""
    __tablename__ = "one_on_ones"

    id = Column(String, primary_key=True, default=generate_uuid)
    employee_id = Column(String, ForeignKey("employees.id", ondelete="CASCADE"), nullable=False, index=True)
    date = Column(DateTime, nullable=False)
    company_updates = Column(Text)
    scorecard_highlights = Column(Text)
    feedback = Column(Text)
    ids = Column(JSON, default=list)  # [{id, issue, discussion, solve}]
    action_items = Column(JSON, default=list)  # [{id, who, what, dueDate, completed, goalId}]
    created_at = Column(DateTime, server_default=func.now())
    updated_at = Column(DateTime, server_default=func.now(), onupdate=func.now())

    employee = relationship("Employee", back_populates="one_on_ones")


class DevelopmentPlanStatusEnum(str, enum.Enum):
    PLANNED = "Planned"
    IN_PROGRESS = "In Progress"
    COMPLETE = "Complete"


class DevelopmentPlanItem(Base):
    __tablename__ = "development_plan_items"

    id = Column(String, primary_key=True, default=generate_uuid)
    employee_id = Column(String, ForeignKey("employees.id", ondelete="CASCADE"), nullable=False, index=True)
    skill_id = Column(String, ForeignKey("skill_definitions.id"), nullable=False)
    objective = Column(Text)
    experience_assignment = Column(Text)
    coach = Column(String)
    course = Column(String)
    due_date = Column(DateTime, nullable=True)
    success_evidence = Column(Text)
    status = Column(Enum(DevelopmentPlanStatusEnum), default=DevelopmentPlanStatusEnum.PLANNED)
    created_at = Column(DateTime, server_default=func.now())
    linked_goal_id = Column(String, ForeignKey("goals.id"), nullable=True)

    employee = relationship("Employee", back_populates="development_plan")


class AccomplishmentCategoryEnum(str, enum.Enum):
    TECHNICAL = "Technical"
    LEADERSHIP = "Leadership"
    COLLABORATION = "Collaboration"
    INNOVATION = "Innovation"
    OTHER = "Other"


class Accomplishment(Base):
    __tablename__ = "accomplishments"

    id = Column(String, primary_key=True, default=generate_uuid)
    employee_id = Column(String, ForeignKey("employees.id", ondelete="CASCADE"), nullable=False, index=True)
    title = Column(String, nullable=False)
    description = Column(Text)
    date = Column(DateTime)
    impact = Column(Text)
    category = Column(Enum(AccomplishmentCategoryEnum), default=AccomplishmentCategoryEnum.OTHER)
    recognized_by = Column(String, nullable=True)

    employee = relationship("Employee", back_populates="accomplishments")


class Goal(Base):
    __tablename__ = "goals"

    id = Column(String, primary_key=True, default=generate_uuid)
    employee_id = Column(String, ForeignKey("employees.id"), nullable=False, index=True)
    title = Column(String, nullable=False)
    description = Column(Text)
    strategic_alignment = Column(String)
    due_date = Column(DateTime)
    priority = Column(Enum(GoalPriorityEnum))
    progress = Column(Integer, default=0)
    status = Column(Enum(GoalStatusEnum), default=GoalStatusEnum.NOT_STARTED)
    category = Column(Enum(GoalCategoryEnum))
    created_at = Column(DateTime, server_default=func.now())
    updated_at = Column(DateTime, server_default=func.now(), onupdate=func.now())

    employee = relationship("Employee", back_populates="goals")


class ProjectContribution(Base):
    __tablename__ = "project_contributions"

    id = Column(String, primary_key=True, default=generate_uuid)
    employee_id = Column(String, ForeignKey("employees.id", ondelete="CASCADE"), nullable=False, index=True)
    project_name = Column(String, nullable=False)
    initiative = Column(String)
    description = Column(Text)
    business_impact = Column(Text)
    technical_impact = Column(Text)
    leadership_score = Column(Integer)  # 1-5
    collaboration_score = Column(Integer)
    innovation_score = Column(Integer)
    date = Column(DateTime)
    evidence_links = Column(JSON, default=list)  # list of URLs
    created_at = Column(DateTime, server_default=func.now())

    employee = relationship("Employee", back_populates="project_contributions")


class Certification(Base):
    __tablename__ = "certifications"

    id = Column(String, primary_key=True, default=generate_uuid)
    employee_id = Column(String, ForeignKey("employees.id", ondelete="CASCADE"), nullable=False, index=True)
    name = Column(String, nullable=False)
    provider = Column(String)
    date_earned = Column(DateTime)
    expiration_date = Column(DateTime, nullable=True)
    credential_id = Column(String, nullable=True)

    employee = relationship("Employee", back_populates="certifications")


class Training(Base):
    __tablename__ = "training_records"

    id = Column(String, primary_key=True, default=generate_uuid)
    employee_id = Column(String, ForeignKey("employees.id", ondelete="CASCADE"), nullable=False, index=True)
    course_name = Column(String, nullable=False)
    platform = Column(String)
    status = Column(String)  # Completed, In Progress, Planned
    completion_date = Column(DateTime, nullable=True)
    hours_completed = Column(Integer, nullable=True)

    employee = relationship("Employee", back_populates="training_records")


class Conference(Base):
    __tablename__ = "conferences"

    id = Column(String, primary_key=True, default=generate_uuid)
    employee_id = Column(String, ForeignKey("employees.id", ondelete="CASCADE"), nullable=False, index=True)
    event_name = Column(String, nullable=False)
    date = Column(DateTime)
    role = Column(String)  # Attendee, Speaker, Panelist
    key_learnings = Column(Text)

    employee = relationship("Employee", back_populates="conferences")


class MentoringRelation(Base):
    __tablename__ = "mentoring_relations"

    id = Column(String, primary_key=True, default=generate_uuid)
    employee_id = Column(String, ForeignKey("employees.id", ondelete="CASCADE"), nullable=False)
    type = Column(String)  # Mentor, Mentee
    partner_name = Column(String)
    start_date = Column(DateTime)
    end_date = Column(DateTime, nullable=True)
    outcomes = Column(Text)
    active = Column(Boolean, default=True)


class DirectorNote(Base):
    __tablename__ = "director_notes"

    id = Column(String, primary_key=True, default=generate_uuid)
    employee_id = Column(String, ForeignKey("employees.id", ondelete="CASCADE"), nullable=False, index=True)
    author_id = Column(String, ForeignKey("users.id"), nullable=False)
    category = Column(Enum(NoteCategoryEnum), nullable=False)
    title = Column(String, nullable=False)
    content = Column(Text, nullable=False)
    follow_up_date = Column(DateTime, nullable=True)
    is_private = Column(Boolean, default=True)
    tags = Column(JSON, default=list)  # list of tag strings
    created_at = Column(DateTime, server_default=func.now())
    updated_at = Column(DateTime, server_default=func.now(), onupdate=func.now())

    employee = relationship("Employee", back_populates="director_notes")
    author = relationship("User")


class PerformanceScore(Base):
    __tablename__ = "performance_scores"

    id = Column(String, primary_key=True, default=generate_uuid)
    employee_id = Column(String, ForeignKey("employees.id", ondelete="CASCADE"), unique=True, nullable=False)

    overall = Column(Float, default=0)
    goal_achievement = Column(Float, default=0)
    project_contributions = Column(Float, default=0)
    professional_development = Column(Float, default=0)
    leadership_behaviors = Column(Float, default=0)
    collaboration = Column(Float, default=0)
    innovation = Column(Float, default=0)
    growth_score = Column(Float, default=0)
    leadership_readiness = Column(Float, default=0)
    promotion_readiness = Column(Float, default=0)
    trend = Column(String, default="stable")  # up, down, stable
    last_calculated = Column(DateTime, server_default=func.now())

    employee = relationship("Employee", back_populates="performance_score")


class AuditLog(Base):
    __tablename__ = "audit_logs"

    id = Column(String, primary_key=True, default=generate_uuid)
    user_id = Column(String, ForeignKey("users.id"), nullable=False)
    action = Column(String, nullable=False)
    resource_type = Column(String)
    resource_id = Column(String)
    details = Column(JSON)
    ip_address = Column(String)
    created_at = Column(DateTime, server_default=func.now())


class ScoreWeightConfig(Base):
    """Configurable performance score weights per organization."""
    __tablename__ = "score_weight_configs"

    id = Column(String, primary_key=True, default=generate_uuid)
    department = Column(String, nullable=True)  # null = org-wide
    goal_achievement_weight = Column(Float, default=0.30)
    project_contributions_weight = Column(Float, default=0.25)
    professional_development_weight = Column(Float, default=0.15)
    leadership_behaviors_weight = Column(Float, default=0.15)
    collaboration_weight = Column(Float, default=0.10)
    innovation_weight = Column(Float, default=0.05)
    is_active = Column(Boolean, default=True)
    created_at = Column(DateTime, server_default=func.now())


class AssessmentImportSourceEnum(str, enum.Enum):
    XLSX = "xlsx"
    CSV = "csv"
    FORM = "form"


class AssessmentImportStatusEnum(str, enum.Enum):
    PENDING = "pending"
    APPLIED = "applied"
    DISCARDED = "discarded"


class AssessmentImportBatch(Base):
    """One upload (or form submission) of skill assessments, staged before it is written.

    Rows live in a JSON column rather than a child table: a full-team file is ~700 rows
    written once and read once, and this codebase already stores row-shaped data that way
    (OneOnOne.action_items, ProjectContribution.evidence_links, RoleProfile.depth_skill_ids).

    Staging server-side is what lets commit take a batch id instead of a client-supplied
    row list, so the browser cannot rewrite what gets written between preview and apply.
    """
    __tablename__ = "assessment_import_batches"

    id = Column(String, primary_key=True, default=generate_uuid)
    filename = Column(String)
    source = Column(Enum(AssessmentImportSourceEnum), nullable=False)
    status = Column(
        Enum(AssessmentImportStatusEnum),
        nullable=False,
        default=AssessmentImportStatusEnum.PENDING,
    )
    uploaded_by = Column(String, ForeignKey("users.id"), nullable=False, index=True)
    uploaded_at = Column(DateTime, server_default=func.now())
    applied_at = Column(DateTime, nullable=True)
    # Set when a self-assessment form was submitted on one person's behalf.
    submitted_for_employee_id = Column(
        String, ForeignKey("employees.id", ondelete="CASCADE"), nullable=True
    )
    rows_read = Column(Integer, default=0)
    rows_applied = Column(Integer, default=0)
    # Fixed-shape {status: count}. Keys are deliberately stable: the frontend api-client
    # camelCases every key at every depth, so an open-ended dict here would be rewritten.
    counts = Column(JSON, default=dict)
    warnings = Column(JSON, default=list)  # batch-level messages, not row-level
    rows = Column(JSON, default=list)  # list of resolved rows (see services/assessment_import.py)

    uploader = relationship("User", foreign_keys=[uploaded_by])
