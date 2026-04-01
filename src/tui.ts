import terminal from 'terminal-kit';
import chalk from 'chalk';
import boxen from 'boxen';
import ora from 'ora';
import Table from 'cli-table3';
import os from 'os';
import path from 'path';
import * as readline from 'readline';
import { setModel } from './config.js';
import { create } from './orientation.js';
import { startGateway } from './gateway.js';
import { sendDirective } from './directive.js';
import { heartbeat } from './reporter.js';
import * as utils from './utils.js';

const term = terminal.terminal;

export class OpenShieldTUI {
  private spinner: ora.Ora | null = null;

  constructor() {
    // Setup terminal
    term.clear();
    term.hideCursor();
    term.grabInput(); // Enable raw input mode for arrow keys
    process.on('exit', () => {
      term.showCursor();
      term.moveTo(1, term.height);
      term('\n');
    });
    process.on('SIGINT', () => {
      term.showCursor();
      process.exit(0);
    });
  }

  async showWelcome() {
    const welcomeBox = boxen(
      chalk.bold.blue('🚀 OpenShield') + '\n' +
      chalk.gray('One-command OpenClaw + OpenShield setup') + '\n\n' +
      chalk.cyan('Navigate with ↑↓ arrows, Enter to select'),
      {
        padding: 1,
        margin: 1,
        borderStyle: 'round',
        borderColor: 'blue'
      }
    );

    term(welcomeBox);
    term('\n');
  }

  async showMainMenu(): Promise<string> {
    const menuItems = [
      { label: '🚀 Initialize Agent', value: 'init' },
      { label: '📊 View Status', value: 'status' },
      { label: '⚙️  Configure', value: 'config' },
      { label: '❌ Exit', value: 'exit' }
    ];

    const selected = await this.createMenu('Main Menu', menuItems);
    return selected;
  }

  async createMenu(title: string, items: { label: string; value: string }[]): Promise<string> {
    let selectedIndex = 0;

    const renderMenu = () => {
      term.clear();
      this.showWelcome();

      term(chalk.bold.yellow(title) + '\n\n');

      items.forEach((item, index) => {
        const prefix = index === selectedIndex ? chalk.green('▶ ') : '  ';
        const text = index === selectedIndex ? chalk.bold(item.label) : chalk.gray(item.label);
        term(prefix + text + '\n');
      });

      term('\n' + chalk.gray('Use ↑↓ to navigate, Enter to select, Ctrl+C to exit'));
    };

    renderMenu();

    return new Promise((resolve) => {
      const rl = readline.createInterface({
        input: process.stdin,
        output: process.stdout,
        terminal: true
      });

      rl.input.setRawMode(true);

      rl.input.on('data', (key) => {
        const keyStr = key.toString();
        console.log('DEBUG Key received:', JSON.stringify(keyStr), 'code:', keyStr.charCodeAt(0));

        if (keyStr === '\u001b[A') { // Up arrow
          selectedIndex = Math.max(0, selectedIndex - 1);
          renderMenu();
        } else if (keyStr === '\u001b[B') { // Down arrow
          selectedIndex = Math.min(items.length - 1, selectedIndex + 1);
          renderMenu();
        } else if (keyStr === '\r' || keyStr === '\n') { // Enter
          rl.close();
          resolve(items[selectedIndex].value);
        } else if (keyStr === '\u0003') { // Ctrl+C
          rl.close();
          term.showCursor();
          process.exit(0);
        }
      });
    });
  }

  async runInitFlow(): Promise<void> {
    term.clear();
    this.showWelcome();

    // Get agent information
    const agentName = await this.promptInput(
      'Agent Name',
      `Enter agent name (default: ${path.basename(process.cwd())}):`,
      path.basename(process.cwd())
    );
    const description = await this.promptInput('Description', 'Short description of this agent:', 'OpenShield agent for secure orchestration');
    const role = await this.promptInput('Role', 'Agent role/context:', 'assistant');
    const tools = await this.promptInput('Tools', 'Comma-separated tools (shell, api, db):', 'shell,network');
    const owner = await this.promptInput('Owner', 'Agent owner or contact info:', '');
    const openClawRoot = await this.promptInput('OpenClaw root', 'OpenClaw home directory:', path.join(process.env.HOME || os.homedir(), '.openclaw'));

    term('\n' + chalk.bold.cyan('🚀 Starting OpenShield Initialization...') + '\n\n');


    let secret = '';

    const steps = [
      { name: 'Checking requirements', action: async () => {
        const nodeVersion = process.version;
        if (parseInt(nodeVersion.slice(1).split('.')[0]) < 20) {
          throw new Error('Node.js 20+ required');
        }
        return `✅ Node.js ${nodeVersion} detected`;
      }},
      { name: 'Checking OpenClaw installation', action: async () => {
        if (!utils.detectOpenClaw(openClawRoot)) {
          this.showProgress(`Installing OpenClaw to ${openClawRoot}...`);
          await utils.installOpenClaw(openClawRoot);
          return `✅ OpenClaw installed at ${openClawRoot}`;
        } else {
          return `✅ OpenClaw detected (${openClawRoot})`;
        }
      }},
      { name: 'Adding agent to OpenClaw', action: async () => {
        await utils.addAgent(agentName, openClawRoot);
        return `✅ Agent "${agentName}" added to OpenClaw`;
      }},
      { name: 'Configuring model', action: async () => {
        await setModel('xai/grok-4-1-reasoning', openClawRoot);
        return '✅ Model configured to xai/grok-4-1-reasoning';
      }},
      { name: 'Setting up orientation files', action: async () => {
        secret = await create({
          name: agentName,
          description,
          role,
          tools: tools.split(',').map((item: string) => item.trim()).filter(Boolean),
          owner,
          openClawRoot
        });
        return `✅ Orientation files created (secret: ${secret.substring(0, 8)}...)`;
      }},
      { name: 'Starting OpenClaw Gateway', action: async () => {
        await startGateway(openClawRoot);
        return '✅ Gateway started';
      }},
      { name: 'Injecting system directive', action: async () => {
        // await sendDirective(openClawRoot);
        return '⏭️ Directive injection skipped (command not available)';
      }},
      { name: 'Testing dashboard connection', action: async () => {
        await heartbeat(agentName, secret);
        return '✅ Heartbeat sent';
      }}
    ];

    for (const step of steps) {
      try {
        this.showProgress(step.name);
        const result = await step.action();
        this.showSuccess(result);
      } catch (error: any) {
        this.showError(`Failed: ${error.message}`);
        throw error;
      }
    }

    this.showSuccessScreen(agentName);
  }

  async promptInput(title: string, message: string, defaultValue: string = ''): Promise<string> {
    return new Promise((resolve) => {
      term(chalk.bold.yellow(title) + '\n');
      term(message + ' ');

      term.inputField({
        default: defaultValue,
        cancelable: true
      }, (error: any, input: string) => {
        if (error) {
          term.showCursor();
          process.exit(1);
        }
        term('\n');
        resolve(input || defaultValue);
      });
    });
  }

  showProgress(message: string) {
    if (this.spinner) {
      this.spinner.stop();
    }
    this.spinner = ora(message).start();
  }

  showSuccess(message: string) {
    if (this.spinner) {
      this.spinner.succeed(message);
      this.spinner = null;
    } else {
      term(chalk.green('✓ ' + message) + '\n');
    }
  }

  showError(message: string) {
    if (this.spinner) {
      this.spinner.fail(message);
      this.spinner = null;
    } else {
      term(chalk.red('✗ ' + message) + '\n');
    }
  }

  showSuccessScreen(agentName: string) {
    term.clear();
    this.showWelcome();

    const successBox = boxen(
      chalk.bold.green('🎉 SUCCESS!') + '\n\n' +
      chalk.white('OpenShield agent ') + chalk.bold.cyan(agentName) + chalk.white(' is ready!') + '\n\n' +
      chalk.gray('📂 Files created: ./orientation/') + '\n' +
      chalk.gray('🔒 Review API_creds.md (add to .gitignore)') + '\n' +
      chalk.gray('🌐 Dashboard: https://wlepfjchfmekryfnjhir.supabase.co') + '\n\n' +
      chalk.yellow('💡 Gateway runs in background') + '\n' +
      chalk.yellow('   Use `openclaw gateway stop` to stop'),
      {
        padding: 1,
        margin: 1,
        borderStyle: 'round',
        borderColor: 'green'
      }
    );

    term(successBox);
    term('\n' + chalk.gray('Press any key to exit...'));

    term.on('key', () => {
      process.exit(0);
    });
  }

  async showStatus() {
    term.clear();
    this.showWelcome();

    term(chalk.bold.yellow('📊 Agent Status') + '\n\n');

    // Check various statuses
    const statuses = [
      { name: 'OpenClaw', status: utils.detectOpenClaw() ? '✅ Installed' : '❌ Not found' },
      { name: 'Gateway', status: '🔄 Checking...' }, // Would need to check if running
      { name: 'Dashboard', status: '🔄 Checking...' }, // Would need to check connection
    ];

    const table = new Table({
      head: [chalk.bold('Component'), chalk.bold('Status')],
      colWidths: [20, 30]
    });

    statuses.forEach(status => {
      table.push([status.name, status.status]);
    });

    term(table.toString());
    term('\n\n' + chalk.gray('Press any key to return to menu...'));

    return new Promise<void>((resolve) => {
      term.on('key', () => {
        term.removeAllListeners('key');
        resolve();
      });
    });
  }

  async run() {
    while (true) {
      const choice = await this.showMainMenu();

      switch (choice) {
        case 'init':
          try {
            await this.runInitFlow();
          } catch (error) {
            this.showError('Initialization failed');
            term('\n' + chalk.gray('Press any key to continue...'));
            await new Promise(resolve => term.on('key', resolve));
          }
          break;
        case 'status':
          await this.showStatus();
          break;
        case 'config':
          // Placeholder for config menu
          term.clear();
          this.showWelcome();
          term(chalk.yellow('⚙️  Configuration menu coming soon...\n\n'));
          term(chalk.gray('Press any key to continue...'));
          await new Promise(resolve => term.on('key', resolve));
          break;
        case 'exit':
          term.clear();
          process.exit(0);
      }
    }
  }
}