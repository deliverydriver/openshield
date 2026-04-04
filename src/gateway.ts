import { spawn } from 'child_process';
import * as utils from './utils.js';

export async function startGateway(openClawRoot?: string): Promise<void> {
  const openclaw = utils.resolveOpenClawExecutable(openClawRoot);
  console.log(`   🌐 Starting OpenClaw Gateway...`);
  console.log(`   📋 Running: ${openclaw} gateway start (in background)`);
  return new Promise((resolve, reject) => {
    const child = spawn(openclaw, ['gateway', 'start'], {
      stdio: 'ignore',
      detached: true,
      shell: true  // Helps with background on Linux/macOS
    });

    child.on('error', (err) => {
      reject(new Error(`Failed to start gateway: ${err.message}`));
    });

    child.once('spawn', () => {
      child.unref();  // Allow Node to exit
      console.log('   ✅ Gateway started in background (PID: ' + child.pid + ')');
      resolve();
    });
  });
}