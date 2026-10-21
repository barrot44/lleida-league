import type { LleidalitoKind, LleidalitoTx, Team } from '@/types';

export const KIND_LABEL: Record<LleidalitoKind, string> = {
  ajuda: 'Ajuda en un partit',
  premi: 'Premi',
  fitxatge: 'Fitxatge',
  compra: 'Compra',
  ajust: 'Ajust',
};

/** Kinds that are normally spending (the admin form pre-selects "despesa" for them). */
export const SPENDING_KINDS: LleidalitoKind[] = ['ajuda', 'fitxatge', 'compra'];

/** Teams that use the virtual currency (those with a starting balance). */
export const usesLleidalitos = (team: Team) => team.lleidalitos !== undefined;

/** Current balance of every team: starting balance + all its movements. */
export function balances(teams: Team[], txs: LleidalitoTx[]): Map<string, number> {
  const map = new Map<string, number>();
  for (const t of teams) if (usesLleidalitos(t)) map.set(t.id, t.lleidalitos ?? 0);
  for (const tx of txs) if (map.has(tx.teamId)) map.set(tx.teamId, (map.get(tx.teamId) ?? 0) + tx.amount);
  return map;
}

export const signed = (n: number) => (n > 0 ? `+${n}` : String(n));

export const newestFirst = (a: LleidalitoTx, b: LleidalitoTx) => b.date.localeCompare(a.date) || b.id.localeCompare(a.id);
