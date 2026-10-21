import { useMemo, useState } from 'react';
import { ArrowDownRight, ArrowUpRight, Coins, Plus, Trash2 } from 'lucide-react';
import type { LleidalitoKind, LleidalitoTx } from '@/types';
import { Field, SectionCard } from '@/components/admin/fields';
import { ConfirmDialog } from '@/components/ui/ConfirmDialog';
import { TeamCrest } from '@/components/ui/TeamCrest';
import { CATEGORY_BY_ID } from '@/config/site';
import { KIND_LABEL, SPENDING_KINDS, balances, newestFirst, signed, usesLleidalitos } from '@/lib/lleidalitos';
import { cn, formatDateShort, matchTimestamp, toISODate, uid } from '@/lib/utils';
import { useLookups } from '@/hooks/useLeagueView';
import { useLeagueStore } from '@/store/useLeagueStore';
import { useUiStore } from '@/store/useUiStore';

const KINDS: LleidalitoKind[] = ['ajuda', 'premi', 'fitxatge', 'compra', 'ajust'];

export function LleidalitosManager() {
  const teams = useLeagueStore((s) => s.teams);
  const txs = useLeagueStore((s) => s.lleidalitoTx);
  const matches = useLeagueStore((s) => s.matches);
  const upsertTx = useLeagueStore((s) => s.upsertLleidalitoTx);
  const deleteTx = useLeagueStore((s) => s.deleteLleidalitoTx);
  const toast = useUiStore((s) => s.toast);
  const { teamMap } = useLookups();

  const lteams = useMemo(() => teams.filter(usesLleidalitos), [teams]);
  const bal = useMemo(() => balances(teams, txs), [teams, txs]);
  const total = [...bal.values()].reduce((a, b) => a + b, 0);

  const [teamId, setTeamId] = useState('');
  const [kind, setKind] = useState<LleidalitoKind>('ajuda');
  const [income, setIncome] = useState(false);
  const [amount, setAmount] = useState(50);
  const [concept, setConcept] = useState('');
  const [date, setDate] = useState(toISODate(new Date()));
  const [matchId, setMatchId] = useState('');
  const [removing, setRemoving] = useState<LleidalitoTx | null>(null);

  const activeTeam = lteams.find((t) => t.id === teamId) ?? lteams[0];
  const teamMatches = useMemo(
    () => (activeTeam ? matches.filter((m) => m.homeTeamId === activeTeam.id || m.awayTeamId === activeTeam.id).sort((a, b) => matchTimestamp(b) - matchTimestamp(a)).slice(0, 14) : []),
    [matches, activeTeam],
  );

  const pickKind = (k: LleidalitoKind) => {
    setKind(k);
    setIncome(!SPENDING_KINDS.includes(k) && k !== 'ajust');
    if (k !== 'ajuda') setMatchId('');
  };

  const save = () => {
    if (!activeTeam) return toast('Cap equip fa servir els Lleidalitos encara.', 'error');
    const n = Math.round(Number(amount));
    if (!Number.isFinite(n) || n <= 0) return toast('Indica un import més gran que zero.', 'error');
    upsertTx({
      id: uid('tx'),
      teamId: activeTeam.id,
      amount: income ? n : -n,
      kind,
      concept: concept.trim() || KIND_LABEL[kind],
      date,
      matchId: matchId || undefined,
    });
    toast(`Moviment registrat: ${activeTeam.shortName} ${signed(income ? n : -n)} Lleidalitos.`);
    setConcept('');
    setMatchId('');
  };

  return (
    <div className="space-y-6">
      <div className="grid gap-3 sm:grid-cols-3">
        <div className="card px-4 py-3">
          <p className="digital text-3xl text-gold-gradient">{total.toLocaleString('ca-ES')}</p>
          <p className="text-[11px] font-bold uppercase tracking-[0.18em] text-slate-400">Lleidalitos en circulació</p>
        </div>
        <div className="card px-4 py-3">
          <p className="digital text-3xl text-white">{lteams.length}</p>
          <p className="text-[11px] font-bold uppercase tracking-[0.18em] text-slate-400">Equips amb saldo</p>
        </div>
        <div className="card px-4 py-3">
          <p className="digital text-3xl text-white">{txs.length}</p>
          <p className="text-[11px] font-bold uppercase tracking-[0.18em] text-slate-400">Moviments registrats</p>
        </div>
      </div>

      <SectionCard title="Registra un moviment">
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          <Field label="Equip" className="lg:col-span-2">
            <select className="input" value={activeTeam?.id ?? ''} onChange={(e) => { setTeamId(e.target.value); setMatchId(''); }}>
              {lteams.map((t) => (
                <option key={t.id} value={t.id}>
                  {t.name} — {bal.get(t.id)} Ł
                </option>
              ))}
            </select>
          </Field>
          <Field label="Tipus">
            <select className="input" value={kind} onChange={(e) => pickKind(e.target.value as LleidalitoKind)}>
              {KINDS.map((k) => (
                <option key={k} value={k}>
                  {KIND_LABEL[k]}
                </option>
              ))}
            </select>
          </Field>
          <Field label="Data">
            <input type="date" className="input" value={date} onChange={(e) => setDate(e.target.value)} />
          </Field>

          <div className="sm:col-span-2 lg:col-span-4 grid gap-4 sm:grid-cols-[auto_150px_1fr]">
            <div>
              <span className="label">Direcció</span>
              <div className="inline-flex gap-1 rounded-2xl border border-white/10 bg-pitch/60 p-1" role="radiogroup" aria-label="Ingrés o despesa">
                <button role="radio" aria-checked={!income} onClick={() => setIncome(false)} className={cn('inline-flex items-center gap-1.5 rounded-xl px-4 py-2 text-sm font-black uppercase transition', !income ? 'bg-red-500 text-white shadow-red' : 'text-slate-400 hover:text-white')}>
                  <ArrowDownRight size={15} /> Despesa
                </button>
                <button role="radio" aria-checked={income} onClick={() => setIncome(true)} className={cn('inline-flex items-center gap-1.5 rounded-xl px-4 py-2 text-sm font-black uppercase transition', income ? 'bg-emerald-500 text-emerald-950 shadow-emerald' : 'text-slate-400 hover:text-white')}>
                  <ArrowUpRight size={15} /> Ingrés
                </button>
              </div>
            </div>
            <Field label="Import (Ł)">
              <input type="number" min={1} className="input font-display text-lg font-black" value={amount} onChange={(e) => setAmount(Number(e.target.value))} />
            </Field>
            <Field label="Concepte" hint="Buit = el nom del tipus.">
              <input className="input" value={concept} onChange={(e) => setConcept(e.target.value)} placeholder="Ajuda: porteria doble a la 2a part" />
            </Field>
          </div>

          {kind === 'ajuda' && (
            <Field label="Partit on s’ha gastat (opcional)" className="sm:col-span-2 lg:col-span-4" hint="Si el lligues, l’ajuda també es veu a la fitxa del partit.">
              <select className="input" value={matchId} onChange={(e) => setMatchId(e.target.value)}>
                <option value="">—</option>
                {teamMatches.map((m) => (
                  <option key={m.id} value={m.id}>
                    {CATEGORY_BY_ID[m.category].short} · J{m.matchday} · {teamMap.get(m.homeTeamId)?.shortName} vs {teamMap.get(m.awayTeamId)?.shortName} · {formatDateShort(m.date)}
                  </option>
                ))}
              </select>
            </Field>
          )}
        </div>
        <div className="mt-5">
          <button className="btn-gold" onClick={save} disabled={!activeTeam}>
            <Plus size={16} /> Registra el moviment
          </button>
        </div>
      </SectionCard>

      <div>
        <p className="label">Historial</p>
        {txs.length === 0 ? (
          <div className="card flex flex-col items-center gap-2 py-12 text-center text-slate-400">
            <Coins />
            <p className="text-sm">Encara no hi ha moviments. Registra el primer a dalt.</p>
          </div>
        ) : (
          <ul className="space-y-2">
            {[...txs].sort(newestFirst).slice(0, 40).map((tx) => {
              const team = teamMap.get(tx.teamId);
              return (
                <li key={tx.id} className="card flex items-center gap-3 px-4 py-2.5">
                  {team && <TeamCrest team={team} size={30} />}
                  <div className="min-w-0 flex-1">
                    <p className="truncate font-bold text-white">{tx.concept}</p>
                    <p className="truncate text-xs text-slate-500">
                      {team?.name} · {KIND_LABEL[tx.kind]} · {formatDateShort(tx.date)}
                    </p>
                  </div>
                  <span className={cn('digital text-2xl', tx.amount >= 0 ? 'text-emerald-400' : 'text-red-400')}>{signed(tx.amount)}</span>
                  <button className="btn-danger !p-2.5" aria-label={`Elimina el moviment ${tx.concept}`} onClick={() => setRemoving(tx)}>
                    <Trash2 size={14} />
                  </button>
                </li>
              );
            })}
          </ul>
        )}
      </div>

      <ConfirmDialog
        open={!!removing}
        title="Elimina el moviment"
        message={`S’eliminarà «${removing?.concept ?? ''}» i el saldo de l’equip es recalcularà.`}
        confirmLabel="Elimina"
        onCancel={() => setRemoving(null)}
        onConfirm={() => {
          if (removing) deleteTx(removing.id);
          setRemoving(null);
          toast('Moviment eliminat.');
        }}
      />
    </div>
  );
}
