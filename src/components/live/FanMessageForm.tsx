import { useState, type FormEvent } from 'react';
import { Loader2, MessageCircle, Send } from 'lucide-react';
import { FAN_NAME_MAX, FAN_TEXT_MAX, cooldownLeft, sendFanMessage } from '@/lib/fanMessages';
import { useUiStore } from '@/store/useUiStore';

const NAME_KEY = 'lleida-league:fan-name';

/** "Send a message to the broadcast": the best ones appear on screen during the live. */
export function FanMessageForm() {
  const toast = useUiStore((s) => s.toast);
  const [name, setName] = useState(() => {
    try {
      return localStorage.getItem(NAME_KEY) ?? '';
    } catch {
      return '';
    }
  });
  const [text, setText] = useState('');
  const [sending, setSending] = useState(false);

  const send = async (e: FormEvent) => {
    e.preventDefault();
    setSending(true);
    const res = await sendFanMessage(name, text);
    setSending(false);
    if (res === 'ok') {
      setText('');
      try {
        localStorage.setItem(NAME_KEY, name.trim());
      } catch {
        /* ignore */
      }
      toast('Missatge enviat! Si el trien, sortirà al directe 📺');
    } else if (res === 'wait') toast(`Espera ${cooldownLeft()} s abans d’enviar-ne un altre.`, 'info');
    else if (res === 'invalid') toast('Escriu el teu nom i un missatge.', 'error');
    else toast('No s’ha pogut enviar. Torna-ho a provar.', 'error');
  };

  return (
    <form onSubmit={(e) => void send(e)} className="card space-y-3 p-4 sm:p-6">
      <h2 className="flex items-center gap-2 font-display text-xl font-black uppercase text-white">
        <MessageCircle size={20} className="text-cyan-300" /> Envia un missatge al directe
      </h2>
      <p className="text-xs text-slate-400">Ànims, salutacions, prediccions… Els millors sortiran a la pantalla de la retransmissió.</p>
      <input className="input" value={name} maxLength={FAN_NAME_MAX} onChange={(e) => setName(e.target.value)} placeholder="El teu nom" aria-label="El teu nom" autoComplete="nickname" />
      <div className="relative">
        <textarea className="input min-h-[84px] resize-none pr-14" value={text} maxLength={FAN_TEXT_MAX} onChange={(e) => setText(e.target.value)} placeholder="El teu missatge" aria-label="El teu missatge" />
        <span className="absolute bottom-2 right-3 text-[11px] text-slate-500">
          {text.length}/{FAN_TEXT_MAX}
        </span>
      </div>
      <button className="btn-gold w-full" disabled={sending || !name.trim() || text.trim().length < 2}>
        {sending ? <Loader2 size={16} className="animate-spin" /> : <Send size={16} />} Envia
      </button>
    </form>
  );
}
