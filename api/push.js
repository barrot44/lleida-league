import webpush from 'web-push';

/**
 * POST /api/push — sends a notification to every phone subscribed to the app.
 * Only admins: the caller's Supabase session is checked by the `push_targets()` function of the database.
 * Needs the VAPID_PRIVATE_KEY environment variable in Vercel (the public key is not secret).
 */

const PUBLIC_KEY = process.env.VITE_VAPID_PUBLIC_KEY || 'BLOljxZjIJuZj_8cFWFVqWbFUt5hnbchBmCuLXZLkbhgy8Mu2giFzAY3Ik869CzKn8HUGexsL0VRz3QPVinoZ2Y';
const SITE = 'https://lleida-league.vercel.app';

const clip = (v, n) => String(v ?? '').trim().slice(0, n);

export default async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).json({ error: 'Només POST.' });

  const priv = process.env.VAPID_PRIVATE_KEY;
  const url = process.env.VITE_SUPABASE_URL;
  const anon = process.env.VITE_SUPABASE_ANON_KEY;
  if (!priv) return res.status(500).json({ error: 'missing-vapid' });
  if (!url || !anon) return res.status(500).json({ error: 'missing-supabase' });

  const auth = req.headers.authorization || '';
  if (!auth.startsWith('Bearer ')) return res.status(401).json({ error: 'not-admin' });

  let body = req.body ?? {};
  if (typeof body === 'string') {
    try {
      body = JSON.parse(body);
    } catch {
      body = {};
    }
  }
  const title = clip(body.title, 80);
  if (!title) return res.status(400).json({ error: 'Falta el títol.' });
  const link = typeof body.url === 'string' && body.url.startsWith('/') ? clip(body.url, 120) : '/directe';
  const payload = JSON.stringify({ title, body: clip(body.body, 200), url: link, tag: clip(body.tag, 40) || undefined });

  const rpc = (name, args) =>
    fetch(`${url}/rest/v1/rpc/${name}`, {
      method: 'POST',
      headers: { apikey: anon, Authorization: auth, 'Content-Type': 'application/json' },
      body: JSON.stringify(args),
    });

  const r = await rpc('push_targets', {});
  if (r.status === 401 || r.status === 403) return res.status(403).json({ error: 'not-admin' });
  if (!r.ok) {
    const text = await r.text();
    return res.status(500).json({ error: /push_targets|does not exist|PGRST202/i.test(text) ? 'missing-table' : text.slice(0, 200) });
  }
  const subs = await r.json();

  webpush.setVapidDetails(SITE, PUBLIC_KEY, priv);
  const gone = [];
  let sent = 0;
  await Promise.all(
    subs.map(async (s) => {
      try {
        await webpush.sendNotification({ endpoint: s.endpoint, keys: { p256dh: s.p256dh, auth: s.auth } }, payload, { TTL: 3600, urgency: 'high' });
        sent++;
      } catch (e) {
        if (e && (e.statusCode === 404 || e.statusCode === 410)) gone.push(s.endpoint);
      }
    }),
  );
  if (gone.length) await rpc('push_forget', { p_endpoints: gone }).catch(() => {});
  return res.status(200).json({ sent, total: subs.length, removed: gone.length });
}
