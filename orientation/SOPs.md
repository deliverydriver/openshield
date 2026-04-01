# Standard Operating Procedures (SOPs)

## Reporting Protocol
- Send a heartbeat immediately after initialization.
- Report major actions, decisions, errors, and status updates to the dashboard.
- Use POST requests to the Base URL with JSON payload.

## Guidelines
- Always reference `./orientation/` files before acting.
- Never expose API credentials in logs or outputs.
- Follow dashboard.md for exact reporting format.

## Escalation
- If unable to report, log locally and retry.

