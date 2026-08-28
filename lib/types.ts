export type UserRole = 'director' | 'manager' | 'employee' | 'admin'

/**
 * Anchored proficiency scale, 0-5. The numeric level is the source of truth;
 * see PROFICIENCY_ANCHORS in `lib/skill-catalog.ts` for what earns each rung.
 */
export type ProficiencyLevel = 0 | 1 | 2 | 3 | 4 | 5

/** Index === ProficiencyLevel. */
export const PROFICIENCY_LABELS = [
  'Not exposed',
  'Aware',
  'Guided practitioner',
  'Independent',
  'Advanced/lead',
  'Strategic expert',
] as const

export type SkillLevel = (typeof PROFICIENCY_LABELS)[number]

/** Rating urgency derived from the gap to target and whether the skill is critical. */
export type SkillPriority = 'High' | 'Medium' | 'Low' | 'Maintain'

export type GoalStatus = 'Not Started' | 'In Progress' | 'At Risk' | 'Completed' | 'Deferred'

export type GoalPriority = 'Low' | 'Medium' | 'High' | 'Critical'

export type GoalCategory = 'Quarterly' | 'Annual' | 'Personal Development' | 'Organizational'

export type PromotionReadiness = 'Ready Now' | 'Ready in 6 Months' | 'Ready in 12 Months' | 'Development Needed'

export type NoteCategory =
  | 'Coaching'
  | 'Recognition'
  | 'Leadership Potential'
  | 'Performance Observation'
  | 'Career Aspirations'
  | 'Succession Planning'
  | 'Concerns'
  | 'Follow-Up Actions'

/**
 * One person's rating against one catalog skill.
 *
 * Nothing here is denormalized: name, domain, criticality, target and weight all
 * resolve through `skillId` into the catalog, so renaming or re-weighting a skill
 * is a single edit rather than a rewrite of every employee.
 */
export interface SkillAssessment {
  /** FK -> SkillDefinition.id */
  skillId: string
  selfRating?: ProficiencyLevel
  reviewerRating?: ProficiencyLevel
  /** Overrides the catalog target for this person only. */
  targetOverride?: ProficiencyLevel
  evidence?: string
  evidenceUrl?: string
  assessedAt?: string
  assessedBy?: string
}

/** A gap converted into work. Mirrors the workbook's Development Plan sheet. */
export interface DevelopmentPlanItem {
  id: string
  employeeId: string
  skillId: string
  objective: string
  experienceAssignment: string
  coach: string
  course: string
  dueDate: string
  successEvidence: string
  status: 'Planned' | 'In Progress' | 'Complete'
  createdAt: string
  /** Optional link into the existing goal model. */
  linkedGoalId?: string
}

export interface Goal {
  id: string
  employeeId: string
  title: string
  description: string
  strategicAlignment: string
  dueDate: string
  priority: GoalPriority
  progress: number
  status: GoalStatus
  category: GoalCategory
  createdAt: string
  updatedAt: string
}

export interface ProjectContribution {
  id: string
  employeeId: string
  projectName: string
  initiative: string
  description: string
  businessImpact: string
  technicalImpact: string
  leadershipScore: number // 1-5
  collaborationScore: number // 1-5
  innovationScore: number // 1-5
  date: string
  evidenceLinks: string[]
}

export interface Certification {
  id: string
  name: string
  provider: string
  dateEarned: string
  expirationDate?: string
  credentialId?: string
}

export interface Training {
  id: string
  courseName: string
  platform: string
  status: 'Completed' | 'In Progress' | 'Planned'
  completionDate?: string
  hoursCompleted?: number
}

export interface Conference {
  id: string
  eventName: string
  date: string
  role: 'Attendee' | 'Speaker' | 'Panelist'
  keyLearnings: string
}

export interface MentoringRelation {
  id: string
  type: 'Mentor' | 'Mentee'
  partnerName: string
  startDate: string
  endDate?: string
  outcomes: string
  active: boolean
}

export interface ProfessionalDevelopment {
  certifications: Certification[]
  training: Training[]
  conferences: Conference[]
  mentoring: MentoringRelation[]
}

export interface DirectorNote {
  id: string
  employeeId: string
  authorId: string
  authorName: string
  category: NoteCategory
  title: string
  content: string
  createdAt: string
  updatedAt: string
  followUpDate?: string
  isPrivate: boolean
  tags: string[]
}

export interface PerformanceScore {
  overall: number
  goalAchievement: number
  projectContributions: number
  professionalDevelopment: number
  leadershipBehaviors: number
  collaboration: number
  innovation: number
  growthScore: number
  leadershipReadiness: number
  promotionReadiness: number
  trend: 'up' | 'down' | 'stable'
  lastCalculated: string
}

export interface Accomplishment {
  id: string
  title: string
  description: string
  date: string
  impact: string
  category: 'Technical' | 'Leadership' | 'Collaboration' | 'Innovation' | 'Other'
  recognizedBy?: string
}

export interface Employee {
  id: string
  name: string
  title: string
  level: string // L3, L4, L5, L6, etc.
  department: string
  managerId: string
  managerName: string
  hireDate: string
  location: string
  email: string
  employeeId: string
  avatar?: string
  bio: string
  careerAspirations: string
  skills: SkillAssessment[]
  /** FK -> RoleProfile.id. Drives breadth/depth expectations. */
  roleProfileId?: string
  developmentPlan?: DevelopmentPlanItem[]
  goals: Goal[]
  projectContributions: ProjectContribution[]
  development: ProfessionalDevelopment
  notes: DirectorNote[]
  performanceScore: PerformanceScore
  promotionReadiness: PromotionReadiness
  isHighPotential: boolean
  needsCoaching: boolean
  tags: string[]
  accomplishments?: Accomplishment[]
}

export interface TeamMetrics {
  totalMembers: number
  teamHealthScore: number
  goalCompletionRate: number
  skillsGrowthScore: number
  promotionReadyCount: number
  needsCoachingCount: number
  activeProjects: number
  completedTrainings: number
}

export interface GoalTrend {
  month: string
  completed: number
  inProgress: number
  atRisk: number
  total: number
}

export interface AIMessage {
  id: string
  role: 'user' | 'assistant'
  content: string
  timestamp: string
}

export interface AIInsight {
  id: string
  type: 'promotion' | 'coaching' | 'risk' | 'opportunity' | 'team'
  title: string
  summary: string
  details: string
  employees: string[]
  severity: 'info' | 'warning' | 'success' | 'critical'
  actionItems: string[]
  generatedAt: string
}

export interface ReportConfig {
  type: 'manager' | 'executive'
  title: string
  dateRange: { start: string; end: string }
  includeEmployees: string[]
  sections: string[]
  format: 'PDF' | 'Excel' | 'PowerPoint'
}
