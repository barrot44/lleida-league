import { useEffect, useState } from 'react';
import { DoorOpen, Eye, Hourglass, Save, Wrench } from 'lucide-react';
import type { GateMode, GateSettings } from '@/types';
import { Field, SectionCard } from '@/components/admin/fields';
import { ConfirmDialog } from '@/components/ui/ConfirmDialog';
import { SiteGate } from '@/components/gate/SiteGate';
import { GATE_DEFAULTS, GATE_LABEL, fromLocalInput, toLocalInput } from '@/lib/gate';
import { cn } from '@/lib/utils';
import { useLeagueStore } from '@/store/useLeagueStore';
import { useUiStore } from '@/store/useUiStore';

const MODES: { id: GateMode; icon: typeof Wrench; title: string; text: string; tone: string }[] = [
  { id: 'off', icon: DoorOpen, title: 'Web oberta', text: 'Tothom pot entrar a la web amb normalitat.', tone: 'border-emerald-400/60 bg-emerald-400/10 text-emerald-300' },
  { id: 'countdown', icon: Hourglass, title: 'Comptador de llançament', text: 'Els visitants veuen un compte enrere gegant i no poden entrar fins que arribi a zero.', tone: 'border-amber-400/60 bg-amber-400/10 text-amber-300' },
  { id: 'maintenance', icon: Wrench, title: 'Manteniment', text: 'Els visitants veuen un avís de manteniment. Tu continues entrant com a administrador.', tone: 'border-red-400/60 bg-red-400/10 text-red-300' },
];

export function GateManager() {
  const gate = useLeagueStore((s) => s.settings.gate);
  const setGate = useLeagueStore((s) => s.setGate);
  const toast = useUiStore((s) => s.toast);
  const [draft, setDraft] = useState<GateSettings>(gate);
  const [preview, setPreview] = useState(false);
  const [confirm, setConfirm] = useState(false);

  // Keep the form in sync when the mode is changed elsewhere (e.g. the quick maintenance button).
  useEffect(() => setDraft(gate), [gate]);

  const patch = (p: Partial<GateSettings>) => setDraft((d) => ({ ...d, ...p }));
  const dirty = JSON.stringify(draft) !== JSON.stringify(gate);
  const defaults = draft.mode === 'maintenance' ? GATE_DEFAULTS.maintenance : GATE_DEFAULTS.countdown;

  const apply = () => {
    setConfirm(false);
    setGate(draft);
    toast(draft.mode === 'off' ? 'Web oberta: tothom hi pot entrar.' : `${GATE_LABEL[draft.mode]} activat: els visitants ja no poden entrar.`, draft.mode === 'off' ? 'success' : 'info');
  };

  const requestApply = () => {
    if (draft.mode === 'countdown' && !draft.launchAt) return toast('Indica la data i l’hora d’obertura del comptador.', 'error');
    if (draft.mode !== 'off' && draft.mode !== gate.mode) setConfirm(true);
    else apply();
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center gap-3 rounded-2xl border border-white/10 bg-white/[0.03] px-4 py-3 text-sm">
        <span className={cn('h-2.5 w-2.5 rounded-full', gate.mode === 'off' ? 'bg-emerald-400' : gate.mode === 'maintenance' ? 'animate-pulse-live bg-red-500' : 'animate-pulse-live bg-amber-400')} />
        <span className="text-slate-300">
          Ara mateix: <strong className="text-white">{GATE_LABEL[gate.mode]}</strong>
          {gate.mode !== 'off' && ' · els visitants no poden entrar a la web'}
        </span>
      </div>

      <SectionCard title="Mode d’accés">
        <div className="grid gap-3 md:grid-cols-3" role="radiogroup" aria-label="Mode d’accés">
          {MODES.map(({ id, icon: Icon, title, text, tone }) => {
            const active = draft.mode === id;
            return (
              <button
                key={id}
                role="radio"
                aria-checked={active}
                onClick={() => patch({ mode: id })}
                className={cn('rounded-2xl border p-4 text-left transition', active ? tone : 'border-white/10 bg-white/[0.03] text-slate-300 hover:border-white/25')}
              >
                <Icon size={24} className="mb-3" />
                <p className="font-display text-lg font-black uppercase text-white">{title}</p>
                <p className="mt-1 text-xs leading-relaxed text-slate-400">{text}</p>
              </button>
            );
          })}
        </div>
      </SectionCard>

      {draft.mode !== 'off' && (
        <SectionCard title="Pantalla que veuran els visitants">
          <div className="grid gap-4 sm:grid-cols-2">
            <Field label="Títol" hint="Buit = text per defecte.">
              <input className="input" value={draft.title} onChange={(e) => patch({ title: e.target.value })} placeholder={defaults.title} />
            </Field>
            <Field label={draft.mode === 'countdown' ? 'Data i hora d’obertura' : 'Tornem a… (opcional)'} hint={draft.mode === 'maintenance' ? 'Si la poses, es mostra un compte enrere amb el temps estimat.' : 'És el moment en què el comptador arriba a zero.'}>
              <div className="flex gap-2">
                <input type="datetime-local" className="input" value={toLocalInput(draft.launchAt)} onChange={(e) => patch({ launchAt: fromLocalInput(e.target.value) })} />
                {draft.launchAt && (
                  <button type="button" className="btn-ghost" onClick={() => patch({ launchAt: '' })} aria-label="Esborra la data">
                    Esborra
                  </button>
                )}
              </div>
            </Field>
            <Field label="Missatge" className="sm:col-span-2" hint="Buit = text per defecte.">
              <textarea className="input min-h-[84px]" value={draft.message} onChange={(e) => patch({ message: e.target.value })} placeholder={defaults.message} />
            </Field>
            {draft.mode === 'countdown' && (
              <label className="flex items-start gap-3 rounded-xl border border-white/10 bg-white/[0.03] p-3 sm:col-span-2">
                <input type="checkbox" className="mt-1 h-4 w-4 accent-amber-400" checked={draft.autoOpen} onChange={(e) => patch({ autoOpen: e.target.checked })} />
                <span>
                  <span className="block text-sm font-bold text-white">Obre la web automàticament quan el comptador arribi a zero</span>
                  <span className="text-xs text-slate-400">Si ho desmarques, la pantalla es queda en zeros fins que tu passis a «Web oberta».</span>
                </span>
              </label>
            )}
          </div>
        </SectionCard>
      )}

      <div className="flex flex-wrap items-center gap-3">
        <button className="btn-gold" onClick={requestApply} disabled={!dirty}>
          <Save size={16} /> {dirty ? 'Aplica els canvis' : 'Canvis aplicats'}
        </button>
        <button className="btn-ghost" onClick={() => setPreview(true)} disabled={draft.mode === 'off'}>
          <Eye size={16} /> Previsualitza
        </button>
      </div>

      <p className="text-xs leading-relaxed text-slate-500">
        Els canvis arriben a tots els visitants en uns 20 segons (si tens Supabase connectat). Aquesta pantalla és una porta a la web, no una protecció de dades: serveix per preparar un llançament o fer
        manteniment, però no amaga la base de dades a algú que la consulti directament.
      </p>

      {preview && <SiteGate gate={draft} preview onClose={() => setPreview(false)} />}

      <ConfirmDialog
        open={confirm}
        title={`Activar «${GATE_LABEL[draft.mode]}»`}
        message="Els visitants deixaran de poder entrar a la web fins que la tornis a obrir. Tu continuaràs veient-la com a administrador."
        confirmLabel="Sí, tanca la web"
        onCancel={() => setConfirm(false)}
        onConfirm={apply}
      />
    </div>
  );
}
