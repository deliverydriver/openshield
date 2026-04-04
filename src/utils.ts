import { spawn, spawnSync, SpawnOptions } from 'child_process';
import fs from 'fs';
import os from 'os';
import path from 'path';

export function resolveOpenClawExecutable(openClawRoot?: string): string {
  if (openClawRoot) {
    // Check multiple possible locations within the root
    const candidates = [
      path.join(openClawRoot, 'bin', 'openclaw'),
      path.join(openClawRoot, 'openclaw'),
      path.join(openClawRoot, 'bin', 'openclaw.exe'), // Windows
      path.join(openClawRoot, 'openclaw.exe') // Windows
    ];

    for (const candidate of candidates) {
      try {
        if (fs.existsSync(candidate) && fs.statSync(candidate).mode & 0o111) {
          return candidate;
        }
      } catch (err) {
        // Continue checking other candidates
      }
    }
  }

  // Check system PATH
  const result = spawnSync('which', ['openclaw'], { encoding: 'utf8' });
  if (result.status === 0 && result.stdout.trim()) {
    return result.stdout.trim();
  }

  return 'openclaw'; // Not found
}

export async function runCommand(cmd: string, args: string[], options: SpawnOptions = {}, input?: string): Promise<string> {
  return new Promise((resolve, reject) => {
    const proc = spawn(cmd, args, { stdio: 'pipe', ...options });
    let output = '';
    proc.stdout?.on('data', (chunk) => { output += chunk.toString(); });
    proc.stderr?.on('data', (chunk) => { output += chunk.toString(); });
    if (input) {
      proc.stdin?.write(input);
      proc.stdin?.end();
    }
    proc.on('close', (code) => {
      if (code === 0) {
        resolve(output.trim());
      } else {
        reject(new Error(`\`${cmd} ${args.join(' ')}\` failed with code ${code}:\\n${output}`));
      }
    });
    proc.on('error', reject);
  });
}

export function detectOpenClaw(openClawRoot?: string): boolean {
  const exePath = resolveOpenClawExecutable(openClawRoot);

  // If we found a local executable, test if it actually works
  if (exePath !== 'openclaw') {
    try {
      const testResult = spawnSync(exePath, ['--version'], {
        encoding: 'utf8',
        timeout: 5000,
        stdio: 'pipe'
      });
      if (testResult.status === 0) {
        console.log(`   ✅ OpenClaw found at ${exePath}`);
        return true;
      } else {
        console.log(`   ⚠️  OpenClaw found at ${exePath} but not working (exit code: ${testResult.status})`);
        return false;
      }
    } catch (error) {
      console.log(`   ⚠️  OpenClaw found at ${exePath} but failed to execute: ${error}`);
      return false;
    }
  }

  // Check system-wide installation
  const result = spawnSync('which', ['openclaw'], { encoding: 'utf8' });
  if (result.status === 0 && result.stdout.trim()) {
    const systemPath = result.stdout.trim();
    try {
      const testResult = spawnSync(systemPath, ['--version'], {
        encoding: 'utf8',
        timeout: 5000,
        stdio: 'pipe'
      });
      if (testResult.status === 0) {
        console.log(`   ✅ OpenClaw found in system PATH: ${systemPath}`);
        return true;
      }
    } catch (error) {
      // System command exists but doesn't work
    }
  }

  console.log('   ❌ OpenClaw not found or not working');
  return false;
}

export async function addAgent(agentName: string, openClawRoot?: string): Promise<void> {
  const exePath = resolveOpenClawExecutable(openClawRoot);
  console.log(`   🤖 Adding agent "${agentName}" to OpenClaw...`);

  // Prefer non-interactive `--yes` if available, but still send line breaks to handle prompts gracefully.
  const cmdArgs = ['agents', 'add', agentName, '--yes'];
  console.log(`   📋 Running: ${exePath} ${cmdArgs.join(' ')}`);

  // If openclaw prompts for values, send multiple enters to accept defaults.
  const input = '\n\n\n\n\n';

  let output;
  try {
    output = await runCommand(exePath, cmdArgs, {}, input);
  } catch (error: any) {
    console.log('   ⚠️ --yes may not be supported, retrying without flag with interactive defaults...');
    output = await runCommand(exePath, ['agents', 'add', agentName], {}, input);
  }

  if (output) {
    console.log(`   📝 Output: ${output}`);
  }
  console.log(`   ✅ Agent "${agentName}" added to OpenClaw`);
}

export async function getOpenClawConfig(openClawRoot?: string): Promise<any> {
  const configPath = path.join(openClawRoot || path.join(os.homedir(), '.openclaw'), 'openclaw.json');
  try {
    const data = await fs.promises.readFile(configPath, 'utf8');
    return JSON.parse(data);
  } catch (error) {
    return {};
  }
}

export async function installOpenClaw(openClawRoot?: string): Promise<string> {
  const installPath = openClawRoot || path.join(os.homedir(), '.openclaw');
  console.log(`   📦 Installing OpenClaw to: ${installPath}`);

  // Ensure the directory exists
  await fs.promises.mkdir(installPath, { recursive: true });

  // Run the official installer
  const installCmd = `curl -fsSL https://openclaw.ai/install.sh | bash -s -- --no-onboard${openClawRoot ? ` --prefix ${openClawRoot}` : ''}`;
  console.log(`   📋 Running installation command: ${installCmd}`);

  try {
    const result = await runCommand('sh', ['-c', installCmd]);
    console.log('   ✅ Installation script completed');

    // Verify the installation worked
    const exePath = resolveOpenClawExecutable(openClawRoot);
    if (exePath !== 'openclaw') {
      const testResult = spawnSync(exePath, ['--version'], {
        encoding: 'utf8',
        timeout: 5000,
        stdio: 'pipe'
      });

      if (testResult.status === 0) {
        console.log(`   ✅ OpenClaw successfully installed and verified at: ${exePath}`);
        return result;
      } else {
        throw new Error(`Installation completed but OpenClaw test failed: ${testResult.stderr || testResult.stdout}`);
      }
    } else {
      throw new Error('Installation completed but OpenClaw executable not found in expected location');
    }
  } catch (error) {
    console.error(`   ❌ OpenClaw installation failed: ${error}`);
    throw error;
  }
}