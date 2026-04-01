# OpenShield Dashboard Instructions

## Reporting Endpoint
`https://wlepfjchfmekryfnjhir.supabase.co/functions/v1/agent-api`

## Agent Info
- Name: `openshield`
- Secret: (see API_creds.md)

## Heartbeat Example
```bash
curl -X POST "https://wlepfjchfmekryfnjhir.supabase.co/functions/v1/agent-api" \
  -H "Content-Type: application/json" \
  -d '{
    "agent": "openshield",
    "secret": "f8c0eed0-8cca-4ee6-b616-2d3a5dc74005",
    "status": "alive"
  }'
```
