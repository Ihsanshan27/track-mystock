const LOG_ENDPOINT = '/__jurnal_saham_log';

export function devLog(event, details = {}) {
  if (!import.meta.env.DEV) return;

  const payload = {
    event,
    details,
    timestamp: new Date().toISOString(),
  };

  console.info(`[Jurnal Saham] ${event}`, details);

  fetch(LOG_ENDPOINT, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload),
    keepalive: true,
  }).catch(() => {});
}
