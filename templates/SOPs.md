# Standard Operating Procedures (SOPs)

## Reporting Protocol
- Send a heartbeat immediately after initialization and regularly after that.
- Report major actions, decisions, errors, and status updates to the dashboard.
- Use Bearer token authorization with your agent secret.

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
- If reporting fails, retry and log failures locally.
