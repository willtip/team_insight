"""SQLAlchemy ORM models."""
from sqlalchemy import (
    Column, String, Integer, Float, Boolean, DateTime, Text,
    ForeignKey, Enum, JSON, Table
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

    # Metadata
    tags = Column(JSON)  # ["SRE", "HiPo", ...]
    created_at = Column(DateTime, server_default=func.now())
    updated_at = Column(DateTime, server_default=func.now(), onupdate=func.now())

    # Relationships
    user = relationship("User", back_populates="employee")
    manager = relationship("Employee", remote_side=[id], backref="reports")
    skills = relationship("Skill", back_populates="employee", cascade="all, delete-orphan")
    goals = relationship("Goal", back_populates="employee", cascade="all, delete-orphan")
    project_contributions = relationship("ProjectContribution", back_populates="employee")
    certifications = relationship("Certification", back_populates="employee")
    training_records = relationship("Training", back_populates="employee")
    conferences = relationship("Conference", back_populates="employee")
    mentoring_relations = relationship("MentoringRelation", foreign_keys="MentoringRelation.employee_id")
    director_notes = relationship("DirectorNote", back_populates="employee")
    performance_score = relationship("PerformanceScore", back_populates="employee", uselist=False)


class Skill(Base):
    __tablename__ = "skills"

    id = Column(String, primary_key=True, default=generate_uuid)
    employee_id = Column(String, ForeignKey("employees.id"), nullable=False, index=True)
    name = Column(String, nullable=False)
    category = Column(String)
    current_level = Column(Enum(SkillLevelEnum))
    target_level = Column(Enum(SkillLevelEnum))
    score = Column(Integer, default=0)  # 1-4 mapped from level
    last_updated = Column(DateTime, server_default=func.now())

    employee = relationship("Employee", back_populates="skills")


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
    employee_id = Column(String, ForeignKey("employees.id"), nullable=False, index=True)
    project_name = Column(String, nullable=False)
    initiative = Column(String)
    description = Column(Text)
    business_impact = Column(Text)
    technical_impact = Column(Text)
    leadership_score = Column(Integer)  # 1-5
    collaboration_score = Column(Integer)
    innovation_score = Column(Integer)
    date = Column(DateTime)
    evidence_links = Column(JSON)  # list of URLs
    created_at = Column(DateTime, server_default=func.now())

    employee = relationship("Employee", back_populates="project_contributions")


class Certification(Base):
    __tablename__ = "certifications"

    id = Column(String, primary_key=True, default=generate_uuid)
    employee_id = Column(String, ForeignKey("employees.id"), nullable=False, index=True)
    name = Column(String, nullable=False)
    provider = Column(String)
    date_earned = Column(DateTime)
    expiration_date = Column(DateTime, nullable=True)
    credential_id = Column(String, nullable=True)

    employee = relationship("Employee", back_populates="certifications")


class Training(Base):
    __tablename__ = "training_records"

    id = Column(String, primary_key=True, default=generate_uuid)
    employee_id = Column(String, ForeignKey("employees.id"), nullable=False, index=True)
    course_name = Column(String, nullable=False)
    platform = Column(String)
    status = Column(String)  # Completed, In Progress, Planned
    completion_date = Column(DateTime, nullable=True)
    hours_completed = Column(Integer, nullable=True)

    employee = relationship("Employee", back_populates="training_records")


class Conference(Base):
    __tablename__ = "conferences"

    id = Column(String, primary_key=True, default=generate_uuid)
    employee_id = Column(String, ForeignKey("employees.id"), nullable=False, index=True)
    event_name = Column(String, nullable=False)
    date = Column(DateTime)
    role = Column(String)  # Attendee, Speaker, Panelist
    key_learnings = Column(Text)

    employee = relationship("Employee", back_populates="conferences")


class MentoringRelation(Base):
    __tablename__ = "mentoring_relations"

    id = Column(String, primary_key=True, default=generate_uuid)
    employee_id = Column(String, ForeignKey("employees.id"), nullable=False)
    type = Column(String)  # Mentor, Mentee
    partner_name = Column(String)
    start_date = Column(DateTime)
    end_date = Column(DateTime, nullable=True)
    outcomes = Column(Text)
    active = Column(Boolean, default=True)


class DirectorNote(Base):
    __tablename__ = "director_notes"

    id = Column(String, primary_key=True, default=generate_uuid)
    employee_id = Column(String, ForeignKey("employees.id"), nullable=False, index=True)
    author_id = Column(String, ForeignKey("users.id"), nullable=False)
    category = Column(Enum(NoteCategoryEnum), nullable=False)
    title = Column(String, nullable=False)
    content = Column(Text, nullable=False)
    follow_up_date = Column(DateTime, nullable=True)
    is_private = Column(Boolean, default=True)
    tags = Column(JSON)  # list of tag strings
    created_at = Column(DateTime, server_default=func.now())
    updated_at = Column(DateTime, server_default=func.now(), onupdate=func.now())

    employee = relationship("Employee", back_populates="director_notes")
    author = relationship("User")


class PerformanceScore(Base):
    __tablename__ = "performance_scores"

    id = Column(String, primary_key=True, default=generate_uuid)
    employee_id = Column(String, ForeignKey("employees.id"), unique=True, nullable=False)

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
