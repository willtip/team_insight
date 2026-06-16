export type UserRole = 'director' | 'manager' | 'employee' | 'admin'

export type SkillLevel = 'Beginner' | 'Intermediate' | 'Advanced' | 'Expert'

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

export interface Skill {
  id: string
  name: string
  category: string
  currentLevel: SkillLevel
  targetLevel: SkillLevel
  lastUpdated: string
  score: number // 1-4 mapped from level
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
  skills: Skill[]
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

export interface SkillMatrixEntry {
  employeeName: string
  employeeId: string
  skill: string
  level: number // 0-4
  category: string
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
