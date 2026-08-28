import type { ProficiencyLevel } from './types'

/**
 * Skill framework transcribed from `Automation_Team_Skills_Assessment_Matrix_BT.xlsx`.
 *
 * The workbook is the reference model for technical assessment: a catalog of
 * observable capabilities with evidence standards, an anchored 0-5 proficiency
 * rubric, and role profiles carrying numeric breadth/depth targets.
 */

/** One assessable capability. `code` is the workbook's Skill ID, kept for round-trip. */
export interface SkillDefinition {
  id: string
  code: number
  domain: string
  subdomain: string
  name: string
  /** What "doing this" looks like in practice — shown to raters at the point of rating. */
  observableCapability: string
  /** What proof at target level looks like. */
  exampleEvidence: string
  critical: boolean
  targetLevel: ProficiencyLevel
  /** Relative importance, 1.1-1.6. Drives the weighted capability index. */
  weight: number
  /** Set on skills added in-app rather than coming from the preset. */
  custom?: boolean
}

/** A rung of the 0-5 rubric. Ratings mean nothing without these. */
export interface ProficiencyAnchor {
  level: ProficiencyLevel
  label: string
  independence: string
  scope: string
  observableBehavior: string
  evidence: string
  /** What this level contributes to team coverage — the source of the analytics thresholds. */
  coverageMeaning: string
}

export interface RoleProfile {
  id: string
  name: string
  primaryOutcome: string
  depthAreas: string
  workingBreadth: string
  aiExpectation: string
  evidence: string
  /** Skills expected at level 2 or above. */
  breadthTarget: number
  /** Skills expected at level 4 or above. */
  depthTarget: number
  /** The catalog skills that make up this role's depth areas. */
  depthSkillIds: string[]
}

/**
 * The levels at which the three coverage words start counting. These define what
 * "breadth", "coverage" and "depth" *mean*, so they are framework configuration
 * rather than constants — an organisation that considers level 3 the bar for
 * breadth is measuring something different, and should be able to say so.
 */
export interface SkillThresholds {
  /** An individual "has" a skill at this level or above. Counts toward role breadth. */
  breadth: ProficiencyLevel
  /** The team is operationally covered for a skill once somebody reaches this level. */
  coverage: ProficiencyLevel
  /** Someone is a genuine owner of a skill at this level. Counts toward role depth
   *  and drives bus-factor risk. */
  depth: ProficiencyLevel
}

/** Taken from the reference rubric's own "coverage meaning" column. */
export const DEFAULT_THRESHOLDS: SkillThresholds = {
  breadth: 2,
  coverage: 3,
  depth: 4,
}

export interface CatalogSource {
  name: string
  url: string
  relevance: string
  accessed: string
}

export const AAP_SKILL_CATALOG: SkillDefinition[] = [
  {
    id: 'aap-01', code: 1, domain: 'AAP platform engineering', subdomain: 'Architecture',
    name: 'AAP architecture and deployment topology',
    observableCapability:
      'Design controller, automation hub, EDA, database, gateways, execution and hop nodes for scale and isolation.',
    exampleEvidence: 'Architecture decision and topology review',
    critical: true, targetLevel: 4, weight: 1.6,
  },
  {
    id: 'aap-02', code: 2, domain: 'AAP platform engineering', subdomain: 'Controller',
    name: 'Automation controller administration',
    observableCapability:
      'Operate organizations, inventories, credentials, projects, templates, schedules, notifications, surveys and settings.',
    exampleEvidence: 'Production configuration and operational evidence',
    critical: true, targetLevel: 4, weight: 1.5,
  },
  {
    id: 'aap-03', code: 3, domain: 'AAP platform engineering', subdomain: 'Mesh',
    name: 'Automation mesh engineering',
    observableCapability:
      'Design and troubleshoot control, execution and hop node placement, receptor connectivity, routing and capacity.',
    exampleEvidence: 'Mesh design and failure diagnosis',
    critical: true, targetLevel: 4, weight: 1.5,
  },
  {
    id: 'aap-04', code: 4, domain: 'AAP platform engineering', subdomain: 'Execution',
    name: 'Execution environment engineering',
    observableCapability:
      'Build, version, scan and promote portable execution environment images with pinned dependencies.',
    exampleEvidence: 'Published execution environment and pipeline',
    critical: true, targetLevel: 4, weight: 1.6,
  },
  {
    id: 'aap-05', code: 5, domain: 'AAP platform engineering', subdomain: 'Content',
    name: 'Private automation hub',
    observableCapability:
      'Curate, sign, synchronize and govern collections and execution images, including disconnected environments.',
    exampleEvidence: 'Content lifecycle and promotion evidence',
    critical: true, targetLevel: 3, weight: 1.3,
  },
  {
    id: 'aap-06', code: 6, domain: 'AAP platform engineering', subdomain: 'Content',
    name: 'Ansible collections engineering',
    observableCapability:
      'Build namespaced roles, modules, plugins, documentation, tests and semantic releases as reusable collections.',
    exampleEvidence: 'Released internal collection',
    critical: true, targetLevel: 4, weight: 1.5,
  },
  {
    id: 'aap-07', code: 7, domain: 'AAP platform engineering', subdomain: 'Development',
    name: 'Playbook and role engineering',
    observableCapability:
      'Create idempotent, composable, parameterized and maintainable playbooks and roles with clear failure behavior.',
    exampleEvidence: 'Production content and review',
    critical: true, targetLevel: 4, weight: 1.6,
  },
  {
    id: 'aap-08', code: 8, domain: 'AAP platform engineering', subdomain: 'EDA',
    name: 'Event-Driven Ansible',
    observableCapability:
      'Develop rulebooks, event sources, conditions, actions, activation controls and event persistence patterns.',
    exampleEvidence: 'Production rulebook with outcome metrics',
    critical: true, targetLevel: 4, weight: 1.6,
  },
  {
    id: 'aap-09', code: 9, domain: 'AAP platform engineering', subdomain: 'API',
    name: 'AAP API and automation controller SDK',
    observableCapability:
      'Integrate and manage AAP programmatically with authentication, pagination, idempotency and error handling.',
    exampleEvidence: 'Production API integration',
    critical: true, targetLevel: 3, weight: 1.3,
  },
  {
    id: 'aap-10', code: 10, domain: 'AAP platform engineering', subdomain: 'Security',
    name: 'AAP RBAC and multi-tenancy',
    observableCapability:
      'Design organizations, teams, roles, credentials and boundaries for least privilege and delegated ownership.',
    exampleEvidence: 'Access model and recertification evidence',
    critical: true, targetLevel: 4, weight: 1.5,
  },
  {
    id: 'aap-11', code: 11, domain: 'AAP platform engineering', subdomain: 'Lifecycle',
    name: 'AAP installation, upgrades and migration',
    observableCapability:
      'Plan compatibility, backup, testing, sequencing, rollback and post-upgrade verification.',
    exampleEvidence: 'Successful upgrade or migration',
    critical: true, targetLevel: 4, weight: 1.5,
  },
  {
    id: 'aap-12', code: 12, domain: 'AAP platform engineering', subdomain: 'Reliability',
    name: 'AAP HA, backup and disaster recovery',
    observableCapability:
      'Engineer availability, database protection, restore, failover and recovery objectives.',
    exampleEvidence: 'Recovery exercise and evidence',
    critical: true, targetLevel: 4, weight: 1.5,
  },
  {
    id: 'aap-13', code: 13, domain: 'AAP platform engineering', subdomain: 'Performance',
    name: 'AAP capacity and performance engineering',
    observableCapability:
      'Analyze job mix, queueing, forks, execution capacity, database behavior and scaling limits.',
    exampleEvidence: 'Capacity plan and load test',
    critical: true, targetLevel: 3, weight: 1.3,
  },
  {
    id: 'aap-14', code: 14, domain: 'AAP platform engineering', subdomain: 'Operations',
    name: 'AAP troubleshooting and support',
    observableCapability:
      'Diagnose controller, mesh, execution environment, hub, EDA, database and integration failures.',
    exampleEvidence: 'Complex incident resolution',
    critical: true, targetLevel: 4, weight: 1.5,
  },
  {
    id: 'swe-01', code: 15, domain: 'Software engineering', subdomain: 'Python',
    name: 'Python engineering',
    observableCapability:
      'Build maintainable packages, CLIs, services, async workers, data processing and automation tooling.',
    exampleEvidence: 'Reviewed production repository',
    critical: true, targetLevel: 4, weight: 1.6,
  },
  {
    id: 'swe-02', code: 16, domain: 'Software engineering', subdomain: 'Ansible extensions',
    name: 'Custom modules and plugins',
    observableCapability:
      'Develop Python modules, inventory, filter, lookup, callback and connection plugins with stable interfaces.',
    exampleEvidence: 'Tested plugin or module',
    critical: true, targetLevel: 4, weight: 1.5,
  },
  {
    id: 'swe-03', code: 17, domain: 'Software engineering', subdomain: 'API',
    name: 'REST API and integration design',
    observableCapability:
      'Design versioned contracts, authentication, rate limits, pagination, retries, webhooks and idempotency.',
    exampleEvidence: 'Production API or integration',
    critical: true, targetLevel: 4, weight: 1.5,
  },
  {
    id: 'swe-04', code: 18, domain: 'Software engineering', subdomain: 'Services',
    name: 'Automation service engineering',
    observableCapability:
      'Build reliable workers or services around AAP for orchestration, policy, catalog and integration needs.',
    exampleEvidence: 'Production service and SLO',
    critical: false, targetLevel: 3, weight: 1.3,
  },
  {
    id: 'swe-05', code: 19, domain: 'Software engineering', subdomain: 'Design',
    name: 'Software design and architecture',
    observableCapability:
      'Apply modularity, interfaces, separation of concerns, domain models and dependency management.',
    exampleEvidence: 'Design review or refactor',
    critical: false, targetLevel: 3, weight: 1.3,
  },
  {
    id: 'swe-06', code: 20, domain: 'Software engineering', subdomain: 'Testing',
    name: 'Unit and component testing',
    observableCapability:
      'Test roles, modules, plugins and Python logic using mocks, fixtures and edge cases.',
    exampleEvidence: 'Automated test suite',
    critical: true, targetLevel: 4, weight: 1.5,
  },
  {
    id: 'swe-07', code: 21, domain: 'Software engineering', subdomain: 'Testing',
    name: 'Integration and contract testing',
    observableCapability:
      'Verify AAP, target systems, APIs, schemas, permissions and platform versions end to end.',
    exampleEvidence: 'Automated integration environment',
    critical: true, targetLevel: 4, weight: 1.5,
  },
  {
    id: 'swe-08', code: 22, domain: 'Software engineering', subdomain: 'Quality',
    name: 'Code review and static quality',
    observableCapability:
      'Apply review standards, linting, type checks, complexity limits, dependency hygiene and documentation.',
    exampleEvidence: 'Review history and quality gates',
    critical: false, targetLevel: 3, weight: 1.2,
  },
  {
    id: 'swe-09', code: 23, domain: 'Software engineering', subdomain: 'Git',
    name: 'Git and collaborative development',
    observableCapability:
      'Use branching, pull requests, ownership, tagging, releases and traceable change history.',
    exampleEvidence: 'Repository and release evidence',
    critical: false, targetLevel: 3, weight: 1.2,
  },
  {
    id: 'swe-10', code: 24, domain: 'Software engineering', subdomain: 'Packaging',
    name: 'Artifact and release engineering',
    observableCapability:
      'Create immutable, versioned, signed collections, images and packages with provenance.',
    exampleEvidence: 'Promoted release artifact',
    critical: false, targetLevel: 3, weight: 1.3,
  },
  {
    id: 'swe-11', code: 25, domain: 'Software engineering', subdomain: 'Resilience',
    name: 'Resilient automation patterns',
    observableCapability:
      'Apply timeouts, retries, jitter, idempotency, checkpoints, compensation and dead-letter handling.',
    exampleEvidence: 'Failure-mode tests',
    critical: true, targetLevel: 4, weight: 1.5,
  },
  {
    id: 'swe-12', code: 26, domain: 'Software engineering', subdomain: 'Data',
    name: 'Data modeling and serialization',
    observableCapability:
      'Validate and transform JSON, YAML, XML, CSV, schemas, encodings and configuration safely.',
    exampleEvidence: 'Schema and transformation tests',
    critical: false, targetLevel: 3, weight: 1.1,
  },
  {
    id: 'plat-01', code: 27, domain: 'Platform engineering and DevOps', subdomain: 'Linux',
    name: 'Linux systems engineering',
    observableCapability:
      'Diagnose processes, filesystems, services, permissions, packages, performance and host security.',
    exampleEvidence: 'Complex production diagnosis',
    critical: true, targetLevel: 4, weight: 1.5,
  },
  {
    id: 'plat-02', code: 28, domain: 'Platform engineering and DevOps', subdomain: 'Containers',
    name: 'Containers and image engineering',
    observableCapability:
      'Build, scan, run and troubleshoot OCI images with registries, signatures and dependency controls.',
    exampleEvidence: 'Production image lifecycle',
    critical: true, targetLevel: 4, weight: 1.4,
  },
  {
    id: 'plat-03', code: 29, domain: 'Platform engineering and DevOps', subdomain: 'Kubernetes',
    name: 'Kubernetes and OpenShift',
    observableCapability:
      'Operate workloads, operators, networking, RBAC, storage, probes and resource controls.',
    exampleEvidence: 'Production platform evidence',
    critical: true, targetLevel: 3, weight: 1.3,
  },
  {
    id: 'plat-04', code: 30, domain: 'Platform engineering and DevOps', subdomain: 'CI/CD',
    name: 'CI/CD pipeline engineering',
    observableCapability:
      'Automate lint, tests, builds, scans, packaging, promotion, deployment and rollback.',
    exampleEvidence: 'Production delivery pipeline',
    critical: true, targetLevel: 4, weight: 1.6,
  },
  {
    id: 'plat-05', code: 31, domain: 'Platform engineering and DevOps', subdomain: 'IaC',
    name: 'Terraform and infrastructure as code',
    observableCapability:
      'Build modules, plans, state, providers and environment patterns complementary to configuration automation.',
    exampleEvidence: 'Reusable production module',
    critical: true, targetLevel: 3, weight: 1.3,
  },
  {
    id: 'plat-06', code: 32, domain: 'Platform engineering and DevOps', subdomain: 'Secrets',
    name: 'Secrets and workload identity',
    observableCapability:
      'Use vaults, short-lived credentials, rotation, OIDC, least privilege and no-secret logging.',
    exampleEvidence: 'Credential design and rotation',
    critical: true, targetLevel: 4, weight: 1.5,
  },
  {
    id: 'plat-07', code: 33, domain: 'Platform engineering and DevOps', subdomain: 'Networking',
    name: 'Networking, DNS, TLS and proxies',
    observableCapability:
      'Troubleshoot connectivity, routing, certificates, load balancers, firewalls and proxies.',
    exampleEvidence: 'Cross-layer diagnosis',
    critical: true, targetLevel: 3, weight: 1.3,
  },
  {
    id: 'plat-08', code: 34, domain: 'Platform engineering and DevOps', subdomain: 'Cloud',
    name: 'Cloud platform fundamentals',
    observableCapability:
      'Automate compute, network, identity, storage, managed services, quotas and tagging through APIs.',
    exampleEvidence: 'Cloud automation use case',
    critical: true, targetLevel: 3, weight: 1.2,
  },
  {
    id: 'plat-09', code: 35, domain: 'Platform engineering and DevOps', subdomain: 'Observability',
    name: 'Platform observability',
    observableCapability:
      'Instrument AAP and automation services with logs, metrics, traces, dashboards and actionable alerts.',
    exampleEvidence: 'Operational dashboard and alerting',
    critical: true, targetLevel: 4, weight: 1.5,
  },
  {
    id: 'int-01', code: 36, domain: 'Enterprise integration', subdomain: 'ITSM',
    name: 'ServiceNow and ITSM integration',
    observableCapability:
      'Automate request, approval, change, incident, CMDB and evidence workflows with clear ownership.',
    exampleEvidence: 'Production ITSM workflow',
    critical: false, targetLevel: 3, weight: 1.3,
  },
  {
    id: 'int-02', code: 37, domain: 'Enterprise integration', subdomain: 'Events',
    name: 'Event-driven architecture',
    observableCapability:
      'Design producers, consumers, schemas, correlation, deduplication, ordering and replay.',
    exampleEvidence: 'Event-driven solution design',
    critical: true, targetLevel: 4, weight: 1.5,
  },
  {
    id: 'int-03', code: 38, domain: 'Enterprise integration', subdomain: 'Messaging',
    name: 'Message queues and Kafka',
    observableCapability:
      'Engineer durable asynchronous processing, backpressure, partitions, offsets and poison-message handling.',
    exampleEvidence: 'Load/failure tested integration',
    critical: false, targetLevel: 3, weight: 1.3,
  },
  {
    id: 'int-04', code: 39, domain: 'Enterprise integration', subdomain: 'Webhooks',
    name: 'Webhooks and callbacks',
    observableCapability:
      'Secure, validate, deduplicate and observe inbound and outbound callbacks.',
    exampleEvidence: 'Production webhook integration',
    critical: false, targetLevel: 3, weight: 1.1,
  },
  {
    id: 'int-05', code: 40, domain: 'Enterprise integration', subdomain: 'Identity',
    name: 'Enterprise identity integration',
    observableCapability:
      'Integrate SSO, LDAP, OIDC, service identities, groups and lifecycle controls.',
    exampleEvidence: 'Identity integration evidence',
    critical: false, targetLevel: 3, weight: 1.2,
  },
  {
    id: 'int-06', code: 41, domain: 'Enterprise integration', subdomain: 'Catalog',
    name: 'Self-service automation catalog',
    observableCapability:
      'Expose discoverable, policy-controlled automation through forms, APIs or portals with status and evidence.',
    exampleEvidence: 'Adopted self-service offering',
    critical: true, targetLevel: 4, weight: 1.4,
  },
  {
    id: 'int-07', code: 42, domain: 'Enterprise integration', subdomain: 'Contracts',
    name: 'Integration contracts and schema governance',
    observableCapability:
      'Version schemas and interfaces, test compatibility and manage deprecation.',
    exampleEvidence: 'Contract tests and version policy',
    critical: false, targetLevel: 3, weight: 1.2,
  },
  {
    id: 'ai-01', code: 43, domain: 'AI and agentic automation', subdomain: 'Copilot',
    name: 'AI-assisted automation development',
    observableCapability:
      'Use AI to draft playbooks, Python, tests and documentation while verifying correctness and security.',
    exampleEvidence: 'Measured, reviewed workflow',
    critical: true, targetLevel: 3, weight: 1.3,
  },
  {
    id: 'ai-02', code: 44, domain: 'AI and agentic automation', subdomain: 'Prompting',
    name: 'Prompt and context engineering',
    observableCapability:
      'Create structured instructions, examples, constraints and output schemas for reliable technical tasks.',
    exampleEvidence: 'Reusable prompt with evaluation results',
    critical: true, targetLevel: 3, weight: 1.2,
  },
  {
    id: 'ai-03', code: 45, domain: 'AI and agentic automation', subdomain: 'RAG',
    name: 'RAG and enterprise grounding',
    observableCapability:
      'Ground assistants in approved, current documentation and code with access controls, citations and freshness.',
    exampleEvidence: 'Grounded assistant prototype/evaluation',
    critical: true, targetLevel: 3, weight: 1.4,
  },
  {
    id: 'ai-04', code: 46, domain: 'AI and agentic automation', subdomain: 'Agents',
    name: 'Tool-using agent architecture',
    observableCapability:
      'Design scoped tools, plans, memory, permissions, termination, escalation and deterministic boundaries.',
    exampleEvidence: 'Bounded agent design',
    critical: true, targetLevel: 4, weight: 1.6,
  },
  {
    id: 'ai-05', code: 47, domain: 'AI and agentic automation', subdomain: 'AAP integration',
    name: 'AI-to-AAP orchestration',
    observableCapability:
      'Allow AI systems to discover and invoke approved AAP workflows through governed interfaces and policy gates.',
    exampleEvidence: 'Governed end-to-end use case',
    critical: true, targetLevel: 4, weight: 1.6,
  },
  {
    id: 'ai-06', code: 48, domain: 'AI and agentic automation', subdomain: 'Evaluation',
    name: 'LLM and agent evaluation',
    observableCapability:
      'Test task success, hallucination, unsafe actions, injection, robustness, latency, cost and drift.',
    exampleEvidence: 'Evaluation suite and release thresholds',
    critical: true, targetLevel: 4, weight: 1.6,
  },
  {
    id: 'ai-07', code: 49, domain: 'AI and agentic automation', subdomain: 'Human control',
    name: 'Human-in-the-loop automation',
    observableCapability:
      'Place approval, review, override and fallback at risk-appropriate points with clear accountability.',
    exampleEvidence: 'Control design and exception tests',
    critical: true, targetLevel: 4, weight: 1.5,
  },
  {
    id: 'ai-08', code: 50, domain: 'AI and agentic automation', subdomain: 'Governance',
    name: 'Responsible AI and model risk',
    observableCapability:
      'Manage data exposure, access, auditability, explainability, monitoring and change approval.',
    exampleEvidence: 'AI risk assessment and controls',
    critical: true, targetLevel: 3, weight: 1.4,
  },
  {
    id: 'ai-09', code: 51, domain: 'AI and agentic automation', subdomain: 'MCP',
    name: 'Tool protocol and MCP concepts',
    observableCapability:
      'Understand tool/resource exposure, authentication, authorization, schema design and server security.',
    exampleEvidence: 'Secure tool integration prototype',
    critical: true, targetLevel: 3, weight: 1.3,
  },
  {
    id: 'ai-10', code: 52, domain: 'AI and agentic automation', subdomain: 'AIOps',
    name: 'AIOps and intelligent remediation',
    observableCapability:
      'Combine events, analytics and AAP actions for diagnosis or remediation with bounded scope and evidence.',
    exampleEvidence: 'Production or validated pilot',
    critical: true, targetLevel: 3, weight: 1.4,
  },
  {
    id: 'rel-01', code: 53, domain: 'Reliability engineering', subdomain: 'SLO',
    name: 'Automation service SLOs',
    observableCapability:
      'Define availability, latency, correctness, freshness and completion objectives for platform services and workflows.',
    exampleEvidence: 'SLO and review record',
    critical: true, targetLevel: 3, weight: 1.3,
  },
  {
    id: 'rel-02', code: 54, domain: 'Reliability engineering', subdomain: 'Operations',
    name: 'Incident command and troubleshooting',
    observableCapability:
      'Lead diagnosis, mitigation, communications, recovery and evidence-driven restoration.',
    exampleEvidence: 'Major incident evidence',
    critical: true, targetLevel: 4, weight: 1.5,
  },
  {
    id: 'rel-03', code: 55, domain: 'Reliability engineering', subdomain: 'Testing',
    name: 'Resilience and failure-injection testing',
    observableCapability:
      'Exercise dependency loss, partial completion, duplicate events, restarts, credential failures and recovery.',
    exampleEvidence: 'Game day or failure test',
    critical: true, targetLevel: 3, weight: 1.3,
  },
  {
    id: 'rel-04', code: 56, domain: 'Reliability engineering', subdomain: 'Capacity',
    name: 'Capacity and concurrency engineering',
    observableCapability:
      'Model demand, job classes, queues, execution capacity, dependencies, saturation and cost.',
    exampleEvidence: 'Capacity plan and load test',
    critical: true, targetLevel: 3, weight: 1.3,
  },
  {
    id: 'rel-05', code: 57, domain: 'Reliability engineering', subdomain: 'Learning',
    name: 'Post-incident learning and problem management',
    observableCapability:
      'Identify systemic causes, assign actions and verify effectiveness without blame.',
    exampleEvidence: 'Completed learning review',
    critical: true, targetLevel: 3, weight: 1.2,
  },
  {
    id: 'rel-06', code: 58, domain: 'Reliability engineering', subdomain: 'Lifecycle',
    name: 'Operational readiness and service ownership',
    observableCapability:
      'Define owners, support, runbooks, dependencies, health, recovery, deprecation and retirement.',
    exampleEvidence: 'Readiness review and service record',
    critical: true, targetLevel: 4, weight: 1.4,
  },
  {
    id: 'sec-01', code: 59, domain: 'Security and governance', subdomain: 'Access',
    name: 'PAM, RBAC and separation of duties',
    observableCapability:
      'Enforce least privilege, privileged access, maker-checker controls, emergency access and recertification.',
    exampleEvidence: 'Control implementation and review',
    critical: true, targetLevel: 4, weight: 1.5,
  },
  {
    id: 'sec-02', code: 60, domain: 'Security and governance', subdomain: 'Audit',
    name: 'Auditability and evidence retention',
    observableCapability:
      'Record identity, inputs, versions, approvals, actions, outputs and durable evidence.',
    exampleEvidence: 'Auditable execution record',
    critical: true, targetLevel: 4, weight: 1.4,
  },
  {
    id: 'sec-03', code: 61, domain: 'Security and governance', subdomain: 'Supply chain',
    name: 'Automation supply-chain security',
    observableCapability:
      'Scan, sign and attest code, collections, images and dependencies; control third-party sources.',
    exampleEvidence: 'Pipeline controls and remediation',
    critical: true, targetLevel: 3, weight: 1.4,
  },
  {
    id: 'sec-04', code: 62, domain: 'Security and governance', subdomain: 'Policy',
    name: 'Policy as code',
    observableCapability:
      'Encode security, architecture, compliance and operational controls with managed exceptions.',
    exampleEvidence: 'Enforced policy and exception path',
    critical: true, targetLevel: 3, weight: 1.3,
  },
  {
    id: 'sec-05', code: 63, domain: 'Security and governance', subdomain: 'Safety',
    name: 'Blast-radius and automation safety',
    observableCapability:
      'Implement dry run, scope limits, rate limits, kill switches, rollback and fail-safe behavior.',
    exampleEvidence: 'Safety testing and control evidence',
    critical: true, targetLevel: 4, weight: 1.6,
  },
  {
    id: 'prod-01', code: 64, domain: 'Product and leadership', subdomain: 'Product',
    name: 'Automation platform product management',
    observableCapability:
      'Define personas, service catalog, roadmap, outcomes, adoption, support and deprecation.',
    exampleEvidence: 'Roadmap and outcome review',
    critical: false, targetLevel: 3, weight: 1.2,
  },
  {
    id: 'prod-02', code: 65, domain: 'Product and leadership', subdomain: 'Experience',
    name: 'Developer and consumer experience',
    observableCapability:
      'Create paved roads, examples, documentation, feedback loops and low-friction onboarding.',
    exampleEvidence: 'Adoption or lead-time improvement',
    critical: false, targetLevel: 3, weight: 1.2,
  },
  {
    id: 'prod-03', code: 66, domain: 'Product and leadership', subdomain: 'Strategy',
    name: 'Automation opportunity and value management',
    observableCapability:
      'Prioritize opportunities using value, feasibility, risk, reuse and lifecycle cost; measure realized benefits.',
    exampleEvidence: 'Portfolio and benefit review',
    critical: false, targetLevel: 3, weight: 1.2,
  },
  {
    id: 'prod-04', code: 67, domain: 'Product and leadership', subdomain: 'Architecture',
    name: 'Standards and reference architecture',
    observableCapability:
      'Set patterns for content, APIs, CI/CD, security, telemetry, ownership and AI integration.',
    exampleEvidence: 'Adopted standard/reference implementation',
    critical: true, targetLevel: 4, weight: 1.4,
  },
  {
    id: 'prod-05', code: 68, domain: 'Product and leadership', subdomain: 'Communication',
    name: 'Technical communication and stakeholder management',
    observableCapability:
      'Explain architecture, risks, controls and tradeoffs to engineers, operations, security and leaders.',
    exampleEvidence: 'Decision memo or service review',
    critical: false, targetLevel: 3, weight: 1.1,
  },
  {
    id: 'prod-06', code: 69, domain: 'Product and leadership', subdomain: 'Growth',
    name: 'Coaching and knowledge transfer',
    observableCapability:
      'Develop reviews, communities, pairing and backup ownership for critical platform capabilities.',
    exampleEvidence: 'Demonstrated successor or backup readiness',
    critical: false, targetLevel: 3, weight: 1.2,
  },
]

/** The rubric. Level 3 is the coverage threshold; level 4 is the depth threshold. */
export const PROFICIENCY_ANCHORS: ProficiencyAnchor[] = [
  {
    level: 0, label: 'Not exposed',
    independence: 'Cannot perform', scope: 'None',
    observableBehavior: 'No practical exposure',
    evidence: 'None', coverageMeaning: 'Opportunity',
  },
  {
    level: 1, label: 'Aware',
    independence: 'Needs detailed help', scope: 'Lab',
    observableBehavior: 'Explains basics',
    evidence: 'Course/lab', coverageMeaning: 'No operational coverage',
  },
  {
    level: 2, label: 'Guided practitioner',
    independence: 'Routine work with review', scope: 'Known pattern',
    observableBehavior: 'Runs and modifies standard automation',
    evidence: 'Reviewed change', coverageMeaning: 'Breadth/backup',
  },
  {
    level: 3, label: 'Independent',
    independence: 'End-to-end ownership', scope: 'Production',
    observableBehavior: 'Designs, tests, deploys and operates',
    evidence: 'Multiple examples', coverageMeaning: 'Working proficiency',
  },
  {
    level: 4, label: 'Advanced/lead',
    independence: 'Leads and coaches', scope: 'Complex/cross-system',
    observableBehavior: 'Sets patterns and handles ambiguity',
    evidence: 'Major outcome', coverageMeaning: 'Depth/primary owner',
  },
  {
    level: 5, label: 'Strategic expert',
    independence: 'Sets direction', scope: 'Enterprise',
    observableBehavior: 'Defines standards and develops experts',
    evidence: 'Sustained outcomes', coverageMeaning: 'Selective expert level',
  },
]

export const ROLE_PROFILES: RoleProfile[] = [
  {
    id: 'aap-platform-engineer',
    name: 'AAP Platform Engineer',
    primaryOutcome: 'Operate and evolve the shared AAP service',
    depthAreas: 'AAP architecture, controller, mesh, execution environments, hub, RBAC, upgrades, reliability',
    workingBreadth: 'Python, APIs, CI/CD, Linux, containers, observability, security',
    aiExpectation: 'Use AI to improve engineering and expose approved workflows safely',
    evidence: 'Upgrades, capacity, recovery exercises, service SLOs',
    breadthTarget: 34, depthTarget: 11,
    depthSkillIds: ['aap-01', 'aap-02', 'aap-03', 'aap-04', 'aap-05', 'aap-10', 'aap-11', 'aap-12', 'aap-13', 'aap-14', 'plat-09'],
  },
  {
    id: 'automation-content-engineer',
    name: 'Automation Content Engineer',
    primaryOutcome: 'Build reusable, tested automation products',
    depthAreas: 'Playbooks/roles, collections, Python extensions, testing, Git, execution environments',
    workingBreadth: 'Target-platform knowledge, APIs, CI/CD, security, developer experience',
    aiExpectation: 'Use AI to accelerate content while enforcing tests and review',
    evidence: 'Collections, quality gates, adoption, time saved',
    breadthTarget: 32, depthTarget: 10,
    depthSkillIds: ['aap-04', 'aap-06', 'aap-07', 'swe-01', 'swe-02', 'swe-06', 'swe-07', 'swe-08', 'swe-09', 'swe-10'],
  },
  {
    id: 'integration-and-eda-engineer',
    name: 'Integration and EDA Engineer',
    primaryOutcome: 'Connect events, systems, and governed actions',
    depthAreas: 'Event-Driven Ansible, APIs, events, messaging, ITSM, resilient patterns',
    workingBreadth: 'Python, AAP, schemas, observability, security, reliability',
    aiExpectation: 'Build event and agent workflows with deduplication, approvals and fallback',
    evidence: 'Production integrations, event outcomes, reliability metrics',
    breadthTarget: 32, depthTarget: 11,
    depthSkillIds: ['aap-08', 'aap-09', 'swe-01', 'swe-03', 'swe-11', 'int-01', 'int-02', 'int-03', 'int-04', 'int-07', 'plat-09'],
  },
  {
    id: 'automation-software-engineer',
    name: 'Automation Software Engineer',
    primaryOutcome: 'Build services and capabilities around AAP',
    depthAreas: 'Python, APIs, services, testing, architecture, async patterns, CI/CD',
    workingBreadth: 'AAP APIs, containers, Kubernetes, telemetry, security',
    aiExpectation: 'Develop tool-using agents and evaluate them systematically',
    evidence: 'Services, SDKs, evaluation suites, SLOs',
    breadthTarget: 30, depthTarget: 12,
    depthSkillIds: ['swe-01', 'swe-02', 'swe-03', 'swe-04', 'swe-05', 'swe-06', 'swe-07', 'swe-11', 'swe-12', 'plat-04', 'ai-04', 'ai-06'],
  },
  {
    id: 'automation-reliability-engineer',
    name: 'Automation Reliability Engineer',
    primaryOutcome: 'Ensure platform and workflows are supportable and resilient',
    depthAreas: 'Troubleshooting, SLOs, telemetry, capacity, DR, safety, incident command',
    workingBreadth: 'AAP architecture, Linux/network, testing, lifecycle, security',
    aiExpectation: 'Use AI for triage with human accountability and deterministic recovery',
    evidence: 'SLOs, reduced failures, game days, MTTR improvements',
    breadthTarget: 34, depthTarget: 11,
    depthSkillIds: ['aap-12', 'aap-13', 'aap-14', 'plat-09', 'rel-01', 'rel-02', 'rel-03', 'rel-04', 'rel-05', 'rel-06', 'sec-05'],
  },
  {
    id: 'automation-architect-technical-lead',
    name: 'Automation Architect / Technical Lead',
    primaryOutcome: 'Set enterprise automation architecture and future direction',
    depthAreas: 'AAP, software architecture, integration, security, reliability, AI/agent architecture, standards',
    workingBreadth: 'Product strategy, platform engineering, economics, coaching, communication',
    aiExpectation: 'Set governed AI-to-AAP patterns, evaluation and adoption standards',
    evidence: 'ADRs, standards, roadmaps, cross-team outcomes',
    breadthTarget: 45, depthTarget: 17,
    depthSkillIds: ['aap-01', 'aap-03', 'aap-08', 'aap-10', 'swe-03', 'swe-05', 'int-02', 'int-06', 'ai-04', 'ai-05', 'ai-06', 'ai-07', 'rel-01', 'rel-06', 'sec-01', 'sec-05', 'prod-04'],
  },
]

export const CATALOG_SOURCES: CatalogSource[] = [
  {
    name: 'Red Hat AAP 2.7 documentation',
    url: 'https://docs.redhat.com/en/documentation/red_hat_ansible_automation_platform/2.7',
    relevance: 'Current platform scope, admin/developer/operator paths, deployment topology, event persistence, intelligent assistant and short-lived credentials.',
    accessed: '2026-08-27',
  },
  {
    name: 'Red Hat AAP components',
    url: 'https://docs.redhat.com/en/documentation/red_hat_ansible_automation_platform/2.4/html/red_hat_ansible_automation_platform_planning_guide/ref-aap-components',
    relevance: 'Controller, automation hub, EDA controller, mesh and execution-environment architecture.',
    accessed: '2026-08-27',
  },
  {
    name: 'Red Hat Event-Driven Ansible',
    url: 'https://www.redhat.com/en/technologies/management/ansible/event-driven-ansible',
    relevance: 'Event sources, rulebooks, conditional actions and operational automation use cases.',
    accessed: '2026-08-27',
  },
  {
    name: 'Red Hat execution environments',
    url: 'https://www.redhat.com/en/technologies/management/ansible/automation-execution-environments',
    relevance: 'Portable containerized Ansible runtime, dependencies and automated image builds.',
    accessed: '2026-08-27',
  },
  {
    name: 'NIST AI Risk Management Framework',
    url: 'https://www.nist.gov/itl/ai-risk-management-framework',
    relevance: 'Responsible AI risk, governance, evaluation and human oversight.',
    accessed: '2026-08-27',
  },
  {
    name: 'OpenTelemetry documentation',
    url: 'https://opentelemetry.io/docs/',
    relevance: 'Observability of automation platform services and distributed workflows.',
    accessed: '2026-08-27',
  },
]

/** Catalog domains in workbook order. */
export const SKILL_DOMAINS = [
  'AAP platform engineering',
  'Software engineering',
  'Platform engineering and DevOps',
  'Enterprise integration',
  'AI and agentic automation',
  'Reliability engineering',
  'Security and governance',
  'Product and leadership',
] as const

export function skillDomains(catalog: SkillDefinition[]): string[] {
  const seen: string[] = []
  for (const s of catalog) if (!seen.includes(s.domain)) seen.push(s.domain)
  return seen
}
