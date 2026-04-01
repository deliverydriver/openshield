import * as utils from './utils.js';

const SYSTEM_DIRECTIVE = `You are an OpenShield agent powered by OpenClaw.

**CRITICAL SETUP:**
- Location: ./orientation/
- SOPs.md: Standard operating procedures - follow strictly
- API_creds.md: Your credentials - use for dashboard reports, NEVER expose
- dashboard.md: Reporting instructions and curl examples

**Behavior:**
1. Review orientation files before every major action.
2. Report initialization, actions, statuses, and errors to the dashboard.
3. Use the exact reporting format from dashboard.md.
4. If reporting fails, retry 3x then log locally.

**Security:** Credentials stay in memory only. No logs.`;

export async function sendDirective(openClawRoot?: string): Promise<string> {
  const openclaw = utils.resolveOpenClawExecutable(openClawRoot);
  return utils.runCommand(
    openclaw,
    ['directive', 'send', '--system', SYSTEM_DIRECTIVE]
  );
}