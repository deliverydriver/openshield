const BASE_URL = 'https://wlepfjchfmekryfnjhir.supabase.co/functions/v1/agent-api';

type LogType = 'success' | 'info' | 'alert' | 'error';
type AgentStatus = 'active' | 'inactive' | 'error' | 'maintenance';

async function wait(ms: number): Promise<void> {
  await new Promise((resolve) => setTimeout(resolve, ms));
}

async function writeLocalFailureLog(entry: Record<string, unknown>): Promise<void> {
  const fs = await import('fs/promises');
  const path = await import('path');
  const filePath = path.join(process.cwd(), 'orientation', 'local_report_failures.log');
  const line = JSON.stringify({ timestamp: new Date().toISOString(), ...entry });

  try {
    await fs.mkdir(path.dirname(filePath), { recursive: true });
    await fs.appendFile(filePath, `${line}\n`, 'utf8');
  } catch {
    // Best-effort fallback; reporting path should not crash the main flow.
  }
}

async function apiRequest<T = void>(
  endpoint: string,
  secret: string,
  options: {
    method: 'GET' | 'POST';
    body?: Record<string, unknown>;
    retries?: number;
    retryDelayMs?: number;
    localFailureLogContext?: Record<string, unknown>;
  }
): Promise<T> {
  const retries = options.retries ?? 1;
  const retryDelayMs = options.retryDelayMs ?? 1000;
  let lastError: Error | null = null;

  for (let attempt = 1; attempt <= retries; attempt += 1) {
    try {
      const response = await fetch(`${BASE_URL}${endpoint}`, {
        method: options.method,
        headers: {
          'Authorization': `Bearer ${secret}`,
          ...(options.body ? { 'Content-Type': 'application/json' } : {})
        },
        ...(options.body ? { body: JSON.stringify(options.body) } : {})
      });

      if (!response.ok) {
        const errorText = await response.text();
        throw new Error(`${response.status} ${errorText}`);
      }

      if (options.method === 'GET') {
        return (await response.json()) as T;
      }

      return undefined as T;
    } catch (error: any) {
      lastError = error instanceof Error ? error : new Error(String(error));
      if (attempt < retries) {
        await wait(retryDelayMs);
      }
    }
  }

  if (options.localFailureLogContext) {
    await writeLocalFailureLog({
      endpoint,
      error: lastError?.message || 'unknown error',
      ...options.localFailureLogContext
    });
  }

  throw new Error(`Request to ${endpoint} failed after ${retries} attempt(s): ${lastError?.message || 'unknown error'}`);
}

export async function heartbeat(agentName: string, secret: string): Promise<void> {
  console.log(`   ❤️ Testing dashboard connection for agent "${agentName}"...`);
  console.log(`   📡 Sending heartbeat to: ${BASE_URL}/heartbeat`);
  await apiRequest('/heartbeat', secret, {
    method: 'POST',
    retries: 3,
    retryDelayMs: 1500,
    localFailureLogContext: {
      type: 'heartbeat',
      agentName
    }
  });

  console.log('   ✅ Heartbeat confirmed by dashboard');
}

export async function reportTask(agentName: string, secret: string, count: number = 1): Promise<void> {
  await apiRequest('/tasks', secret, {
    method: 'POST',
    body: { count, agentName }
  });

  console.log(`   ✅ Reported ${count} task(s) completed`);
}

export async function reportLog(agentName: string, secret: string, message: string, type: LogType = 'info'): Promise<void> {
  await apiRequest('/log', secret, {
    method: 'POST',
    body: { message, type, agentName }
  });
  console.log(`   ✅ Logged ${type} activity`);
}

export async function setStatus(agentName: string, secret: string, status: AgentStatus): Promise<void> {
  await apiRequest('/status', secret, {
    method: 'POST',
    body: { status, agentName }
  });
  console.log(`   ✅ Status set to ${status}`);
}

export async function getStatus(secret: string): Promise<{ status?: string; [key: string]: unknown }> {
  return apiRequest('/status', secret, { method: 'GET' });
}

export async function getLogs(secret: string): Promise<Array<Record<string, unknown>>> {
  return apiRequest('/logs', secret, { method: 'GET' });
}