// n8n Code node "Sanitize" - mode: Run Once for Each Item
const b = $json.body || $json;
const errors = [];

let text = typeof b.feedback_text === 'string' ? b.feedback_text : '';
// Remove HTML tags and extra spaces
text = text.replace(/<[^>]*>/g, ' ');
text = text.replace(/[ \t]+/g, ' ').trim();
// Mask long digit runs (like card numbers)
text = text.replace(/[0-9]{13,16}/g, '[REDACTED_NUMBER]');

if (text.length < 5) errors.push('feedback_text too short or missing');
if (text.length > 5000) text = text.slice(0, 5000);

const email = typeof b.customer_email === 'string' ? b.customer_email.trim().toLowerCase() : '';
const emailOk = /^[^@ ]+@[^@ ]+[.][^@ ]+$/.test(email);
const tiers = ['free', 'standard', 'premium', 'enterprise'];
const sources = ['web', 'app', 'email', 'form', 'helpdesk', 'other'];

// Ticket ID: FB-YYYYMMDD-XXXXXX
const now = new Date();
const ymd = now.toISOString().slice(0, 10).split('-').join('');
let rand = '';
for (let i = 0; i < 6; i++) {
  rand += Math.floor(Math.random() * 16).toString(16).toUpperCase();
}
const ticket_id = 'FB-' + ymd + '-' + rand;

const customer_id = b.customer_id ? String(b.customer_id).trim() : 'anonymous';

// Simple hash used to spot duplicates
function simpleHash(str) {
  let h = 5381;
  for (let i = 0; i < str.length; i++) {
    h = ((h * 33) ^ str.charCodeAt(i)) >>> 0;
  }
  return h.toString(16);
}
const content_hash = simpleHash(customer_id + '|' + text.toLowerCase());

let submitted = new Date(b.submitted_at);
if (isNaN(submitted.getTime())) submitted = now;

return {
  json: {
    valid: errors.length === 0,
    errors: errors,
    ticket_id: ticket_id,
    timestamp: now.toISOString(),
    submitted_at: submitted.toISOString(),
    source: sources.includes(b.source) ? b.source : 'other',
    customer_id: customer_id,
    customer_email: emailOk ? email : '',
    customer_tier: tiers.includes(b.customer_tier) ? b.customer_tier : 'unknown',
    raw_text: text,
    content_hash: content_hash
  }
};
