import terminal from 'terminal-kit';
import chalk from 'chalk';
import boxen from 'boxen';
import ora from 'ora';
import Table from 'cli-table3';
import os from 'os';
import path from 'path';
import fs from 'fs/promises';
import { setModel } from './config.js';
import { create } from './orientation.js';
import { startGateway } from './gateway.js';
import { heartbeat } from './reporter.js';
import * as utils from './utils.js';

const term = terminal.terminal;

export class OpenShieldTUI {
  private spinner: any = null;

  private async waitForAnyKey(): Promise<void> {
    await new Promise<void>((resolve) => term.once('key', () => resolve()));
  }

  private async persistDashboardApiKey(apiKey: string): Promise<void> {
    const orientationDir = path.join(process.cwd(), 'orientation');
    const credsPath = path.join(orientationDir, 'API_creds.md');
    const marker = '**Dashboard API Key:**';

    await fs.mkdir(orientationDir, { recursive: true });

    let content = '';
    try {
      content = await fs.readFile(credsPath, 'utf8');
    } catch {
      content = '# OpenShield API Credentials\n\n';
    }

    const keyLine = `${marker} \`${apiKey}\``;
    if (content.includes(marker)) {
      content = content.replace(/\*\*Dashboard API Key:\*\*.*$/m, keyLine);
    } else {
      content = `${content.trimEnd()}\n\n${keyLine}\n`;
    }

    await fs.writeFile(credsPath, content, 'utf8');
  }

  constructor() {
    // Setup terminal
    term.clear();
    term.hideCursor();
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
    term.clear();
    this.showWelcome();
    term('\n');

    const menuItems = [
      '🚀 Initialize Agent',
      '📊 View Status',
      '⚙️  Configure',
      '❌ Exit'
    ];

    const result = await term.singleColumnMenu(menuItems, { selectedIndex: 0 }).promise;
    const values = ['init', 'status', 'config', 'exit'];
    return values[result.selectedIndex];
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
      }, (error: any, input: string | undefined) => {
        if (error) {
          // term.showCursor(false);
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

  async showConfigMenu(): Promise<string> {
    term.clear();
    this.showWelcome();
    term('\n');

    const menuItems = [
      '🔑 Set Dashboard API Key',
      '🤖 Set Model',
      '📊 View Configuration',
      '⬅️  Back to Main Menu'
    ];

    const result = await term.singleColumnMenu(menuItems, { selectedIndex: 0 }).promise;
    const values = ['set-api-key', 'set-model', 'view-config', 'back'];
    return values[result.selectedIndex];
  }

  async runConfigFlow(): Promise<void> {
    while (true) {
      const choice = await this.showConfigMenu();

      switch (choice) {
        case 'set-api-key':
          await this.setApiKey();
          break;
        case 'set-model':
          await this.setModel();
          break;
        case 'view-config':
          await this.viewConfig();
          break;
        case 'back':
          return;
      }
    }
  }

  async setApiKey(): Promise<void> {
    term.clear();
    this.showWelcome();
    term('\n' + chalk.bold.yellow('🔑 Set Dashboard API Key') + '\n\n');

    const apiKey = await this.promptInput('API Key', 'Enter your dashboard API key:');
    if (apiKey) {
      try {
        await this.persistDashboardApiKey(apiKey);
        term('\n' + chalk.green('✅ API Key saved to orientation/API_creds.md') + '\n');
      } catch (error: any) {
        term('\n' + chalk.red(`❌ Failed to save API key: ${error.message}`) + '\n');
      }
    } else {
      term('\n' + chalk.gray('Cancelled') + '\n');
    }
    term(chalk.gray('Press any key to continue...'));
    await this.waitForAnyKey();
  }

  async setModel(): Promise<void> {
    term.clear();
    this.showWelcome();
    term('\n' + chalk.bold.yellow('🤖 Set Model') + '\n\n');

    const model = await this.promptInput('Model', 'Enter model name (e.g., xai/grok-4-1-reasoning):', 'xai/grok-4-1-reasoning');
    if (model) {
      try {
        await setModel(model);
        term('\n' + chalk.green(`✅ Model set to ${model}`) + '\n');

        // Prompt for API key
        const provider = model.split('/')[0]; // e.g., xai from xai/grok-4-1-reasoning
        const apiKey = await this.promptInput('API Key', `Enter API key for ${provider}:`);
        if (apiKey) {
          await this.setApiKeyForProvider(provider, apiKey);
        } else {
          term('\n' + chalk.gray('API key not set') + '\n');
        }
      } catch (error: any) {
        term('\n' + chalk.red(`❌ Failed to set model: ${error.message}`) + '\n');
      }
    } else {
      term('\n' + chalk.gray('Cancelled') + '\n');
    }
    term(chalk.gray('Press any key to continue...'));
    await this.waitForAnyKey();
  }

  async setApiKeyForProvider(provider: string, apiKey: string): Promise<void> {
    try {
      const openclaw = utils.resolveOpenClawExecutable();
      const input = provider + '\n' + apiKey + '\n';
      const output = await utils.runCommand(openclaw, ['models', 'auth'], {}, input);
      term('\n' + chalk.green(`✅ API key set for ${provider}`) + '\n');
    } catch (error: any) {
      term('\n' + chalk.red(`❌ Failed to set API key: ${error.message}`) + '\n');
    }
  }

  async viewConfig(): Promise<void> {
    term.clear();
    this.showWelcome();
    term('\n' + chalk.bold.yellow('📊 Current Configuration') + '\n\n');

    // Display current model
    try {
      const config = await utils.getOpenClawConfig();
      term(`Model: ${config.agent?.model || 'Not set'}\n`);
    } catch (error) {
      term('Model: Unable to read\n');
    }

    term('\n' + chalk.gray('Press any key to continue...'));
    await this.waitForAnyKey();
  }

  async showStatus(): Promise<void> {
    term.clear();
    this.showWelcome();
    term('\n' + chalk.bold.yellow('📊 Agent Status') + '\n\n');

    try {
      const openClawAvailable = utils.detectOpenClaw();
      term(`OpenClaw CLI: ${openClawAvailable ? chalk.green('Available') : chalk.red('Not found')}\n`);
    } catch (error: any) {
      term(`OpenClaw Status: ${chalk.red('Error checking')} (${error?.message || String(error)})\n`);
    }

    try {
      const config = await utils.getOpenClawConfig();
      const model = config.agent?.model || 'Not set';
      const agentName = config.agent?.name || 'Not set';
      term(`Agent Name: ${chalk.cyan(agentName)}\n`);
      term(`Model: ${chalk.cyan(model)}\n`);
    } catch (error: any) {
      term(`Config: ${chalk.red('Unable to read configuration')}\n`);
    }

    const orientationExists = await (async () => {
      try {
        await fs.access('orientation');
        return true;
      } catch {
        return false;
      }
    })();
    term(`Orientation directory: ${orientationExists ? chalk.green('Present') : chalk.yellow('Absent')}\n`);

    term('\n' + chalk.gray('Press any key to continue...'));
    await this.waitForAnyKey();
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
            await this.waitForAnyKey();
          }
          break;
        case 'status':
          await this.showStatus();
          break;
        case 'config':
          await this.runConfigFlow();
          break;
        case 'exit':
          term.clear();
          process.exit(0);
      }
    }
  }
}