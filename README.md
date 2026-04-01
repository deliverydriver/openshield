# OpenShield

One-command installer and configurator for [OpenClaw](https://openclaw.ai) agents with OpenShield dashboard integration.

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

For non-interactive mode:

```bash
npx openshield@latest init --yes
```

Or disable the TUI:

```bash
npx openshield@latest init --no-tui
```

## 📋 What's Created

```
./orientation/
├── SOPs.md              # Standard operating procedures
├── API_creds.md         # Your agent secret & API URL (KEEP PRIVATE)
└── dashboard.md         # Reporting instructions & examples
```

## 🎨 Terminal User Interface

OpenShield features a modern terminal user interface with:

- **Interactive Menus**: Navigate with arrow keys and Enter
- **Progress Tracking**: Real-time status updates during initialization
- **Visual Feedback**: Color-coded success/error indicators
- **Status Dashboard**: View agent and component status
- **Configuration Options**: Future settings management

The TUI is enabled by default. Use `--no-tui` for traditional CLI prompts.

## 🔧 Development

```bash
git clone &lt;repo&gt;
cd openshield
npm install
npm run dev          # Development mode with TUI
npm run build        # Build for distribution
npm publish          # Publish to npm
```

The TUI is built with `terminal-kit`, `chalk`, `boxen`, `ora`, and `cli-table3` for a rich terminal experience.

## 📖 License

MIT