# Error handling

The main workflow (`Feedback Triage v1`) is paired with a second workflow, `Feedback Triage Error Handler` ([`workflow/error-handler-v1.json`](../workflow/error-handler-v1.json)), that posts to a separate Slack channel when a live run fails.

## How it works

1. n8n's **Error workflow** setting on the main workflow points to the handler.
2. When a live (non-manual) execution fails, n8n starts the handler through its **Error Trigger** node.
3. The **Slack Error Alert** node posts to `#ops-alerts` through its own Incoming Webhook, so system errors stay out of `#feedback-alerts`, which is reserved for P1 customer tickets.

Alert contents: workflow name, last node executed, the first 500 characters of the error message, a link to the execution, and a UTC timestamp. The alert intentionally excludes the customer's feedback text.

## Setup

1. Create a Slack channel `#ops-alerts` and add an Incoming Webhook for it (see [slack-setup.md](slack-setup.md)). Use a different webhook URL from the P1 alert one.
2. Import `workflow/error-handler-v1.json`, replace `YOUR_SLACK_OPS_WEBHOOK_URL` in the Slack node, and publish it.
3. In the main workflow, open the menu (...) > **Settings** > **Error workflow**, select `Feedback Triage Error Handler`, and save. Publish the main workflow again if prompted.

## What is and is not an error

| Situation | Behaviour |
|---|---|
| Invalid or too-short feedback | Not an error. Returns 400, stops at `Respond 400`, no alert |
| Wrong or missing API key | Not an error. Rejected by the webhook with 403 |
| LLM failure (quota, bad model name, timeout) | Execution fails, alert in `#ops-alerts`, no row is written |
| Google Sheets failure (expired sign-in, quota) | Execution fails after retries (3 tries), alert in `#ops-alerts` |
| Slack P1 alert failure | Retries 3 times, then fails and alerts in `#ops-alerts` |
| LLM output that fails schema validation | Not an error. Ticket is saved with `status = Needs Review` |

Note: the 202 reply is sent before the LLM step, so a caller can receive "accepted" for a ticket that later fails. The error alert is how that case is surfaced.

## Tested

Setting the Gemini model to an invalid name and sending a valid message produced a `WORKFLOW ERROR` message in `#ops-alerts` naming the failing node, no sheet row and no P1 alert. Restoring the model returned the workflow to normal (one row, one alert, no ops alert). See [testing.md](testing.md).

## Known limits

- Manual runs from the n8n editor do not trigger the error workflow.
- If the ops Slack webhook itself fails, the handler retries 3 times and then the failure is only visible in n8n's Executions list.
- Failed tickets are not queued for replay. The failed execution can be retried manually from n8n (Executions > Retry).
- Errors are not yet logged to an `Errors` sheet tab (on the roadmap).
