// Main library entry point - re-exports for programmatic use
export { program } from './cli.js';
export * from './config.js';
export * from './reporter.js';
export * from './utils.js';
export { create as createOrientation } from './orientation.js';
export { startGateway } from './gateway.js';
export { sendDirective } from './directive.js';

// Programmatic init
export async function init(agentName?: string) {
  // Delegates to CLI logic (in real impl, extract shared fn)
  console.log('Programmatic init not fully implemented yet. Use CLI: npx openshield init');
}