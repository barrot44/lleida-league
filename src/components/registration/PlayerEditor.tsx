import { useState } from 'react';
import { Crown, Save, Shield, UserRound } from 'lucide-react';
import { Modal } from '@/components/ui/Modal';
import { Field } from '@/components/admin/fields';
import { FacePhoto, PrivateDoc } from '@/components/registration/uploads';
import { useUiStore } from '@/store/useUiStore';
import { ageOf, deletePrivate, type PresidentSession, type RegPlayer } from '@/lib/registration';
import { cn } from '@/lib/utils';

interface Props {
  initial: RegPlayer;
  isNew: boolean;
  others: RegPlayer[];
  session: PresidentSession;
  onSave: (p: RegPlayer) => void;
  onClose: () => void;
}

/** One player of the registration: name, dorsal, role, birth date, public face photo and private ID picture. */
export function PlayerEditor({ initial, isNew, others, session, onSave, onClose }: Props) {
  const toast = useUiStore((s) => s.toast);
  const [p, setP] = useState<RegPlayer>(initial);
  const patch = (x: Partial<RegPlayer>) => setP((d) => ({ ...d, ...x }));
  const age = ageOf(p.birthDate);
  const taken = p.dorsal !== null && others.some((o) => o.dorsal === p.dorsal);

  const save = () => {
    if (!p.firstName.trim()) return toast('Escriu com a mínim el nom.', 'error');
    if (taken) return toast(`El dorsal ${p.dorsal} ja el té un altre jugador.`, 'error');
    // The ID picture replaced in this editor is only deleted once the change is kept.
    if (initial.dniPath && initial.dniPath !== p.dniPath) void deletePrivate([initial.dniPath]);
    onSave({ ...p, firstName: p.firstName.trim(), lastName: p.lastName.trim(), nickname: p.nickname.trim() });
  };

  const cancel = () => {
    if (p.dniPath && p.dniPath !== initial.dniPath) void deletePrivate([p.dniPath]);
    onClose();
  };

  return (
    <Modal open onOpenChange={(o) => !o && cancel()} title={isNew ? 'Nou jugador' : 'Edita el jugador'} size="lg">
      <div className="grid gap-6 p-5 sm:grid-cols-[auto_1fr] sm:p-6">
        <div className="flex flex-col items-center gap-2">
          <FacePhoto value={p.photoUrl} onChange={(photoUrl) => patch({ photoUrl })} session={session} size={150} />
          <p className="max-w-[170px] text-center text-[11px] leading-snug text-slate-400">De cara, fons llis, sense gorra ni ulleres de sol. <strong className="text-amber-200">Aquesta foto serà pública.</strong></p>
        </div>

        <div className="grid content-start gap-4 sm:grid-cols-2">
          <Field label="Nom">
            <input className="input" value={p.firstName} onChange={(e) => patch({ firstName: e.target.value })} placeholder="Marc" autoComplete="off" />
          </Field>
          <Field label="Cognoms">
            <input className="input" value={p.lastName} onChange={(e) => patch({ lastName: e.target.value })} placeholder="Puig Serra" autoComplete="off" />
          </Field>
          <Field label="Dorsal" hint={taken ? 'Aquest dorsal ja està agafat.' : undefined}>
            <input
              className={cn('input font-display text-lg font-black', taken && '!border-red-400')}
              type="number"
              inputMode="numeric"
              min={1}
              max={99}
              value={p.dorsal ?? ''}
              onChange={(e) => patch({ dorsal: e.target.value === '' ? null : Math.max(1, Math.min(99, Math.round(Number(e.target.value)))) })}
              placeholder="10"
            />
          </Field>
          <Field label="Àlies (opcional)" hint="El nom que surt als gràfics, si no és el nom.">
            <input className="input" value={p.nickname} onChange={(e) => patch({ nickname: e.target.value })} placeholder="Marquinhos" autoComplete="off" />
          </Field>
          <div>
            <span className="label">Porter o jugador</span>
            <div className="grid grid-cols-2 gap-2">
              {(['porter', 'jugador'] as const).map((r) => (
                <button key={r} type="button" onClick={() => patch({ role: r })} className={cn('flex items-center justify-center gap-2 rounded-xl border py-2.5 text-sm font-bold uppercase', p.role === r ? 'border-amber-400 bg-amber-400/15 text-amber-200' : 'border-white/10 text-slate-400')}>
                  {r === 'porter' ? <Shield size={16} /> : <UserRound size={16} />} {r}
                </button>
              ))}
            </div>
          </div>
          <Field label="Data de naixement" hint={age !== null ? `${age} anys${age < 18 ? ' · menor: al paper de drets d’imatge signa també el pare, la mare o el tutor' : ''}` : undefined}>
            <input className="input" type="date" value={p.birthDate} max={new Date().toISOString().slice(0, 10)} onChange={(e) => patch({ birthDate: e.target.value })} />
          </Field>
          <button type="button" onClick={() => patch({ captain: !p.captain })} className={cn('flex items-center gap-2 rounded-xl border px-3 py-2.5 text-sm font-bold sm:col-span-2', p.captain ? 'border-amber-400 bg-amber-400/15 text-amber-200' : 'border-white/10 text-slate-400')}>
            <Crown size={16} /> {p.captain ? 'És el capità' : 'Marca’l com a capità'}
          </button>
          <div className="sm:col-span-2">
            {p.dniChecked && !p.dniPath ? (
              <p className="rounded-2xl border border-emerald-400/30 bg-emerald-400/[0.06] p-3 text-sm text-emerald-200">✓ Edat comprovada per l’organització (el DNI ja s’ha esborrat).</p>
            ) : (
              <PrivateDoc
                path={p.dniPath}
                label="Foto del DNI (o NIE / passaport)"
                hint="Cara on surt la data de naixement. Només la veu l’organització per comprovar l’edat."
                session={session}
                onChange={(dniPath, previous) => {
                  patch({ dniPath });
                  if (previous && previous !== initial.dniPath) void deletePrivate([previous]);
                }}
              />
            )}
          </div>
        </div>
      </div>
      <div className="flex gap-3 border-t border-white/10 p-5 sm:px-6">
        <button className="btn-ghost flex-1" onClick={cancel}>
          Cancel·la
        </button>
        <button className="btn-gold flex-1" onClick={save}>
          <Save size={16} /> Desa el jugador
        </button>
      </div>
    </Modal>
  );
}
