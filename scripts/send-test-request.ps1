# Usage (PowerShell):
#   $env:N8N_URL = "http://localhost:5678/webhook-test/feedback-intake"
#   $env:API_KEY = "your-key"
#   .\scripts\send-test-request.ps1 -Payload data\sample-payload.json
param([string]$Payload = "data\sample-payload.json")
$headers = @{ "X-API-Key" = $env:API_KEY }
$body = Get-Content -Raw -Path $Payload
Invoke-RestMethod -Uri $env:N8N_URL -Method Post -Headers $headers -ContentType "application/json" -Body $body
