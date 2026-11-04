// n8n Code node "Validate" - mode: Run Once for Each Item
// Runs after the Basic LLM Chain. Checks the AI output, applies business rules,
// and builds the row that is logged to Google Sheets.
const src = $('Sanitize').first().json;
const out = $json.output || null;

const U = ['P1', 'P2', 'P3'];
const C = ['Low', 'Medium', 'High'];

const ok = out
  && U.includes(out.urgency)
  && C.includes(out.churn_risk)
  && typeof out.sentiment_score === 'number'
  && out.sentiment_score >= -1 && out.sentiment_score <= 1
  && out.category && out.root_cause && out.summary && out.draft_response;

// Keyword safety net (also used if the AI fails)
const t = src.raw_text.toLowerCase();
const p1Words = ['data breach', 'hacked', 'unauthorized', 'charged twice', 'double charge',
  'lawyer', 'legal action', 'chargeback', 'gdpr', 'lost all my data', 'outage', 'cannot log in at all'];
const keywordP1 = p1Words.some(w => t.includes(w));

const slaMin = { P1: 15, P2: 240, P3: 1440 };
let urgency = ok ? out.urgency : (keywordP1 ? 'P1' : 'P2');
const churn = ok ? out.churn_risk : 'Medium';
const score = ok ? Math.round(out.sentiment_score * 100) / 100 : 0;

// Rules that can only raise urgency, never lower it
const highValue = ['premium', 'enterprise'].includes(src.customer_tier);
if (keywordP1 && urgency !== 'P1') urgency = 'P1';
if (highValue && urgency === 'P2' && churn === 'High') urgency = 'P1';
if (score <= -0.8 && urgency === 'P3') urgency = 'P2';

const escalate = urgency === 'P1' || churn === 'High';
const status = !ok ? 'Needs Review' : (escalate ? 'Escalated' : (urgency === 'P2' ? 'Open' : 'New'));
const due = new Date(new Date(src.timestamp).getTime() + slaMin[urgency] * 60000).toISOString();

// Decide the injection flag ourselves with keywords
const injectionWords = ['ignore previous', 'ignore all', 'ignore the above', 'disregard', 'system prompt', 'your instructions', 'override', 'set urgency', 'mark this as'];
const hasInjection = injectionWords.some(w => t.includes(w));
const cleanFlags = ok ? (out.flags || []).filter(f => f !== 'prompt_injection_suspected') : [];
if (hasInjection) cleanFlags.push('prompt_injection_suspected');

// Turn literal backslash-n into real line breaks
function fixNewlines(s) {
  return typeof s === 'string' ? s.split('\\n').join('\n') : s;
}

// Stop spreadsheet formula injection: text starting with = + - @ gets an apostrophe
function safe(v) {
  if (typeof v === 'string' && ['=', '+', '-', '@'].includes(v.charAt(0))) return "'" + v;
  return v;
}

return { json: {
  ticket_id: src.ticket_id,
  timestamp: src.timestamp,
  submitted_at: src.submitted_at,
  source: src.source,
  customer_id: src.customer_id,
  customer_email: src.customer_email,
  customer_tier: src.customer_tier,
  raw_text: safe(src.raw_text),
  language: ok ? out.language : '',
  sentiment_label: ok ? out.sentiment_label : '',
  sentiment_score: score,
  category: ok ? out.category : 'Other',
  secondary_categories: ok ? (out.secondary_categories || []).join(', ') : '',
  root_cause: ok ? out.root_cause : 'unknown',
  urgency: urgency,
  churn_risk: churn,
  actionable_summary: ok ? safe(out.summary) : 'AI output invalid. Manual review required.',
  suggested_reply: ok ? safe(fixNewlines(out.draft_response)) : '',
  confidence: ok ? out.confidence : 0,
  flags: cleanFlags.join(', '),
  escalated: escalate,
  status: status,
  sla_due_at: due,
  content_hash: src.content_hash,
  llm_model: 'gemini-flash',
  prompt_version: 'v1.0.0',
  processing_error: ok ? '' : 'schema_validation_failed',
  route: !ok ? 'FALLBACK' : (escalate ? 'P1' : urgency)
}};
