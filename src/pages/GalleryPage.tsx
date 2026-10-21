import { useMemo, useState } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import { ImageOff, Maximize2 } from 'lucide-react';
import type { CategoryId } from '@/types';
import { Lightbox } from '@/components/gallery/Lightbox';
import { EmptyState, PageHeader } from '@/components/ui/Section';
import { SmartImage } from '@/components/ui/SmartImage';
import { CATEGORIES, CATEGORY_BY_ID } from '@/config/site';
import { useLeagueStore } from '@/store/useLeagueStore';
import { useLookups } from '@/hooks/useLeagueView';
import { cn, formatDateShort } from '@/lib/utils';

const RATIOS = ['4 / 3', '3 / 4', '1 / 1', '16 / 10', '4 / 5', '5 / 4'];
const ratioOf = (id: string) => RATIOS[[...id].reduce((a, c) => a + c.charCodeAt(0), 0) % RATIOS.length];

type CatFilter = CategoryId | 'general' | 'all';

const chip = (active: boolean) =>
  cn(
    'shrink-0 rounded-xl border px-3.5 py-2 font-display text-sm font-black uppercase tracking-wide transition',
    active ? 'border-amber-400 bg-gold-gradient text-slate-950 shadow-glow' : 'border-white/10 bg-white/[0.04] text-slate-300 hover:border-amber-400/50 hover:text-white',
  );

export default function GalleryPage() {
  const gallery = useLeagueStore((s) => s.gallery);
  const teams = useLeagueStore((s) => s.teams);
  const { teamMap } = useLookups();

  const [cat, setCat] = useState<CatFilter>('all');
  const [matchday, setMatchday] = useState<number | 'all'>('all');
  const [teamId, setTeamId] = useState<string>('all');
  const [index, setIndex] = useState<number | null>(null);

  const matchdays = useMemo(() => [...new Set(gallery.map((g) => g.matchday).filter((d): d is number => d !== undefined))].sort((a, b) => a - b), [gallery]);
  const teamOptions = useMemo(() => teams.filter((t) => cat === 'all' || cat === 'general' || t.category === cat), [teams, cat]);

  const items = useMemo(
    () =>
      gallery
        .filter((g) => cat === 'all' || g.category === cat)
        .filter((g) => matchday === 'all' || g.matchday === matchday)
        .filter((g) => teamId === 'all' || g.teamId === teamId)
        .sort((a, b) => b.date.localeCompare(a.date)),
    [gallery, cat, matchday, teamId],
  );

  return (
    <div className="mx-auto max-w-7xl px-4 py-10 sm:px-6">
      <PageHeader eyebrow="Moments de la lliga" title="Galeria" description="Les millors imatges de cada jornada. Toca una foto per veure-la a pantalla completa i navega amb les fletxes." />

      <div className="mb-8 space-y-3">
        <div className="hide-scrollbar -mx-4 flex gap-2 overflow-x-auto px-4 sm:mx-0 sm:px-0" role="tablist" aria-label="Categoria de la galeria">
          <button role="tab" aria-selected={cat === 'all'} className={chip(cat === 'all')} onClick={() => { setCat('all'); setTeamId('all'); }}>
            Totes
          </button>
          {CATEGORIES.map((c) => (
            <button key={c.id} role="tab" aria-selected={cat === c.id} className={chip(cat === c.id)} onClick={() => { setCat(c.id); setTeamId('all'); }}>
              {c.short}
            </button>
          ))}
          <button role="tab" aria-selected={cat === 'general'} className={chip(cat === 'general')} onClick={() => { setCat('general'); setTeamId('all'); }}>
            General
          </button>
        </div>
        <div className="flex flex-wrap gap-3">
          <select value={matchday} onChange={(e) => setMatchday(e.target.value === 'all' ? 'all' : Number(e.target.value))} aria-label="Filtra per jornada" className="input !w-auto">
            <option value="all">Totes les jornades</option>
            {matchdays.map((d) => (
              <option key={d} value={d}>
                Jornada {d}
              </option>
            ))}
          </select>
          <select value={teamId} onChange={(e) => setTeamId(e.target.value)} aria-label="Filtra per equip" className="input !w-auto">
            <option value="all">Tots els equips</option>
            {teamOptions.map((t) => (
              <option key={t.id} value={t.id}>
                {t.name}
              </option>
            ))}
          </select>
          <span className="ml-auto self-center text-sm text-slate-500">{items.length} fotos</span>
        </div>
      </div>

      {items.length === 0 ? (
        <EmptyState icon={<ImageOff />} title="Sense fotos" hint="No hi ha fotos amb aquests filtres. Afegeix-ne de noves des del tauler d’administració." />
      ) : (
        <div className="columns-2 gap-3 sm:gap-4 md:columns-3 xl:columns-4">
          <AnimatePresence mode="popLayout">
            {items.map((g, i) => {
              const team = g.teamId ? teamMap.get(g.teamId) : undefined;
              return (
                <motion.button
                  key={g.id}
                  layout
                  initial={{ opacity: 0, scale: 0.92 }}
                  animate={{ opacity: 1, scale: 1 }}
                  exit={{ opacity: 0, scale: 0.92 }}
                  transition={{ duration: 0.35, delay: Math.min(i, 10) * 0.03 }}
                  onClick={() => setIndex(i)}
                  className="group relative mb-3 block w-full break-inside-avoid overflow-hidden rounded-2xl border border-white/10 text-left transition-colors hover:border-amber-400/60 hover:shadow-glow sm:mb-4"
                  style={{ aspectRatio: ratioOf(g.id) }}
                  aria-label={`Obre la foto: ${g.title}`}
                >
                  <SmartImage src={g.imageUrl} alt={g.title} seed={g.id} className="h-full w-full object-cover transition-transform duration-700 group-hover:scale-110" />
                  <div className="absolute inset-0 bg-gradient-to-t from-black/85 via-black/10 to-transparent opacity-80 transition-opacity group-hover:opacity-100" />
                  <span className="absolute right-3 top-3 grid h-8 w-8 place-items-center rounded-full bg-black/50 text-white opacity-0 backdrop-blur transition group-hover:opacity-100">
                    <Maximize2 size={14} />
                  </span>
                  <div className="absolute inset-x-3 bottom-3">
                    <p className="line-clamp-2 font-display text-lg font-black uppercase leading-tight text-white">{g.title}</p>
                    <p className="mt-0.5 flex flex-wrap items-center gap-x-2 text-[11px] text-slate-300">
                      <span style={{ color: g.category === 'general' ? '#94a3b8' : CATEGORY_BY_ID[g.category].accent }} className="font-bold uppercase tracking-wider">
                        {g.category === 'general' ? 'General' : CATEGORY_BY_ID[g.category].short}
                      </span>
                      {g.matchday && <span>J{g.matchday}</span>}
                      {team && <span>{team.shortName}</span>}
                      <span className="text-slate-400">{formatDateShort(g.date)}</span>
                    </p>
                  </div>
                </motion.button>
              );
            })}
          </AnimatePresence>
        </div>
      )}

      <Lightbox items={items} index={index} onIndexChange={setIndex} />
    </div>
  );
}
