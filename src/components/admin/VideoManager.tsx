import { useMemo, useState } from 'react';
import { Pencil, Save, Trash2, Video, X } from 'lucide-react';
import type { CategoryId, VideoItem } from '@/types';
import { Field, SectionCard } from '@/components/admin/fields';
import { ConfirmDialog } from '@/components/ui/ConfirmDialog';
import { SmartImage } from '@/components/ui/SmartImage';
import { CATEGORIES, CATEGORY_BY_ID } from '@/config/site';
import { useLookups } from '@/hooks/useLeagueView';
import { PROVIDER_LABEL, parseVideo } from '@/lib/video';
import { formatDateShort, matchTimestamp, toISODate, uid } from '@/lib/utils';
import { useLeagueStore } from '@/store/useLeagueStore';
import { useUiStore } from '@/store/useUiStore';

const blank = (): VideoItem => ({ id: uid('v'), title: '', url: '', category: 'senior', date: toISODate(new Date()) });

export function VideoManager() {
  const videos = useLeagueStore((s) => s.videos);
  const matches = useLeagueStore((s) => s.matches);
  const upsertVideo = useLeagueStore((s) => s.upsertVideo);
  const deleteVideo = useLeagueStore((s) => s.deleteVideo);
  const toast = useUiStore((s) => s.toast);
  const { teamMap } = useLookups();

  const [form, setForm] = useState<VideoItem>(blank);
  const [editing, setEditing] = useState(false);
  const [removing, setRemoving] = useState<VideoItem | null>(null);
  const patch = (p: Partial<VideoItem>) => setForm((f) => ({ ...f, ...p }));
  const parsed = parseVideo(form.url);

  const candidates = useMemo(
    () =>
      form.category === 'general'
        ? []
        : matches
            .filter((m) => m.category === form.category && (!form.matchday || m.matchday === form.matchday))
            .sort((a, b) => matchTimestamp(a) - matchTimestamp(b)),
    [matches, form.category, form.matchday],
  );

  const reset = () => {
    setForm(blank());
    setEditing(false);
  };

  const save = () => {
    if (!/^https?:\/\//i.test(form.url.trim())) return toast('Enganxa l’enllaç complet del vídeo (https://…).', 'error');
    if (!form.title.trim()) return toast('Posa un títol al vídeo.', 'error');
    upsertVideo({ ...form, url: form.url.trim(), title: form.title.trim() });
    toast(editing ? 'Vídeo actualitzat.' : 'Vídeo afegit!');
    reset();
  };

  return (
    <div className="space-y-6">
      <SectionCard
        title={editing ? 'Edita el vídeo' : 'Afegeix un vídeo o resum'}
        actions={
          editing && (
            <button className="btn-ghost !py-1.5 text-xs" onClick={reset}>
              <X size={14} /> Cancel·la l’edició
            </button>
          )
        }
      >
        <div className="grid gap-6 md:grid-cols-[260px_1fr]">
          <div className="aspect-video overflow-hidden rounded-2xl border border-white/10 bg-pitch/60">
            {parsed.thumbnail ? (
              <SmartImage key={parsed.thumbnail} src={parsed.thumbnail} alt="Previsualització" seed={form.id} className="h-full w-full object-cover" />
            ) : (
              <div className="grid h-full place-items-center px-3 text-center text-xs text-slate-500">
                <span>
                  <Video size={30} className="mx-auto mb-2" />
                  {form.url ? `${PROVIDER_LABEL[parsed.provider]}${parsed.embedUrl ? ' · es reproduirà dins la web' : ' · s’obrirà en una pestanya nova'}` : 'La miniatura apareix en enganxar l’enllaç'}
                </span>
              </div>
            )}
          </div>
          <div className="grid gap-4 sm:grid-cols-2">
            <Field label="Enllaç del vídeo" className="sm:col-span-2" hint="YouTube (vídeo, short o directe), TikTok o Instagram (reel).">
              <input className="input" value={form.url} onChange={(e) => patch({ url: e.target.value })} placeholder="https://www.youtube.com/watch?v=…" />
            </Field>
            <Field label="Títol" className="sm:col-span-2">
              <input className="input" value={form.title} onChange={(e) => patch({ title: e.target.value })} placeholder="Resum de la jornada 7 · Senior" />
            </Field>
            <Field label="Categoria">
              <select className="input" value={form.category} onChange={(e) => patch({ category: e.target.value as CategoryId | 'general', matchId: undefined })}>
                {CATEGORIES.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.label}
                  </option>
                ))}
                <option value="general">General</option>
              </select>
            </Field>
            <Field label="Jornada (opcional)">
              <input type="number" min={1} className="input" value={form.matchday ?? ''} onChange={(e) => patch({ matchday: e.target.value ? Number(e.target.value) : undefined, matchId: undefined })} />
            </Field>
            {form.category !== 'general' && (
              <Field label="Partit (opcional)" className="sm:col-span-2" hint="Si el lligues a un partit, el vídeo també apareixerà a la seva fitxa.">
                <select className="input" value={form.matchId ?? ''} onChange={(e) => patch({ matchId: e.target.value || undefined })}>
                  <option value="">—</option>
                  {candidates.map((m) => (
                    <option key={m.id} value={m.id}>
                      J{m.matchday} · {teamMap.get(m.homeTeamId)?.shortName} vs {teamMap.get(m.awayTeamId)?.shortName} · {formatDateShort(m.date)}
                    </option>
                  ))}
                </select>
              </Field>
            )}
            <Field label="Data">
              <input type="date" className="input" value={form.date} onChange={(e) => patch({ date: e.target.value })} />
            </Field>
            <div className="flex items-end">
              <button className="btn-gold" onClick={save}>
                <Save size={16} /> {editing ? 'Desa els canvis' : 'Afegeix el vídeo'}
              </button>
            </div>
          </div>
        </div>
      </SectionCard>

      <div>
        <p className="label">{videos.length} vídeos publicats</p>
        <ul className="space-y-2">
          {[...videos]
            .sort((a, b) => b.date.localeCompare(a.date))
            .map((v) => {
              const p = parseVideo(v.url);
              return (
                <li key={v.id} className="card flex items-center gap-4 p-3">
                  <div className="aspect-video w-28 shrink-0 overflow-hidden rounded-lg bg-pitch">
                    {p.thumbnail ? <SmartImage src={p.thumbnail} alt="" seed={v.id} className="h-full w-full object-cover" /> : <div className="grid h-full place-items-center text-[10px] font-bold text-slate-500">{PROVIDER_LABEL[p.provider]}</div>}
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className="truncate font-bold text-white">{v.title}</p>
                    <p className="truncate text-xs text-slate-500">
                      {v.category === 'general' ? 'General' : CATEGORY_BY_ID[v.category].short}
                      {v.matchday ? ` · J${v.matchday}` : ''} · {formatDateShort(v.date)} · {PROVIDER_LABEL[p.provider]}
                    </p>
                  </div>
                  <button
                    className="btn-ghost !p-2.5"
                    aria-label={`Edita ${v.title}`}
                    onClick={() => {
                      setForm(v);
                      setEditing(true);
                      window.scrollTo({ top: 0, behavior: 'smooth' });
                    }}
                  >
                    <Pencil size={15} />
                  </button>
                  <button className="btn-danger !p-2.5" aria-label={`Elimina ${v.title}`} onClick={() => setRemoving(v)}>
                    <Trash2 size={15} />
                  </button>
                </li>
              );
            })}
        </ul>
      </div>

      <ConfirmDialog
        open={!!removing}
        title="Elimina el vídeo"
        message={`Vols treure «${removing?.title ?? ''}» de la web?`}
        confirmLabel="Elimina"
        onCancel={() => setRemoving(null)}
        onConfirm={() => {
          if (removing) deleteVideo(removing.id);
          setRemoving(null);
          toast('Vídeo eliminat.');
        }}
      />
    </div>
  );
}
