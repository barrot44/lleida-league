import { useMemo, useState } from 'react';
import { motion } from 'framer-motion';
import { Calendar, Coins, Crown, Heart, Medal, Megaphone, Trophy, Users, Whistle } from 'lucide-react';
import { SponsorGrid } from '@/components/club/SponsorGrid';
import { Lightbox } from '@/components/gallery/Lightbox';
import { EmptyState, PageHeader } from '@/components/ui/Section';
import { SmartImage } from '@/components/ui/SmartImage';
import { TeamCrest } from '@/components/ui/TeamCrest';
import { CATEGORIES, CATEGORY_BY_ID, SITE } from '@/config/site';
import { useLeagueStore } from '@/store/useLeagueStore';
import { useUiStore } from '@/store/useUiStore';
import { celebrate } from '@/lib/confetti';
import { KIND_LABEL, balances, newestFirst, signed, usesLleidalitos } from '@/lib/lleidalitos';
import { cn, formatDateShort } from '@/lib/utils';
import type { CategoryId } from '@/types';

type SectionId = 'qui-som' | 'palmares' | 'grada' | 'collaboradors' | 'arbitres' | 'moneda';

const SECTIONS: { id: SectionId; label: string; icon: typeof Trophy }[] = [
  { id: 'qui-som', label: 'Qui som?', icon: Megaphone },
  { id: 'palmares', label: 'Palmarès', icon: Trophy },
  { id: 'grada', label: 'La nostra grada', icon: Users },
  { id: 'collaboradors', label: 'Col·laboradors', icon: Heart },
  { id: 'arbitres', label: 'Àrbitres', icon: Whistle },
  { id: 'moneda', label: 'Moneda virtual', icon: Coins },
];

const chip = (active: boolean) =>
  cn(
    'inline-flex shrink-0 items-center gap-2 rounded-xl border px-3.5 py-2 font-display text-sm font-black uppercase tracking-wide transition',
    active ? 'border-amber-400 bg-gold-gradient text-slate-950 shadow-glow' : 'border-white/10 bg-white/[0.04] text-slate-300 hover:border-amber-400/50 hover:text-white',
  );

const ordinal = (n: number) => `${n}a edició`;

function QuiSom() {
  const facts = [
    { icon: Calendar, value: '27/02/2023', label: 'Neix la Lleida League' },
    { icon: Crown, value: '24', label: 'Presidents a la 2a edició' },
    { icon: Medal, value: '4', label: 'Competicions' },
    { icon: Coins, value: 'Lleidalitos', label: 'La moneda virtual' },
  ];
  return (
    <div className="grid gap-8 lg:grid-cols-[1.4fr_1fr]">
      <div className="space-y-5 text-lg leading-relaxed text-slate-300">
        <p>
          <strong className="text-white">Lleida League</strong> és un torneig presidencial de futbol sala de les terres de Lleida. Jugadors, entrenadors, directors esportius i altres figures de l’esport fan de
          presidents dels seus equips, i la competició, la tradició i la rivalitat es barregen a cada jornada.
        </p>
        <p>
          Tot va començar el <strong className="text-white">27 de febrer de 2023</strong>, quan dos amics van decidir unir i promoure l’esport lleidatà. Van pensar en un torneig d’estiu i van escollir 20 presidents que,
          junts, representaven bona part de la província.
        </p>
        <p>
          La <strong className="text-white">1a edició</strong> es va jugar als pavellons d’Alcoletge i de Pardinyes, i la va guanyar La Latoneta. La <strong className="text-white">2a edició</strong> va començar el 8 de juliol de
          2024 al pavelló Manel Bosch de Torrefarrera, amb 24 presidents, i va estrenar els <strong className="text-amber-300">Lleidalitos</strong>, la moneda virtual que els equips poden gastar per ajudar-se als partits.
        </p>
        <p>
          A més de la Senior, la <strong className="text-white">Lleida League Junior</strong>, per a estudiants d’ESO, es juga per Nadal, i la <strong className="text-white">Lleida League Juvenil</strong> és per a jugadors fins
          a 19 anys.
        </p>
        <div className="card flex flex-wrap items-center gap-x-8 gap-y-3 p-5 text-base">
          <div>
            <p className="label !mb-0.5">Fundadors i coordinadors</p>
            <p className="font-display text-xl font-black uppercase text-white">Pol Barrot · Iñaki Muñoz</p>
          </div>
          <div>
            <p className="label !mb-0.5">Àrea audiovisual</p>
            <p className="font-display text-xl font-black uppercase text-white">Pau Pascual</p>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-2 gap-3 self-start">
        {facts.map(({ icon: Icon, value, label }, i) => (
          <motion.div
            key={label}
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: i * 0.07 }}
            className="card-hover p-4"
          >
            <Icon size={20} className="mb-3 text-amber-400" />
            <p className="digital text-gold-gradient break-words text-3xl leading-none">{value}</p>
            <p className="mt-2 text-xs font-bold uppercase tracking-wider text-slate-400">{label}</p>
          </motion.div>
        ))}
      </div>
    </div>
  );
}

function Palmares() {
  const champions = useLeagueStore((s) => s.champions);
  const order: CategoryId[] = ['senior', 'femenina', 'juvenil', 'junior'];
  const groups = order
    .map((id) => ({ cat: CATEGORY_BY_ID[id], items: champions.filter((c) => c.category === id).sort((a, b) => b.year - a.year || b.edition - a.edition) }))
    .filter((g) => g.items.length > 0);

  if (groups.length === 0) return <EmptyState icon={<Trophy />} title="Encara sense campions" hint="El palmarès apareixerà aquí quan s’afegeixin els campions des del tauler d’administració." />;

  return (
    <div className="grid gap-5 md:grid-cols-2">
      {groups.map(({ cat, items }) => (
        <section key={cat.id} className="card p-5">
          <h3 className="mb-4 flex items-center gap-2 text-xl" style={{ color: cat.accent }}>
            <Trophy size={18} /> {cat.label}
          </h3>
          <ol className="space-y-2.5">
            {items.map((c, i) => (
              <li key={c.id}>
                <button
                  onClick={() => void celebrate([cat.accent], { big: i === 0 })}
                  className="group flex w-full items-center gap-4 rounded-xl border border-white/[0.07] bg-white/[0.03] px-4 py-3 text-left transition hover:border-amber-400/50 hover:bg-white/[0.06]"
                  title="Celebra-ho!"
                >
                  <span className="digital grid h-12 w-14 shrink-0 place-items-center rounded-lg bg-black/40 text-xl text-amber-300">{c.year}</span>
                  <span className="min-w-0 flex-1">
                    <span className="block truncate font-display text-xl font-black uppercase text-white">{c.team}</span>
                    <span className="text-xs uppercase tracking-wider text-slate-400">{ordinal(c.edition)}</span>
                  </span>
                  <Crown size={20} className={cn('shrink-0 transition', i === 0 ? 'text-amber-400' : 'text-slate-600 group-hover:text-amber-400')} />
                </button>
              </li>
            ))}
          </ol>
        </section>
      ))}
    </div>
  );
}

function Grada() {
  const gallery = useLeagueStore((s) => s.gallery);
  const photos = useMemo(() => gallery.filter((g) => g.tags.includes('grada')), [gallery]);
  const [index, setIndex] = useState<number | null>(null);
  const RATIOS = ['4 / 3', '3 / 4', '1 / 1', '4 / 5', '5 / 4', '16 / 10', '3 / 4'];

  return (
    <div>
      <blockquote className="mb-8 border-l-4 border-amber-400 pl-5 font-display text-2xl font-bold italic leading-snug text-slate-200 sm:text-3xl">
        «La nostra grada és l’ànima del torneig, on cada partit es converteix en un espectacle únic!»
      </blockquote>
      {photos.length === 0 ? (
        <EmptyState icon={<Users />} title="Sense fotos de la grada" hint="Afegeix fotos amb l’etiqueta «grada» a la galeria i apareixeran aquí." />
      ) : (
        <div className="columns-2 gap-3 md:columns-3 lg:columns-4">
          {photos.map((p, i) => (
            <button
              key={p.id}
              onClick={() => setIndex(i)}
              className="group relative mb-3 block w-full break-inside-avoid overflow-hidden rounded-2xl border border-white/10 transition hover:border-amber-400/60 hover:shadow-glow"
              style={{ aspectRatio: RATIOS[i % RATIOS.length] }}
              aria-label={`Obre la foto ${i + 1} de la grada`}
            >
              <SmartImage src={p.imageUrl} alt={p.title} seed={p.id} className="h-full w-full object-cover transition-transform duration-700 group-hover:scale-110" />
            </button>
          ))}
        </div>
      )}
      <Lightbox items={photos} index={index} onIndexChange={setIndex} />
    </div>
  );
}

function Collaboradors() {
  const sponsors = useLeagueStore((s) => s.sponsors);
  return (
    <div>
      <p className="mb-6 max-w-2xl text-slate-400">Gràcies als col·laboradors oficials que fan possible la Lleida League. Toca un logo per visitar-los.</p>
      {sponsors.length === 0 ? <EmptyState icon={<Heart />} title="Sense col·laboradors" hint="Afegeix-ne des del tauler d’administració." /> : <SponsorGrid sponsors={sponsors} />}
    </div>
  );
}

function Arbitres() {
  const referees = useLeagueStore((s) => s.referees);
  if (referees.length === 0) return <EmptyState icon={<Whistle />} title="Sense àrbitres" hint="Afegeix-ne des del tauler d’administració." />;
  return (
    <ul className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
      {referees.map((r, i) => (
        <motion.li key={r.id} initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.07 }} className="card-hover flex items-center gap-4 p-5">
          <span className="grid h-14 w-14 shrink-0 place-items-center rounded-2xl bg-gold-gradient text-slate-950 shadow-glow">
            <Whistle size={26} />
          </span>
          <div className="min-w-0">
            <p className="truncate font-display text-xl font-black uppercase text-white">{r.name}</p>
            <p className="text-xs font-bold uppercase tracking-wider text-slate-400">{r.role}</p>
          </div>
        </motion.li>
      ))}
    </ul>
  );
}

function MonedaVirtual() {
  const teams = useLeagueStore((s) => s.teams);
  const txs = useLeagueStore((s) => s.lleidalitoTx);
  const openModal = useUiStore((s) => s.openModal);
  const bal = useMemo(() => balances(teams, txs), [teams, txs]);
  const ranked = useMemo(() => teams.filter(usesLleidalitos).sort((a, b) => (bal.get(b.id) ?? 0) - (bal.get(a.id) ?? 0)), [teams, bal]);
  const max = Math.max(1, ...ranked.map((t) => bal.get(t.id) ?? 0));
  const total = ranked.reduce((sum, t) => sum + (bal.get(t.id) ?? 0), 0);
  const recent = useMemo(() => [...txs].sort(newestFirst).slice(0, 10), [txs]);
  const teamById = useMemo(() => new Map(teams.map((t) => [t.id, t])), [teams]);
  const net = useMemo(() => {
    const m = new Map<string, number>();
    for (const tx of txs) m.set(tx.teamId, (m.get(tx.teamId) ?? 0) + tx.amount);
    return m;
  }, [txs]);

  return (
    <div className="grid gap-8 lg:grid-cols-[1fr_1.6fr]">
      <div className="space-y-5 self-start">
        <div className="card p-6">
          <Coins size={28} className="mb-3 text-amber-400" />
          <h3 className="text-2xl">Els Lleidalitos</h3>
          <p className="mt-3 leading-relaxed text-slate-300">
            Els Lleidalitos són la moneda virtual de la lliga: els equips en poden gastar per ajudar-se als partits. Aquí tens els saldos de la Senior i tots els moviments.
          </p>
          <p className="mt-5 text-xs font-bold uppercase tracking-widest text-slate-400">Total en circulació</p>
          <p className="digital text-gold-gradient text-5xl">{total.toLocaleString('ca-ES')}</p>
        </div>

        <div className="card p-5">
          <h3 className="mb-4 text-xl">Últims moviments</h3>
          {recent.length === 0 ? (
            <p className="text-sm text-slate-400">Encara no hi ha moviments. Aquí veuràs qui gasta i qui guanya Lleidalitos.</p>
          ) : (
            <ul className="space-y-2.5">
              {recent.map((tx) => {
                const team = teamById.get(tx.teamId);
                return (
                  <li key={tx.id}>
                    <button
                      onClick={() => team && openModal({ kind: 'team', id: team.id })}
                      className="flex w-full items-center gap-3 rounded-xl border border-white/[0.07] bg-white/[0.03] px-3 py-2 text-left transition hover:border-amber-400/40"
                    >
                      {team && <TeamCrest team={team} size={28} />}
                      <span className="min-w-0 flex-1">
                        <span className="block truncate text-sm font-bold text-white">{tx.concept}</span>
                        <span className="block truncate text-xs text-slate-500">
                          {team?.shortName} · {KIND_LABEL[tx.kind]} · {formatDateShort(tx.date)}
                        </span>
                      </span>
                      <span className={cn('digital text-xl', tx.amount >= 0 ? 'text-emerald-400' : 'text-red-400')}>{signed(tx.amount)}</span>
                    </button>
                  </li>
                );
              })}
            </ul>
          )}
        </div>
      </div>

      {ranked.length === 0 ? (
        <EmptyState icon={<Coins />} title="Sense saldos" hint="Assigna Lleidalitos als equips des del tauler d’administració." />
      ) : (
        <ol className="space-y-2">
          {ranked.map((t, i) => {
            const delta = net.get(t.id) ?? 0;
            return (
              <motion.li key={t.id} initial={{ opacity: 0, x: -14 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: Math.min(i, 12) * 0.04 }}>
                <button
                  onClick={() => openModal({ kind: 'team', id: t.id })}
                  className="group flex w-full items-center gap-3 rounded-xl border border-white/[0.07] bg-surface/60 px-3 py-2.5 text-left transition hover:border-amber-400/50"
                >
                  <span className={cn('grid h-7 w-7 shrink-0 place-items-center rounded-lg font-display text-sm font-black', i === 0 ? 'bg-gold-gradient text-slate-950' : 'bg-white/[0.06] text-slate-300')}>{i + 1}</span>
                  <TeamCrest team={t} size={30} />
                  <span className="w-36 shrink-0 truncate font-display text-base font-black uppercase text-white sm:w-48">{t.name}</span>
                  <span className="relative hidden h-2.5 flex-1 overflow-hidden rounded-full bg-white/10 sm:block">
                    <motion.span
                      className="absolute inset-y-0 left-0 rounded-full bg-gold-gradient shadow-glow"
                      initial={{ width: 0 }}
                      animate={{ width: `${Math.max(2, ((bal.get(t.id) ?? 0) / max) * 100)}%` }}
                      transition={{ duration: 0.8, delay: 0.1 + i * 0.03 }}
                    />
                  </span>
                  {delta !== 0 && <span className={cn('hidden text-xs font-bold sm:block', delta > 0 ? 'text-emerald-400' : 'text-red-400')}>{signed(delta)}</span>}
                  <span className="digital ml-auto w-14 shrink-0 text-right text-2xl text-amber-300">{bal.get(t.id)}</span>
                </button>
              </motion.li>
            );
          })}
        </ol>
      )}
    </div>
  );
}

export default function DiscoverPage() {
  const [section, setSection] = useState<SectionId>('qui-som');
  const cats = CATEGORIES.length;

  return (
    <div className="mx-auto max-w-7xl px-4 py-10 sm:px-6">
      <PageHeader
        eyebrow={`Des del ${SITE.since} · ${cats} competicions`}
        title="Descobreix-nos"
        description="La història, el palmarès, la grada i la gent que fa possible la Lleida League."
      />

      <div className="hide-scrollbar -mx-4 mb-8 flex gap-2 overflow-x-auto px-4 pb-1 sm:mx-0 sm:px-0" role="tablist" aria-label="Seccions">
        {SECTIONS.map(({ id, label, icon: Icon }) => (
          <button key={id} role="tab" aria-selected={section === id} onClick={() => setSection(id)} className={chip(section === id)}>
            <Icon size={15} /> {label}
          </button>
        ))}
      </div>

      <motion.div key={section} initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.3 }}>
        {section === 'qui-som' && <QuiSom />}
        {section === 'palmares' && <Palmares />}
        {section === 'grada' && <Grada />}
        {section === 'collaboradors' && <Collaboradors />}
        {section === 'arbitres' && <Arbitres />}
        {section === 'moneda' && <MonedaVirtual />}
      </motion.div>
    </div>
  );
}
