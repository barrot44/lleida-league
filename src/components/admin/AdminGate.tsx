import { useState, type FormEvent } from 'react';
import { motion } from 'framer-motion';
import { Eye, EyeOff, Lock } from 'lucide-react';
import { Logo } from '@/components/ui/Logo';
import { useUiStore } from '@/store/useUiStore';

export function AdminGate() {
  const unlock = useUiStore((s) => s.unlockAdmin);
  const toast = useUiStore((s) => s.toast);
  const [password, setPassword] = useState('');
  const [show, setShow] = useState(false);
  const [shake, setShake] = useState(0);

  const submit = (e: FormEvent) => {
    e.preventDefault();
    if (unlock(password)) {
      toast('Panel de control desbloqueado.', 'success');
    } else {
      setShake((n) => n + 1);
      setPassword('');
      toast('Contraseña incorrecta.', 'error');
    }
  };

  return (
    <div className="mx-auto grid min-h-[60vh] max-w-md place-items-center px-4 py-16">
      <motion.form
        key={shake}
        onSubmit={submit}
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
        <h1 className="text-3xl">Panel de control</h1>
        <p className="mt-2 text-sm text-slate-400">Acceso exclusivo para la organización de la liga.</p>

        <div className="relative mt-6 text-left">
          <label htmlFor="admin-password" className="label">
            Contraseña
          </label>
          <input
            id="admin-password"
            type={show ? 'text' : 'password'}
            autoComplete="current-password"
            autoFocus
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            className="input !pr-11"
            placeholder="••••••••"
          />
          <button type="button" onClick={() => setShow((s) => !s)} className="absolute bottom-2.5 right-3 text-slate-400 transition hover:text-white" aria-label={show ? 'Ocultar contraseña' : 'Mostrar contraseña'}>
            {show ? <EyeOff size={18} /> : <Eye size={18} />}
          </button>
        </div>

        <button type="submit" className="btn-gold mt-5 w-full" disabled={!password}>
          Entrar
        </button>
      </motion.form>
    </div>
  );
}
