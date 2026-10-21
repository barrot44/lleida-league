import { useState, type FormEvent } from 'react';
import { motion } from 'framer-motion';
import { Eye, EyeOff, Loader2, Lock } from 'lucide-react';
import { Logo } from '@/components/ui/Logo';
import { supabaseEnabled } from '@/lib/supabase';
import { useUiStore } from '@/store/useUiStore';

export function AdminGate() {
  const unlock = useUiStore((s) => s.unlockAdmin);
  const signIn = useUiStore((s) => s.signIn);
  const toast = useUiStore((s) => s.toast);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [show, setShow] = useState(false);
  const [shake, setShake] = useState(0);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fail = (message: string) => {
    setShake((n) => n + 1);
    setPassword('');
    setError(message);
    toast(message, 'error');
  };

  const submit = async (e: FormEvent) => {
    e.preventDefault();
    setError(null);
    if (supabaseEnabled) {
      setBusy(true);
      const err = await signIn(email, password);
      setBusy(false);
      if (err) fail(err);
      else toast('Sessió iniciada.', 'success');
      return;
    }
    if (unlock(password)) toast('Tauler de control desbloquejat.', 'success');
    else fail('Contrasenya incorrecta.');
  };

  return (
    <div className="mx-auto grid min-h-[60vh] max-w-md place-items-center px-4 py-16">
      <motion.form
        key={shake}
        onSubmit={(e) => void submit(e)}
        initial={{ opacity: 0, y: 20 }}
        animate={shake ? { opacity: 1, y: 0, x: [0, -12, 12, -8, 8, 0] } : { opacity: 1, y: 0 }}
        transition={{ duration: shake ? 0.45 : 0.5 }}
        className="glass-strong w-full rounded-3xl p-8 text-center shadow-card"
      >
        <div className="relative mx-auto mb-5 w-fit">
          <Logo size={84} />
          <span className="absolute -bottom-1 -right-1 grid h-9 w-9 place-items-center rounded-full bg-gold-gradient text-slate-950 shadow-glow">
            <Lock size={17} />
          </span>
        </div>
        <h1 className="text-3xl">Tauler de control</h1>
        <p className="mt-2 text-sm text-slate-400">Accés exclusiu per a l’organització de la lliga.</p>

        <div className="mt-6 space-y-4 text-left">
          {supabaseEnabled && (
            <div>
              <label htmlFor="admin-email" className="label">
                Correu electrònic
              </label>
              <input id="admin-email" type="email" autoComplete="username" autoFocus value={email} onChange={(e) => setEmail(e.target.value)} className="input" placeholder="admin@lleidaleague.cat" />
            </div>
          )}
          <div className="relative">
            <label htmlFor="admin-password" className="label">
              Contrasenya
            </label>
            <input
              id="admin-password"
              type={show ? 'text' : 'password'}
              autoComplete="current-password"
              autoFocus={!supabaseEnabled}
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="input !pr-11"
              placeholder="••••••••"
            />
            <button type="button" onClick={() => setShow((s) => !s)} className="absolute bottom-2.5 right-3 text-slate-400 transition hover:text-white" aria-label={show ? 'Amaga la contrasenya' : 'Mostra la contrasenya'}>
              {show ? <EyeOff size={18} /> : <Eye size={18} />}
            </button>
          </div>
        </div>

        {error && <p className="mt-4 rounded-xl border border-red-500/30 bg-red-500/10 px-3 py-2 text-sm text-red-300">{error}</p>}

        <button type="submit" className="btn-gold mt-5 w-full" disabled={busy || !password || (supabaseEnabled && !email)}>
          {busy && <Loader2 size={16} className="animate-spin" />} Entra
        </button>

        {!supabaseEnabled && (
          <p className="mt-4 text-xs text-slate-500">Mode local: les dades es guarden només en aquest navegador. Connecta Supabase per tenir login real i dades compartides.</p>
        )}
      </motion.form>
    </div>
  );
}
