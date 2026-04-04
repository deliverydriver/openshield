import { Command } from 'commander';
import inquirer from 'inquirer';
import os from 'os';
import path from 'path';
import fs from 'fs/promises';
import { setModel } from './config.js';
import { create } from './orientation.js';
import { startGateway } from './gateway.js';
import { heartbeat } from './reporter.js';
import * as utils from './utils.js';
import { OpenShieldTUI } from './tui.js';

const program = new Command()
  .name('openshield')
  .description('One-command OpenClaw + OpenShield setup')
  .version('0.4.0');

program.option('-y, --yes', 'non-interactive mode (defaults)', false);
program.option('--tui', 'enable terminal user interface', true);
program.option('--no-tui', 'disable terminal user interface');
program.option('--openclaw-root <path>', 'OpenClaw root path', path.join(os.homedir(), '.openclaw'));

program
  .command('init')
  .description('Initialize OpenShield agent with dashboard reporting')
  .action(async (cmd) => {
    const yes = cmd.yes || program.opts().yes;
    const opts = program.opts();
    const useTui = opts.tui !== false && process.stdout.isTTY;

    if (useTui) {
      // Use the new TUI
      const tui = new OpenShieldTUI();
      await tui.run();
      return;
    }

    // Fallback to original CLI logic
    let answers;
    if (!yes) {
      answers = await inquirer.prompt([
        {
          type: 'input',
          name: 'agentName',
          message: 'Agent name:',
          default: () => path.basename(process.cwd())
        },
        {
          type: 'confirm',
          name: 'proceed',
          message: '🚀 Proceed with OpenShield initialization?\\n(This installs OpenClaw, creates files, starts gateway, connects dashboard)',
          default: true
        },
        {
          type: 'input',
          name: 'description',
          message: 'Agent description:',
          default: 'OpenShield agent for secure agent orchestration'
        },
        {
          type: 'input',
          name: 'role',
          message: 'Agent role (identity/context):',
          default: 'assistant'
        },
        {
          type: 'input',
          name: 'tools',
          message: 'Comma-separated tools (e.g. shell, api, db):',
          default: 'shell,network'
        },
        {
          type: 'input',
          name: 'owner',
          message: 'Agent owner/contact:',
          default: ''
        },
        {
          type: 'input',
          name: 'openClawRoot',
          message: 'OpenClaw root directory:',
          default: path.join(os.homedir(), '.openclaw')
        }
      ]);
      if (!answers.proceed) {
        console.log('👋 Initialization aborted.');
        process.exit(0);
      }
    } else {
      answers = {
        proceed: true,
        agentName: path.basename(process.cwd()),
        description: 'OpenShield agent',
        role: 'assistant',
        tools: 'default',
        owner: '',
        openClawRoot: path.join(os.homedir(), '.openclaw')
      };
    }
    const { agentName, description, role, tools, owner, openClawRoot } = answers;

    try {
      console.log('\\n🔍 Checking requirements...');
      // Check Node.js version
      const nodeVersion = process.version;
      console.log(`   📦 Node.js version: ${nodeVersion}`);
      if (parseInt(nodeVersion.slice(1).split('.')[0]) < 20) {
        throw new Error('Node.js 20+ required');
      }

      console.log('\\n🔍 Checking OpenClaw installation...');
      if (!utils.detectOpenClaw(openClawRoot)) {
        console.log('📦 OpenClaw not found. Installing latest version...');
        await utils.installOpenClaw(openClawRoot);
      } else {
        console.log('✅ OpenClaw detected.');
      }

      console.log(`\\n🤖 Adding agent "${agentName}" to OpenClaw...`);
      await utils.addAgent(agentName, openClawRoot);

      console.log('\\n⚙️  Configuring model to xai/grok-4-1-reasoning...');
      await setModel('xai/grok-4-1-reasoning', openClawRoot);

      console.log('\n📁 Setting up orientation files...');
      const secret = await create({
        name: agentName,
        description: description || 'OpenShield agent',
        role: role || 'assistant',
        tools: (tools || 'shell').split(',').map((item: string) => item.trim()).filter(Boolean),
        owner: owner || '',
        openClawRoot
      });

      console.log('\n🌐 Starting OpenClaw Gateway...');
      await startGateway(openClawRoot);

      console.log('\\n📤 System directive injection skipped (OpenClaw directive command not available in current toolchain)...');
      // await sendDirective(openClawRoot);

      console.log('\\n❤️ Testing dashboard connection...');
      await heartbeat(agentName, secret);

      console.log('\\n🎉  SUCCESS! OpenShield agent ready.');
      console.log('📂 Files created: ./orientation/');
      console.log('🔒 Review API_creds.md (add to .gitignore)');
      console.log('🌐 Dashboard API: https://wlepfjchfmekryfnjhir.supabase.co/functions/v1/agent-api');
      console.log('\\n💡 Gateway runs in background. Use `openclaw gateway stop` to stop.');
    } catch (error: any) {
      console.error('\\n❌ Initialization failed:', error.message);
      process.exit(1);
    }
  });

program
  .command('tui')
  .description('Launch the OpenShield Terminal User Interface')
  .action(async () => {
    if (!process.stdout.isTTY) {
      console.error('Error: TUI requires an interactive terminal (TTY). Use `openshield init --no-tui` for non-interactive setup.');
      process.exit(1);
    }
    const tui = new OpenShieldTUI();
    await tui.run();
  });

program
  .command('status')
  .description('Show OpenShield/OpenClaw status in the current workspace')
  .action(async () => {
    console.log('\\n📊 OpenShield Status');
    console.log('--------------------');

    try {
      const openClawAvailable = utils.detectOpenClaw();
      console.log(`OpenClaw CLI: ${openClawAvailable ? 'Available' : 'Not found'}`);
    } catch (error: any) {
      console.log(`OpenClaw CLI: Error (${error?.message || String(error)})`);
    }

    try {
      const config = await utils.getOpenClawConfig();
      const model = config.agent?.model || 'Not set';
      const agentName = config.agent?.name || 'Not set';
      console.log(`Agent Name: ${agentName}`);
      console.log(`Model: ${model}`);
    } catch {
      console.log('Config: Unable to read OpenClaw configuration');
    }

    try {
      await fs.access(path.join(process.cwd(), 'orientation'));
      console.log('Orientation Directory: Present');
    } catch {
      console.log('Orientation Directory: Absent');
    }
  });

// CLI entry point detection (CJS)
if (typeof require !== 'undefined' && require.main === module) {
  program.parse();
}

export { program };