# Slack setup (Incoming Webhook)

The workflow posts P1 alerts to a Slack channel through an Incoming Webhook. Slack's screens change from time to time, so follow the closest label if yours differ.

1. Create a free Slack workspace (or use one you own) and create a channel called `#feedback-alerts`. If you are not an admin of a workspace, create your own, because installing an app may need admin approval.
2. Go to <https://api.slack.com/apps> and click **Create New App**.
3. Choose **Pick features** (or **From scratch** in older versions) and continue. Name the app `Feedback Alerts` and choose your workspace.
4. On the scopes step, keep the single bot scope `incoming-webhook`. Skip optional events.
5. On the review screen, click **Create and Install**, then **Allow** if Slack asks for approval.
6. In the app settings, open **Incoming Webhooks** and make sure **Activate Incoming Webhooks** is **On**.
7. Click **Add New Webhook to Workspace**, choose `#feedback-alerts`, and click **Allow**.
8. Copy the **Webhook URL** (it starts with `https://hooks.slack.com/services/`).

## Use it in n8n

1. Add an **HTTP Request** node on the `P1_ESCALATE` output of the Route node and name it `Slack P1 Alert`.
2. Set **Method** to `POST` and paste the webhook URL into **URL**.
3. Turn on **Send Body**, set **Body Content Type** to `JSON` and **Specify Body** to `Using JSON`.
4. Set the JSON field to **Expression** mode and paste:

```text
{{ JSON.stringify({
  text: "P1 ESCALATION " + $json.ticket_id + "\nCustomer: " + $json.customer_id + " (" + $json.customer_tier + ")\nCategory: " + $json.category + "\nSentiment: " + $json.sentiment_label + " (" + $json.sentiment_score + ")\nChurn risk: " + $json.churn_risk + "\nSLA due: " + $json.sla_due_at + "\nSummary: " + $json.actionable_summary + "\nSuggested reply: " + $json.suggested_reply
}) }}
```

5. In **Settings**, turn on **Retry On Fail** with 3 tries and 2000 ms wait.

**Wiring:** connect `P1_ESCALATE` to **both** the Slack node and the `Log to Sheet` node directly. Do not chain Slack into the Sheet node, because Slack's reply is just `ok` and the ticket data would be lost.

## Troubleshooting

| Symptom | Likely cause |
|---|---|
| `invalid_payload` or 400 | The body field was not in Expression mode, or the paste doubled up |
| `no_service` or 404 | The webhook URL is wrong or was revoked: create a new one |
| Node is green but nothing in Slack | Wrong channel chosen when the webhook was created |

## Security

Treat the webhook URL like a password. Never commit it. In the exported workflow, replace it with `YOUR_SLACK_WEBHOOK_URL`. If it leaks, delete it on the app's Incoming Webhooks page and create a new one.
