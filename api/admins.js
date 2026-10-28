/**
 * POST /api/admins — who can enter the control room, managed from the panel itself.
 *   { action: 'list' }                    → [{ email, since, me }]
 *   { action: 'add', email, password? }   → gives admin rights; creates the (confirmed) user first if needed (then `password` is required)
 *   { action: 'remove', email }           → takes the admin rights away (the login stays: it may also be a president's)
 * Only admins (checked with the caller's session through `is_admin()`). Nobody can remove themselves or the last admin.
 * Needs SUPABASE_SERVICE_ROLE_KEY in Vercel.
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

  // Legacy service_role keys are JWTs (eyJ…) and also go as Bearer; the new sb_secret_… keys only go as apikey.
  const serviceHeaders = service.startsWith('eyJ') ? { apikey: service, Authorization: `Bearer ${service}` } : { apikey: service };
  const call = (path, init = {}) => fetch(`${url}${path}`, { ...init, headers: { ...serviceHeaders, 'Content-Type': 'application/json', ...(init.headers || {}) } });

  /** The admin API has no lookup by e-mail: walk the (small) user list. */
  const allUsers = async () => {
    const out = [];
    for (let page = 1; page <= 20; page++) {
      const r = await call(`/auth/v1/admin/users?page=${page}&per_page=200`);
      if (!r.ok) throw new Error(`Usuaris: ${r.status}`);
      const users = (await r.json()).users ?? [];
      out.push(...users);
      if (users.length < 200) break;
    }
    return out;
  };
  const adminRows = async () => {
    const r = await call('/rest/v1/admins?select=user_id,created_at');
    if (!r.ok) throw new Error(`Administradors: ${r.status}`);
    return r.json();
  };
  const me = async () => {
    const r = await fetch(`${url}/auth/v1/user`, { headers: { apikey: anon, Authorization: auth } });
    return r.ok ? (await r.json()).id : null;
  };

  try {
    if (action === 'list') {
      const [rows, users, myId] = await Promise.all([adminRows(), allUsers(), me()]);
      const byId = new Map(users.map((u) => [u.id, u]));
      const list = rows
        .map((a) => ({ email: byId.get(a.user_id)?.email ?? '(usuari esborrat)', since: a.created_at, me: a.user_id === myId }))
        .sort((a, b) => a.since.localeCompare(b.since));
      return res.status(200).json({ admins: list });
    }

    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) return res.status(400).json({ error: 'Correu no vàlid.' });
    const user = (await allUsers()).find((u) => (u.email || '').toLowerCase() === email);

    if (action === 'add') {
      let id = user?.id;
      let created = false;
      if (!id) {
        if (password.length < 8) return res.status(400).json({ error: 'La contrasenya ha de tenir 8 caràcters o més.' });
        const r = await call('/auth/v1/admin/users', { method: 'POST', body: JSON.stringify({ email, password, email_confirm: true }) });
        if (!r.ok) return res.status(500).json({ error: (await r.text()).slice(0, 200) });
        id = (await r.json()).id;
        created = true;
      }
      const r = await call('/rest/v1/admins', { method: 'POST', headers: { Prefer: 'resolution=ignore-duplicates' }, body: JSON.stringify({ user_id: id }) });
      if (!r.ok) return res.status(500).json({ error: (await r.text()).slice(0, 200) });
      return res.status(200).json({ ok: true, created });
    }

    if (action === 'remove') {
      if (!user) return res.status(404).json({ error: 'no-user' });
      if (user.id === (await me())) return res.status(400).json({ error: 'self' });
      const rows = await adminRows();
      if (!rows.some((a) => a.user_id === user.id)) return res.status(200).json({ ok: true });
      if (rows.length <= 1) return res.status(400).json({ error: 'last' });
      const r = await call(`/rest/v1/admins?user_id=eq.${user.id}`, { method: 'DELETE' });
      if (!r.ok) return res.status(500).json({ error: (await r.text()).slice(0, 200) });
      return res.status(200).json({ ok: true });
    }

    return res.status(400).json({ error: 'Acció desconeguda.' });
  } catch (e) {
    return res.status(500).json({ error: e instanceof Error ? e.message : 'Error' });
  }
}
