import webpush from 'web-push';

/**
 * POST /api/launch — "we're open!" notification the day the launch countdown reaches zero.
 * Anyone may call it (every visitor's browser pings it once after the countdown), but it only sends when:
 *   · the league has a countdown date (`settings.gate.launchAt`) that has already passed (less than 3 days ago), and
 *   · nobody has sent it yet for that date — the row in `launch_notifications` is the lock, so it goes out ONCE.
 * Texts: `gate.pushTitle` / `gate.pushBody` (set in the control room), or the defaults below.
 * Needs VAPID_PRIVATE_KEY and SUPABASE_SERVICE_ROLE_KEY in Vercel.
 */

const PUBLIC_KEY = process.env.VITE_VAPID_PUBLIC_KEY || 'BLOljxZjIJuZj_8cFWFVqWbFUt5hnbchBmCuLXZLkbhgy8Mu2giFzAY3Ik869CzKn8HUGexsL0VRz3QPVinoZ2Y';
const SITE = 'https://www.lleidaleague.com';
const WINDOW_MS = 3 * 24 * 3600 * 1000;

const DEFAULT_TITLE = '🚀 La Lleida League ja és oberta!';
const DEFAULT_BODY = 'Entra ara: equips, calendari, classificació i els directes.';

const clip = (v, n) => String(v ?? '').trim().slice(0, n);

export default async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).json({ error: 'Només POST.' });

  const url = process.env.VITE_SUPABASE_URL?.replace(/\/+$/, '');
  const service = process.env.SUPABASE_SERVICE_ROLE_KEY;
  const priv = process.env.VAPID_PRIVATE_KEY;
  if (!url || !service || !priv) return res.status(500).json({ error: 'missing-config' });

  // Legacy service_role keys are JWTs (eyJ…) and also go as Bearer; the new sb_secret_… keys only go as apikey.
  const headers = service.startsWith('eyJ') ? { apikey: service, Authorization: `Bearer ${service}` } : { apikey: service };
  const call = (path, init = {}) => fetch(`${url}${path}`, { ...init, headers: { ...headers, 'Content-Type': 'application/json', ...(init.headers || {}) } });

  try {
    const g = await call('/rest/v1/league_state?id=eq.main&select=gate:data->settings->gate');
    if (!g.ok) return res.status(500).json({ error: `league_state: ${g.status}` });
    const gate = (await g.json())[0]?.gate;
    const at = Date.parse(gate?.launchAt ?? '');
    const now = Date.now();
    if (!gate || !Number.isFinite(at) || gate.mode === 'maintenance') return res.status(200).json({ sent: false, reason: 'no-launch' });
    if (now < at) return res.status(200).json({ sent: false, reason: 'not-yet' });
    if (now - at > WINDOW_MS) return res.status(200).json({ sent: false, reason: 'too-late' });

    // The lock: only the first call for this launch date inserts the row.
    const claim = await call('/rest/v1/launch_notifications', {
      method: 'POST',
      headers: { Prefer: 'return=representation,resolution=ignore-duplicates' },
      body: JSON.stringify({ launch_at: new Date(at).toISOString() }),
    });
    if (!claim.ok) {
      const text = await claim.text();
      return res.status(500).json({ error: /launch_notifications|PGRST205|does not exist/i.test(text) ? 'missing-table' : text.slice(0, 200) });
    }
    if (!(await claim.json()).length) return res.status(200).json({ sent: false, reason: 'already-sent' });

    const s = await call('/rest/v1/push_subscriptions?select=endpoint,p256dh,auth');
    if (!s.ok) return res.status(500).json({ error: `push_subscriptions: ${s.status}` });
    const subs = await s.json();

    const payload = JSON.stringify({ title: clip(gate.pushTitle, 80) || DEFAULT_TITLE, body: clip(gate.pushBody, 200) || DEFAULT_BODY, url: '/', tag: 'launch' });
    webpush.setVapidDetails(SITE, PUBLIC_KEY, priv);
    const gone = [];
    let sent = 0;
    await Promise.all(
      subs.map(async (x) => {
        try {
          await webpush.sendNotification({ endpoint: x.endpoint, keys: { p256dh: x.p256dh, auth: x.auth } }, payload, { TTL: 24 * 3600, urgency: 'high' });
          sent++;
        } catch (e) {
          if (e && (e.statusCode === 404 || e.statusCode === 410)) gone.push(x.endpoint);
        }
      }),
    );
    await Promise.all(gone.map((e) => call(`/rest/v1/push_subscriptions?endpoint=eq.${encodeURIComponent(e)}`, { method: 'DELETE' }).catch(() => {})));
    return res.status(200).json({ sent: true, delivered: sent, total: subs.length });
  } catch (e) {
    return res.status(500).json({ error: e instanceof Error ? e.message : 'Error' });
  }
}
