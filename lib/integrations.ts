/** Shared config for the Admin > Integrations tab. Connection state lives in
 * localStorage per integration (no backend integrations table exists yet), so
 * "Connected" only ever means "required fields are present in local config" —
 * there's no live health check against the third-party API. */

export interface IntegrationField {
  key: string
  label: string
  placeholder?: string
  type?: 'text' | 'password' | 'url'
  helpText?: string
  /** Not required for the integration to be considered "Connected". */
  optional?: boolean
}

export interface IntegrationGuide {
  summary: string
  steps: string[]
  sampleData: Record<string, string>
}

export const INTEGRATION_FIELDS: Record<string, IntegrationField[]> = {
  'Microsoft Entra ID': [
    { key: 'tenantId', label: 'Tenant ID', placeholder: 'xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx' },
    { key: 'clientId', label: 'Client ID', placeholder: 'xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx' },
    { key: 'clientSecret', label: 'Client Secret', type: 'password', placeholder: 'Enter client secret' },
  ],
  'Microsoft Teams': [
    { key: 'webhookUrl', label: 'Incoming Webhook URL', type: 'url', placeholder: 'https://outlook.office.com/webhook/...' },
  ],
  'Azure DevOps': [
    { key: 'orgUrl', label: 'Organization URL', type: 'url', placeholder: 'https://dev.azure.com/yourorg' },
    { key: 'pat', label: 'Personal Access Token', type: 'password', placeholder: 'Enter PAT' },
    { key: 'project', label: 'Project Name', placeholder: 'MyProject' },
  ],
  'GitHub': [
    {
      key: 'org', label: 'Organization Name', placeholder: 'your-org',
      helpText: 'The GitHub organization (or username, for personal accounts) that owns the repos you want signals from.',
    },
    {
      key: 'pat', label: 'Personal Access Token', type: 'password', placeholder: 'ghp_xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx',
      helpText: 'A fine-grained or classic PAT with repo (and read:org, for private-org member data) scopes.',
    },
    {
      key: 'repos', label: 'Repositories (comma-separated, optional)', placeholder: 'platform-api, infra-automation, aiops-service',
      helpText: 'Leave blank to pull activity from every repo the token can see in the organization.',
      optional: true,
    },
  ],
  'Jira': [
    { key: 'baseUrl', label: 'Base URL', type: 'url', placeholder: 'https://yourorg.atlassian.net' },
    { key: 'email', label: 'Email', placeholder: 'you@company.com' },
    { key: 'apiToken', label: 'API Token', type: 'password', placeholder: 'Enter Jira API token' },
    { key: 'projectKey', label: 'Project Key', placeholder: 'PROJ' },
  ],
  'Pluralsight': [
    { key: 'apiKey', label: 'API Key', type: 'password', placeholder: 'Enter Pluralsight API key' },
    { key: 'teamHandle', label: 'Team Handle', placeholder: 'your-team-handle' },
  ],
  'LinkedIn Learning': [
    { key: 'clientId', label: 'Client ID', placeholder: 'Enter Client ID' },
    { key: 'clientSecret', label: 'Client Secret', type: 'password', placeholder: 'Enter Client Secret' },
  ],
  'Workday': [
    { key: 'tenantUrl', label: 'Tenant URL', type: 'url', placeholder: 'https://yourorg.workday.com' },
    { key: 'clientId', label: 'Client ID', placeholder: 'Enter Client ID' },
    { key: 'clientSecret', label: 'Client Secret', type: 'password', placeholder: 'Enter Client Secret' },
  ],
}

export const INTEGRATION_GUIDES: Record<string, IntegrationGuide> = {
  'GitHub': {
    summary: 'Pulls pull request and commit activity so it can feed project-contribution and collaboration signals.',
    steps: [
      'In GitHub, go to Settings → Developer settings → Personal access tokens → Fine-grained tokens.',
      'Scope the token to your organization with "Read" access to Contents, Metadata, and Pull requests (add "Members" read-only if you want org membership matched to engineers automatically).',
      'Copy the generated token — GitHub only shows it once — and paste it into Personal Access Token below.',
      'Enter your GitHub organization (or username) exactly as it appears in the GitHub URL, e.g. github.com/your-org.',
      'Optionally list specific repositories to limit which activity is imported; leave blank to include every repo the token can read.',
      'Save, then use Test Connection to confirm the token can reach the GitHub API before relying on synced data.',
    ],
    sampleData: {
      'Organization Name': 'acme-engineering',
      'Personal Access Token': 'ghp_16C7e42F292c6912e7710c838347Ae178B4a',
      'Repositories (comma-separated, optional)': 'platform-api, infra-automation, aiops-service',
    },
  },
}

/** A field counts as configured once it has a non-whitespace value; every listed
 * field is required for the integration to be considered connected. */
export function isIntegrationConfigured(name: string): boolean {
  const fields = INTEGRATION_FIELDS[name]
  if (!fields || fields.length === 0) return false
  try {
    const stored = localStorage.getItem(`integration-${name}`)
    if (!stored) return false
    const values = JSON.parse(stored) as Record<string, string>
    return fields.every(f => f.optional || Boolean(values[f.key]?.trim()))
  } catch {
    return false
  }
}
