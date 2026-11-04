# Google Sheets setup

## 1. Create the sheet

1. Create a spreadsheet named `Customer_Feedback_Triage`.
2. Rename the first tab to `Tickets`.
3. Paste the 30 headers from [`data/sheet-headers.csv`](../data/sheet-headers.csv) into row 1 (**Data > Split text to columns** if they land in a single cell). Header names must match the workflow's field names exactly.
4. Optional: freeze row 1 and add dropdown validation to `urgency`, `churn_risk` and `status`.

## 2. Connect Google to n8n (OAuth2)

This is free and needs no billing, but it has several screens.

1. In n8n, go to **Credentials > Create credential**, choose **Google Sheets OAuth2 API**, and keep that window open. It shows an **OAuth Redirect URL** (for a local install: `http://localhost:5678/rest/oauth2-credential/callback`).
2. Open <https://console.cloud.google.com> and create a new project (for example `feedback-triage`). Make sure it is the selected project.
3. Go to **APIs & Services > Library** and enable both **Google Sheets API** and **Google Drive API**.
4. Go to **OAuth consent screen** (or **Google Auth platform**), click **Get started**, set an app name, choose **External**, and finish the form.
5. Under **Audience** (or **Test users**), add your own Google email.
6. Go to **Credentials** (or **Clients**) and choose **Create credentials > OAuth client ID > Web application**. Under **Authorized redirect URIs**, paste the redirect URL from step 1.
7. Copy the **Client ID** and **Client secret** into the n8n credential, then click **Sign in with Google**.
8. If Google says the app is unverified, choose **Advanced > Go to n8n (unsafe)**. It is your own app. Tick the requested permissions and continue.

**Permissions shown on the consent screen:** Drive file metadata, files used with the app, and all of your Google Sheets spreadsheets. The Sheets permission covers every spreadsheet in the account, because Google has no one-sheet permission. For extra safety, use a separate Google account for this project.

**Testing-mode expiry:** while the Google app is in Testing mode, the connection expires after about 7 days and the workflow will start failing. Reconnect the credential, or publish the app on the consent screen.

## 3. Configure the `Log to Sheet` node

| Setting | Value |
|---|---|
| Resource | Sheet Within Document |
| Operation | **Append or Update Row** (not Update Row, which writes nothing when no row matches) |
| Document | `Customer_Feedback_Triage` |
| Sheet | `Tickets` |
| Mapping Column Mode | Map Automatically |
| Column to match on | `ticket_id` |
| Options > Handling extra fields in input | Ignore Them (the workflow also outputs a `route` field that has no column) |

Connect all four Route outputs (`P1_ESCALATE`, `P2_OPEN`, `P3_BACKLOG`, `FALLBACK`) to this node.

## Troubleshooting

| Symptom | Likely cause |
|---|---|
| Node is green but no row appears | Operation is set to Update Row instead of Append or Update Row |
| Unauthorized or `invalid_grant` | You are not listed as a test user, or the 7-day Testing expiry passed |
| Sheet missing from the dropdown | Google Drive API not enabled: choose **By URL** instead |
| Rows appear with blank columns | A header in row 1 does not exactly match a field name |

## Limits

Google Sheets is fine for a demo or low volume. It allows roughly 60 writes per minute per user, so move to a database for production.
