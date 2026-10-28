/**
 * POST /api/president — manages the login of a team president (Supabase Auth user), from the admin panel.
 *   { action: 'create', email, password }   → creates the user, already confirmed
 *   { action: 'password', email, password } → sets a new password
 *   { action: 'delete', email }             → deletes the user
 * Only admins (checked with the caller's session through `is_admin()`).
 * Needs SUPABASE_SERVICE_ROLE_KEY in Vercel (Supabase → Project Settings → API keys → service_role / secret key).
 */

const clip = (v, n) => String(v ?? '').trim().slice(0, n);

export default async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).json({ error: 'Només POST.' });

  const url = process.env.VITE_SUPABASE_URL?.replace(/\/+$/, '');
  const anon = process.env.VITE_SUPABASE_ANON_KEY;
  const service = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !anon) return res.status(500).json({ error: 'missing-supabase' });

  const auth = req.headers.authorization || '';
  if (!auth.startsWith('Bearer ')) return res.status(401).json({ error: 'not-admin' });
  const check = await fetch(`${url}/rest/v1/rpc/is_admin`, { method: 'POST', headers: { apikey: anon, Authorization: auth, 'Content-Type': 'application/json' }, body: '{}' });
  if (!check.ok || (await check.json()) !== true) return res.status(403).json({ error: 'not-admin' });
  if (!service) return res.status(500).json({ error: 'missing-service-key' });

  let body = req.body ?? {};
  if (typeof body === 'string') {
    try {
      body = JSON.parse(body);
    } catch {
      body = {};
    }
  }
  const action = body.action;
  const email = clip(body.email, 200).toLowerCase();
  const password = String(body.password ?? '');
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) return res.status(400).json({ error: 'Correu no vàlid.' });
  if ((action === 'create' || action === 'password') && password.length < 8) return res.status(400).json({ error: 'La contrasenya ha de tenir 8 caràcters o més.' });

  // Legacy service_role keys are JWTs (eyJ…) and also go as Bearer; the new sb_secret_… keys only go as apikey.
  const serviceHeaders = service.startsWith('eyJ') ? { apikey: service, Authorization: `Bearer ${service}` } : { apikey: service };

  const admin = (path, init = {}) =>
    fetch(`${url}/auth/v1/admin${path}`, { ...init, headers: { ...serviceHeaders, 'Content-Type': 'application/json', ...(init.headers || {}) } });

  /** The admin API has no lookup by e-mail: walk the (small) user list. */
  const findUser = async () => {
    for (let page = 1; page <= 20; page++) {
      const r = await admin(`/users?page=${page}&per_page=200`);
      if (!r.ok) return null;
      const out = await r.json();
      const users = out.users ?? [];
      const hit = users.find((u) => (u.email || '').toLowerCase() === email);
      if (hit) return hit;
      if (users.length < 200) return null;
    }
    return null;
  };

  try {
    if (action === 'create') {
      const r = await admin('/users', { method: 'POST', body: JSON.stringify({ email, password, email_confirm: true }) });
      if (r.ok) return res.status(200).json({ ok: true, created: true });
      const text = await r.text();
      if (r.status === 422 || /already|exists|registered/i.test(text)) return res.status(409).json({ error: 'exists' });
      return res.status(500).json({ error: text.slice(0, 200) });
    }
    if (action === 'password' || action === 'delete') {
      const user = await findUser();
      if (!user) return res.status(action === 'delete' ? 200 : 404).json(action === 'delete' ? { ok: true } : { error: 'no-user' });
      // Never touch an administrator's login from here.
      const isAdmin = await fetch(`${url}/rest/v1/admins?select=user_id&user_id=eq.${user.id}`, { headers: serviceHeaders });
      if (!isAdmin.ok || (await isAdmin.json()).length) return res.status(403).json({ error: 'is-admin' });
      const r =
        action === 'password'
          ? await admin(`/users/${user.id}`, { method: 'PUT', body: JSON.stringify({ password, email_confirm: true }) })
          : await admin(`/users/${user.id}`, { method: 'DELETE' });
      if (!r.ok) return res.status(500).json({ error: (await r.text()).slice(0, 200) });
      return res.status(200).json({ ok: true });
    }
    return res.status(400).json({ error: 'Acció desconeguda.' });
  } catch (e) {
    return res.status(500).json({ error: e instanceof Error ? e.message : 'Error' });
  }
}
