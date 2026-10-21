import { useState } from 'react';
import { Pencil, Save, Trash2, X } from 'lucide-react';
import type { CategoryId, NewsBadge, NewsItem } from '@/types';
import { ConfirmDialog } from '@/components/ui/ConfirmDialog';
import { NewsBadgeTag } from '@/components/ui/Badges';
import { Field, SectionCard } from '@/components/admin/fields';
import { CATEGORIES, NEWS_BADGES } from '@/config/site';
import { useLeagueStore } from '@/store/useLeagueStore';
import { useUiStore } from '@/store/useUiStore';
import { formatDateShort, toISODate, uid } from '@/lib/utils';

const blank = (): NewsItem => ({ id: uid('n'), headline: '', summary: '', date: toISODate(new Date()), badge: 'Oficial' });

export function NewsManager() {
  const news = useLeagueStore((s) => s.news);
  const upsertNews = useLeagueStore((s) => s.upsertNews);
  const deleteNews = useLeagueStore((s) => s.deleteNews);
  const toast = useUiStore((s) => s.toast);

  const [form, setForm] = useState<NewsItem>(blank);
  const [editing, setEditing] = useState(false);
  const [removing, setRemoving] = useState<NewsItem | null>(null);
  const patch = (p: Partial<NewsItem>) => setForm((f) => ({ ...f, ...p }));

  const reset = () => {
    setForm(blank());
    setEditing(false);
  };

  const save = () => {
    if (!form.headline.trim()) return toast('El comunicado necesita un titular.', 'error');
    upsertNews({ ...form, headline: form.headline.trim(), summary: form.summary.trim() });
    toast(editing ? '¡Comunicado actualizado con éxito!' : '¡Comunicado publicado!');
    reset();
  };

  return (
    <div className="space-y-6">
      <SectionCard
        title={editing ? 'Editar comunicado' : 'Nuevo comunicado presidencial'}
        actions={
          editing && (
            <button className="btn-ghost !py-1.5 text-xs" onClick={reset}>
              <X size={14} /> Cancelar edición
            </button>
          )
        }
      >
        <div className="grid gap-4 sm:grid-cols-2">
          <Field label="Titular" className="sm:col-span-2">
            <input className="input" value={form.headline} onChange={(e) => patch({ headline: e.target.value })} />
          </Field>
          <Field label="Resumen" className="sm:col-span-2">
            <textarea className="input min-h-[88px]" value={form.summary} onChange={(e) => patch({ summary: e.target.value })} />
          </Field>
          <Field label="Etiqueta">
            <select className="input" value={form.badge} onChange={(e) => patch({ badge: e.target.value as NewsBadge })}>
              {NEWS_BADGES.map((b) => (
                <option key={b} value={b}>
                  {b}
                </option>
              ))}
            </select>
          </Field>
          <Field label="Fecha">
            <input type="date" className="input" value={form.date} onChange={(e) => patch({ date: e.target.value })} />
          </Field>
          <Field label="Categoría (opcional)" hint="Vacío = visible en todas las categorías.">
            <select className="input" value={form.category ?? ''} onChange={(e) => patch({ category: (e.target.value || undefined) as CategoryId | undefined })}>
              <option value="">Todas</option>
              {CATEGORIES.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.label}
                </option>
              ))}
            </select>
          </Field>
          <div className="flex items-end">
            <button className="btn-gold" onClick={save}>
              <Save size={16} /> {editing ? 'Guardar cambios' : 'Publicar'}
            </button>
          </div>
        </div>
      </SectionCard>

      <ul className="space-y-2.5">
        {[...news]
          .sort((a, b) => b.date.localeCompare(a.date))
          .map((n) => (
            <li key={n.id} className="card flex items-center gap-4 px-4 py-3">
              <NewsBadgeTag badge={n.badge} />
              <div className="min-w-0 flex-1">
                <p className="truncate font-bold text-white">{n.headline}</p>
                <p className="truncate text-xs text-slate-500">{formatDateShort(n.date)}</p>
              </div>
              <button
                className="btn-ghost !p-2.5"
                aria-label={`Editar ${n.headline}`}
                onClick={() => {
                  setForm(n);
                  setEditing(true);
                  window.scrollTo({ top: 0, behavior: 'smooth' });
                }}
              >
                <Pencil size={15} />
              </button>
              <button className="btn-danger !p-2.5" aria-label={`Eliminar ${n.headline}`} onClick={() => setRemoving(n)}>
                <Trash2 size={15} />
              </button>
            </li>
          ))}
      </ul>

      <ConfirmDialog
        open={!!removing}
        title="Eliminar comunicado"
        message={`¿Eliminar «${removing?.headline ?? ''}»?`}
        confirmLabel="Eliminar"
        onCancel={() => setRemoving(null)}
        onConfirm={() => {
          if (removing) deleteNews(removing.id);
          setRemoving(null);
          toast('Comunicado eliminado.');
        }}
      />
    </div>
  );
}
