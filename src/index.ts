// Main library entry point - re-exports for programmatic use
export { program } from './cli.js';
export * from './config.js';
export * from './reporter.js';
export * from './utils.js';
export { create as createOrientation } from './orientation.js';
export { startGateway } from './gateway.js';
export { sendDirective } from './directive.js';

import os from 'os';
import path from 'path';
import { setModel } from './config.js';
import { create } from './orientation.js';
import { startGateway } from './gateway.js';
import { heartbeat } from './reporter.js';
import * as utils from './utils.js';

export interface InitOptions {
  agentName?: string;
  description?: string;
  role?: string;
  tools?: string[];
  owner?: string;
  openClawRoot?: string;
  model?: string;
}

// Programmatic init
export async function init(options: InitOptions = {}): Promise<{ agentName: string; secret: string }> {
  const nodeMajor = parseInt(process.version.slice(1).split('.')[0], 10);
  if (nodeMajor < 20) {
    throw new Error('Node.js 20+ required');
  }

  const openClawRoot = options.openClawRoot || path.join(os.homedir(), '.openclaw');
  const agentName = options.agentName || path.basename(process.cwd());
  const description = options.description || 'OpenShield agent for secure orchestration';
  const role = options.role || 'assistant';
  const tools = options.tools || ['shell', 'network'];
  const owner = options.owner || '';
  const model = options.model || 'xai/grok-4-1-reasoning';

  if (!utils.detectOpenClaw(openClawRoot)) {
    await utils.installOpenClaw(openClawRoot);
  }

  await utils.addAgent(agentName, openClawRoot);
  await setModel(model, openClawRoot);

  const secret = await create({
    name: agentName,
    description,
    role,
    tools,
    owner,
    openClawRoot
  });

  await startGateway(openClawRoot);
  await heartbeat(agentName, secret);

  return { agentName, secret };
}