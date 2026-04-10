# OpenShield

One-command installer and configurator for [OpenClaw](https://openclaw.ai) agents with OpenShield dashboard integration.

Current package version: `0.4.0`

## 🚀 Quick Start

Run in any directory:

```bash
npx openshield@latest init
```

This launches an interactive terminal user interface (TUI) that guides you through:
- Agent name configuration
- OpenClaw installation and setup
- Model configuration
- Orientation file creation
- Gateway startup
- Dashboard connection testing

OpenShield installs OpenClaw with onboarding disabled, then creates and configures the agent automatically.

For non-interactive mode:

```bash
npx openshield@latest init --yes
```

Or disable the TUI:

```bash
npx openshield@latest init --no-tui
```

Show current status:

```bash
npx openshield@latest status
```

## 📋 What's Created

```
./orientation/
├── SOPs.md              # Standard operating procedures
├── API_creds.md         # Your agent secret & API URL (KEEP PRIVATE)
└── dashboard.md         # Reporting instructions & examples
```

OpenShield also adds `orientation/API_creds.md` to `.gitignore` automatically.

## ✅ Current Behavior

- Installs OpenClaw with `--no-onboard`
- Creates an OpenClaw agent automatically
- Sets the default model
- Writes OpenShield orientation files and OpenClaw template docs
- Starts the OpenClaw gateway
- Attempts an initial dashboard heartbeat
- Skips directive injection until the OpenClaw directive command is available

If dashboard credentials are not ready yet, initialization can still complete up to the heartbeat step. Heartbeat auth can be updated later.

## 🖥️ Commands

```bash
openshield init        # full setup flow
openshield tui         # launch terminal UI directly
openshield status      # show OpenClaw/OpenShield status
```

## 🎨 Terminal User Interface

OpenShield features a modern terminal user interface with:

- **Interactive Menus**: Navigate with arrow keys and Enter
- **Progress Tracking**: Real-time status updates during initialization
- **Visual Feedback**: Color-coded success/error indicators
- **Status Dashboard**: View agent and component status
- **Configuration Options**: Set dashboard API keys and model settings

The TUI is enabled by default. Use `--no-tui` for traditional CLI prompts.

## 📦 Programmatic Usage

```js
import { init, heartbeat, reportTask, reportLog, setStatus, getStatus, getLogs } from 'openshield';
```

The library entrypoint exports the initialization flow plus dashboard reporting helpers.

## 🧪 Verification

The package includes a smoke/integration validation suite:

```bash
npm run test      # build + node:test coverage for reporting/orientation flows
npm run verify    # test + CLI help smoke test + npm pack dry-run
```

`npm publish` triggers `prepublishOnly`, which runs `npm run verify`.

## 🔧 Development

```bash
git clone &lt;repo&gt;
cd openshield
npm install
npm run dev          # Development mode with TUI
npm run build        # Build for distribution
npm run test         # Run package test suite
npm run verify       # Full release validation
npm pack --dry-run   # Check publish contents
npm publish          # Publish to npm
```

The TUI is built with `terminal-kit`, `chalk`, `boxen`, `ora`, and `cli-table3` for a rich terminal experience.

Orientation files and examples reference the API docs at `https://agents.openshield.cc/docs/api`.

## 📖 License

MIT