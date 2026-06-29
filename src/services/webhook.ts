export interface WebhookPayload {
  event: string;
  timestamp: number;
  data: any;
}

export function getWebhookUrl(): string {
  return localStorage.getItem('n8nWebhookUrl') || '';
}

export function dispatchWebhookEvent(eventName: string, payloadData: any) {
  const url = getWebhookUrl();
  if (!url || !url.startsWith('http')) return;

  const payload: WebhookPayload = {
    event: eventName,
    timestamp: Date.now(),
    data: payloadData,
  };

  fetch(url, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(payload)
  }).catch(err => {
    console.warn('[DOZERO] Falha ao disparar webhook para n8n:', err);
  });
}
