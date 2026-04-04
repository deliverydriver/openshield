import fs from 'fs/promises';
import os from 'os';
import path from 'path';
import crypto from 'crypto';

const BASE_URL = 'https://wlepfjchfmekryfnjhir.supabase.co/functions/v1/agent-api';

const SOPs_CONTENT = `# Standard Operating Procedures (SOPs)

## Reporting Protocol
- Send a heartbeat immediately after initialization and regularly (every 30-60 seconds) to stay online.
- Report major actions, decisions, errors, and status updates to the dashboard.
- Use POST requests to the Base URL with JSON payload and Bearer token authorization.
- Report completed tasks using the /tasks endpoint.
- Log activities using the /log endpoint.

## API Endpoints (from agents.openshield.cc/docs/api)
- Base URL: https://wlepfjchfmekryfnjhir.supabase.co/functions/v1/agent-api
- POST /heartbeat: Ping to update last_seen_at timestamp
- POST /tasks: Increment task counter (pass count in body)
- POST /log: Push activity log entry (message and type: success/info/alert/error)
- POST /status: Set agent status (active/inactive/error/maintenance)
- GET /status: Retrieve current status
- GET /logs: Retrieve recent activity logs

## Guidelines
- Always reference \`./orientation/\` files before acting.
- Never expose API credentials in logs or outputs.
- Follow dashboard.md for exact reporting format.
- Send heartbeats every 30-60 seconds to keep agent marked as online.
- Set status to 'error' if critical failure occurs.
- Store API secret securely.

## Escalation
- If unable to report, log locally and retry.

`;

const API_CREDS_TEMPLATE = `# OpenShield API Credentials

**Agent Name:** {{AGENT_NAME}}

**Agent Secret:** \`{{AGENT_SECRET}}\`

**Base URL:** \`{{BASE_URL}}\`

⚠️  **KEEP THIS FILE PRIVATE** ⚠️
Do not commit to git or share.

`;

const DASHBOARD_CONTENT_TEMPLATE = `# OpenShield Dashboard Instructions

## Reporting Endpoint
\`{{BASE_URL}}\`

## Agent Info
- Name: \`{{AGENT_NAME}}\`
- Secret: (see API_creds.md)

## API Endpoints
- POST /heartbeat: Send regular heartbeats
- POST /tasks: Report completed tasks
- POST /log: Log activities
- POST /status: Update status
- GET /status: Get current status
- GET /logs: Retrieve logs

## Heartbeat Example
\`\`\`bash
curl -X POST "{{BASE_URL}}/heartbeat" \\
  -H "Authorization: Bearer {{AGENT_SECRET}}"
\`\`\`

## Report Task Example
\`\`\`bash
curl -X POST "{{BASE_URL}}/tasks" \\
  -H "Authorization: Bearer {{AGENT_SECRET}}" \\
  -H "Content-Type: application/json" \\
  -d '{"count": 1}'
\`\`\`

## Log Activity Example
\`\`\`bash
curl -X POST "{{BASE_URL}}/log" \\
  -H "Authorization: Bearer {{AGENT_SECRET}}" \\
  -H "Content-Type: application/json" \\
  -d '{"message": "Completed task", "type": "success"}'
\`\`\`
`;

const AGENTS_TEMPLATE = `# AGENTS

Agent: {{AGENT_NAME}}
Role: {{AGENT_ROLE}}
Description: {{AGENT_DESCRIPTION}}
Owner: {{AGENT_OWNER}}
Tools: {{AGENT_TOOLS}}
`;

const BOOT_TEMPLATE = `# BOOT

This file controls the startup behavior for {{AGENT_NAME}}.
`;

const BOOTSTRAP_TEMPLATE = `# BOOTSTRAP

Bootstrap steps for {{AGENT_NAME}}.
`;

const HEARTBEAT_TEMPLATE = `# HEARTBEAT

Heartbeat URL: {{BASE_URL}}
`;

const IDENTITY_TEMPLATE = `# IDENTITY

Name: {{AGENT_NAME}}
Role: {{AGENT_ROLE}}
`;

const SOUL_TEMPLATE = `# SOUL

A short mission statement for {{AGENT_NAME}}.
`;

const TOOLS_TEMPLATE = `# TOOLS

Available tools for {{AGENT_NAME}}:
{{AGENT_TOOLS}}
`;

const USER_TEMPLATE = `# USER

Agent owner: {{AGENT_OWNER}}
`;

export interface AgentProfile {
  name: string;
  description: string;
  role: string;
  tools: string[];
  owner: string;
  openClawRoot?: string;
}

async function ensureCredentialsIgnored(): Promise<void> {
  const gitignorePath = path.join(process.cwd(), '.gitignore');
  const entry = 'orientation/API_creds.md';

  let content = '';
  try {
    content = await fs.readFile(gitignorePath, 'utf8');
  } catch {
    content = '';
  }

  const hasEntry = content
    .split(/\r?\n/)
    .map((line) => line.trim())
    .includes(entry);

  if (!hasEntry) {
    const separator = content.length > 0 && !content.endsWith('\n') ? '\n' : '';
    const nextContent = `${content}${separator}# OpenShield secrets\n${entry}\n`;
    await fs.writeFile(gitignorePath, nextContent, 'utf8');
    console.log(`   🔒 Added ${entry} to .gitignore`);
  }
}

export async function create(agentProfile: AgentProfile): Promise<string> {
  const orientationDir = path.join(process.cwd(), 'orientation');
  console.log(`   📁 Setting up orientation files in: ${orientationDir}`);
  await fs.mkdir(orientationDir, { recursive: true });

  // Generate secret
  const secret = crypto.randomUUID();
  console.log(`   🔑 Generated agent secret`);

  // Write SOPs
  console.log(`   📝 Writing SOPs.md...`);
  await fs.writeFile(
    path.join(orientationDir, 'SOPs.md'),
    SOPs_CONTENT
  );

  // Write API creds
  console.log(`   📝 Writing API_creds.md...`);
  let apiCreds = API_CREDS_TEMPLATE
    .replace(/{{AGENT_NAME}}/g, agentProfile.name)
    .replace(/{{AGENT_SECRET}}/g, secret)
    .replace(/{{BASE_URL}}/g, BASE_URL);
  await fs.writeFile(
    path.join(orientationDir, 'API_creds.md'),
    apiCreds
  );

  // Write dashboard
  console.log(`   📝 Writing dashboard.md...`);
  let dashboard = DASHBOARD_CONTENT_TEMPLATE
    .replace(/{{AGENT_NAME}}/g, agentProfile.name)
    .replace(/{{AGENT_SECRET}}/g, secret)
    .replace(/{{BASE_URL}}/g, BASE_URL);
  await fs.writeFile(
    path.join(orientationDir, 'dashboard.md'),
    dashboard
  );

  // Write OpenClaw user agent templates (in .openclaw root)
  const openClawRoot = path.resolve(agentProfile.openClawRoot || path.join(os.homedir(), '.openclaw'));
  console.log(`   🐾 Setting up OpenClaw templates in: ${openClawRoot}`);
  await fs.mkdir(openClawRoot, { recursive: true });

  const agentDocs = {
    'AGENTS.md': AGENTS_TEMPLATE,
    'BOOT.md': BOOT_TEMPLATE,
    'BOOTSTRAP.md': BOOTSTRAP_TEMPLATE,
    'HEARTBEAT.md': HEARTBEAT_TEMPLATE,
    'IDENTITY.md': IDENTITY_TEMPLATE,
    'SOUL.md': SOUL_TEMPLATE,
    'TOOLS.md': TOOLS_TEMPLATE,
    'USER.md': USER_TEMPLATE,
  };

  for (const [fileName, template] of Object.entries(agentDocs)) {
    console.log(`   📝 Writing ${fileName}...`);
    const payload = template
      .replace(/{{AGENT_NAME}}/g, agentProfile.name)
      .replace(/{{AGENT_DESCRIPTION}}/g, agentProfile.description)
      .replace(/{{AGENT_ROLE}}/g, agentProfile.role)
      .replace(/{{AGENT_OWNER}}/g, agentProfile.owner)
      .replace(/{{AGENT_TOOLS}}/g, agentProfile.tools.join(', '));

    await fs.writeFile(path.join(openClawRoot, fileName), payload);
  }

  console.log(`   📝 Created orientation files for agent "${agentProfile.name}"`);
  console.log(`   🔒 Secret generated (check API_creds.md)`);
  console.log(`   🐾 OpenClaw templates saved to ${openClawRoot}`);

  await ensureCredentialsIgnored();

  return secret;
}