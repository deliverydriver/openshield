# OpenShield Dashboard Instructions

## Reporting Endpoint
`{{BASE_URL}}`

## API Documentation
https://agents.openshield.cc/docs/api

## Agent Info
- Name: `{{AGENT_NAME}}`
- Secret: (see API_creds.md)

## API Endpoints
- POST /heartbeat
- POST /tasks
- POST /log
- POST /status
- GET /status
- GET /logs

## Heartbeat Example
```bash
curl -X POST "{{BASE_URL}}/heartbeat" \
	-H "Authorization: Bearer {{AGENT_SECRET}}"
```
