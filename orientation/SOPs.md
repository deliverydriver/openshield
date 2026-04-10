# Standard Operating Procedures (SOPs)

## Reporting Protocol
- Send a heartbeat immediately after initialization.
- Report major actions, decisions, errors, and status updates to the dashboard.
- Use POST requests to the Base URL with JSON payload.

## API Endpoints
- Reference: https://agents.openshield.cc/docs/api
- POST /heartbeat
- POST /tasks
- POST /log
- POST /status
- GET /status
- GET /logs

## Guidelines
- Always reference `./orientation/` files before acting.
- Never expose API credentials in logs or outputs.
- Follow dashboard.md for exact reporting format.

## Escalation
- If unable to report, log locally and retry.

