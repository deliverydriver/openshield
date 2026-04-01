const BASE_URL = 'https://wlepfjchfmekryfnjhir.supabase.co/functions/v1/agent-api';

export async function heartbeat(agentName: string, secret: string): Promise<void> {
  const response = await fetch(`${BASE_URL}/heartbeat`, {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${secret}`,
    }
  });

  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(`Dashboard heartbeat failed: ${response.status} ${errorText}`);
  }

  console.log('   ✅ Heartbeat confirmed by dashboard');
}

export async function reportTask(agentName: string, secret: string, count: number = 1): Promise<void> {
  const response = await fetch(`${BASE_URL}/tasks`, {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${secret}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ count })
  });

  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(`Task reporting failed: ${response.status} ${errorText}`);
  }

  console.log(`   ✅ Reported ${count} task(s) completed`);
}