# Testing notes

Tests so far were run manually through n8n, first with a Manual Trigger and a sample node, then through the webhook. Prompt version: v1.0.0. Model: a Gemini Flash model on the free tier, temperature 0.1.

Test messages and expected values are in [`data/sample-payloads.json`](../data/sample-payloads.json).

## Results

| # | Case | Input (abridged) | Expected | Observed | Result |
|---|---|---|---|---|---|
| 1 | Feature request with praise | "It would be nice to have dark mode. Love the app otherwise!" (free) | P3, Low churn, no flags | Feature Request, P3, Low, no flags, status New | Pass |
| 2 | Sarcasm | "Wow, 4 hours on hold. Truly the best support ever." (standard) | Negative, P2, `sarcasm_detected` | P2 after the prompt fixes (earlier it was P1 / High churn). Re-check that flags contain only `sarcasm_detected` | Pass on urgency; flags to re-verify |
| 3 | Double charge + churn threat | "I was charged twice this month and nobody answers my emails. I will cancel." (standard) | P1, High, Billing & Payments | P1, High, Billing & Payments, `billing_error`, Slack alert sent | Pass |
| 4 | Enterprise crash + vendor threat | "The app crashed three times today... other vendors." (enterprise) | P1, High, Product Bug | P1, High, Product Bug, Performance & Reliability secondary (first run, before the prompt was tightened) | Pass; re-run with v1.0.0 |

## Issues found and how they were fixed

| Issue | Cause | Fix |
|---|---|---|
| Sarcasm complaint scored P1 and High churn | P1 and churn definitions too loose | Tightened definitions: slow support and anger alone are not P1; High churn needs explicit intent to leave |
| `prompt_injection_suspected` on normal messages | Model over-applied the security rule | Narrowed the rule in the prompt and moved the flag to a keyword check in `validate.js` |
| `multi_issue` on praise plus one request | Model over-flagging | Stricter flag definitions in the prompt |
| Draft replies claimed "escalated to leadership" and "staffing gaps" | Model invented actions | Reply rules now allow only facts from the message and forbid promises |
| Literal `\n` in replies | Model returned escaped newlines | `fixNewlines()` in `validate.js` |
| Rows not written to Sheets | Operation was Update Row | Switched to Append or Update Row |
| P1 tickets reached Sheets only through Slack | Slack node was chained into the Sheet node | Connected P1_ESCALATE directly to both nodes |
| 429 error from Gemini | Free tier daily limit (about 20 requests/day for the model used) | Switched model; pinned LLM output while testing downstream nodes |

## Not yet tested

| Case | Why it matters |
|---|---|
| Non-English input (Spanish, Hindi, Hinglish) | Language detection, English summary, reply in the customer's language |
| Very short or ambiguous input ("bad", "??") | Confidence and `ambiguous` flag; input with fewer than 5 characters should be rejected |
| Passive-aggressive feedback | Should score negative, not positive |
| Neutral question | Should stay near 0 sentiment, P3 |
| Multi-issue complaint | Primary category choice, secondary categories, `multi_issue` flag |
| Prompt injection with a real issue | Flag set by keyword check, urgency still P1 |
| Spam and emoji-only input | Should classify as Other / P3 without inventing issues |
| Invalid LLM output | Ticket should land in Needs Review, not be lost |
| Wrong or missing API key | Webhook should reject with 403 |
| Duplicate submissions | Not implemented yet (`content_hash` is stored but not checked) |

## Planned: golden test set

Build 150 to 200 hand-labeled messages and report urgency accuracy, P1 recall and precision, category F1 and sentiment error for every prompt change. Suggested targets: P1 recall at least 98%, urgency accuracy at least 90%.

## Known limits of these tests

Only a handful of hand-written messages were used, results come from a single model run each, and LLM output can vary between runs. Treat the pass marks as smoke tests, not accuracy measurements.
