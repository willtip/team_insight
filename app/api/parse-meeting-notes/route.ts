import Anthropic from '@anthropic-ai/sdk'
import { NextRequest, NextResponse } from 'next/server'

const client = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY })

const SYSTEM_PROMPT = `You parse 1:1 meeting notes into structured sections. Return ONLY valid JSON — no markdown, no explanation, just the JSON object.

Extract content that clearly maps to each section. If nothing fits a section, use an empty string or empty array. For dates, use YYYY-MM-DD format if determinable, otherwise leave empty.

Return this exact shape:
{
  "companyUpdates": "string — company priorities, strategy changes, org updates mentioned",
  "scorecardHighlights": "string — performance observations, goal progress, metrics, KPIs discussed",
  "ids": [
    { "id": "ids-1", "issue": "string — what the problem is", "discussion": "string — root cause or context", "solve": "string — agreed action or resolution" }
  ],
  "feedback": "string — coaching notes, direct feedback given, check-in observations",
  "actionItems": [
    { "id": "ai-1", "who": "string — person responsible", "what": "string — what they will do", "dueDate": "YYYY-MM-DD or empty string", "completed": false }
  ]
}`

export async function POST(req: NextRequest) {
  try {
    const { notes } = await req.json()
    if (!notes?.trim()) {
      return NextResponse.json({ error: 'No notes provided' }, { status: 400 })
    }

    const message = await client.messages.create({
      model: 'claude-sonnet-4-6',
      max_tokens: 2048,
      system: SYSTEM_PROMPT,
      messages: [{ role: 'user', content: `Parse these meeting notes:\n\n${notes}` }],
    })

    const raw = message.content[0].type === 'text' ? message.content[0].text : ''
    const parsed = JSON.parse(raw)

    // Stamp unique ids on any items that came back without them
    const now = Date.now()
    if (parsed.ids) {
      parsed.ids = parsed.ids.map((item: Record<string, string>, i: number) => ({
        ...item, id: `ids-${now}-${i}`,
      }))
    }
    if (parsed.actionItems) {
      parsed.actionItems = parsed.actionItems.map((item: Record<string, unknown>, i: number) => ({
        ...item, id: `ai-${now}-${i}`, completed: false,
      }))
    }

    return NextResponse.json(parsed)
  } catch (err) {
    console.error('parse-meeting-notes error:', err)
    return NextResponse.json({ error: 'Failed to parse notes' }, { status: 500 })
  }
}
