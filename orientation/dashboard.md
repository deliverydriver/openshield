# OpenShield Dashboard Instructions

## Reporting Endpoint
`https://wlepfjchfmekryfnjhir.supabase.co/functions/v1/agent-api`

## API Documentation
https://agents.openshield.cc/docs/api

## Agent Info
- Name: `openshield`
- Secret: (see API_creds.md)

## API Endpoints
- POST /heartbeat: Send regular heartbeats
- POST /tasks: Report completed tasks
- POST /log: Log activities
- POST /status: Update status
- GET /status: Get current status
- GET /logs: Retrieve logs

## Heartbeat Example
```bash
curl -X POST "https://wlepfjchfmekryfnjhir.supabase.co/functions/v1/agent-api/heartbeat" \
  -H "Authorization: Bearer <agent-secret>"
```
