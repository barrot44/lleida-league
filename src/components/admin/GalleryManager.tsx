import { useState } from 'react';
import { ImagePlus, Pencil, Save, Trash2, X } from 'lucide-react';
import type { CategoryId, GalleryItem } from '@/types';
import { ConfirmDialog } from '@/components/ui/ConfirmDialog';
import { SmartImage } from '@/components/ui/SmartImage';
import { Field, SectionCard } from '@/components/admin/fields';
import { CATEGORIES, CATEGORY_BY_ID } from '@/config/site';
import { useLeagueStore } from '@/store/useLeagueStore';
import { useUiStore } from '@/store/useUiStore';
import { toISODate, uid } from '@/lib/utils';

const blank = (): GalleryItem => ({
  id: uid('g'),
  title: '',
  imageUrl: '',
  category: 'general',
  date: toISODate(new Date()),
  caption: '',
  tags: [],
});

export function GalleryManager() {
  const gallery = useLeagueStore((s) => s.gallery);
  const teams = useLeagueStore((s) => s.teams);
  const upsertGallery = useLeagueStore((s) => s.upsertGallery);
  const deleteGallery = useLeagueStore((s) => s.deleteGallery);
  const toast = useUiStore((s) => s.toast);

  const [form, setForm] = useState<GalleryItem>(blank);
  const [tags, setTags] = useState('');
  const [editing, setEditing] = useState(false);
  const [removing, setRemoving] = useState<GalleryItem | null>(null);
  const patch = (p: Partial<GalleryItem>) => setForm((f) => ({ ...f, ...p }));

  const reset = () => {
    setForm(blank());
    setTags('');
    setEditing(false);
  };

  const save = () => {
    if (!form.imageUrl.trim()) return toast('Pega la URL de la imagen.', 'error');
    if (!form.title.trim()) return toast('Añade un título o pie de foto.', 'error');
    upsertGallery({
      ...form,
      title: form.title.trim(),
      imageUrl: form.imageUrl.trim(),
      caption: form.caption.trim(),
      tags: tags.split(',').map((t) => t.trim().replace(/^#/, '')).filter(Boolean),
    });
    toast(editing ? '¡Foto actualizada con éxito!' : '¡Foto añadida a la galería!');
    reset();
  };

  const edit = (g: GalleryItem) => {
    setForm(g);
    setTags(g.tags.join(', '));
    setEditing(true);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  return (
    <div className="space-y-6">
      <SectionCard
        title={editing ? 'Editar foto' : 'Añadir foto'}
        actions={
          editing && (
            <button className="btn-ghost !py-1.5 text-xs" onClick={reset}>
              <X size={14} /> Cancelar edición
            </button>
          )
        }
      >
        <div className="grid gap-6 md:grid-cols-[260px_1fr]">
          <div className="aspect-[4/3] overflow-hidden rounded-2xl border border-white/10 bg-pitch/60">
            {form.imageUrl ? (
              <SmartImage key={form.imageUrl} src={form.imageUrl} alt="Vista previa" seed={form.id} className="h-full w-full object-cover" />
            ) : (
              <div className="grid h-full place-items-center text-slate-600">
                <ImagePlus size={36} />
              </div>
            )}
          </div>
          <div className="grid gap-4 sm:grid-cols-2">
            <Field label="URL de la imagen" className="sm:col-span-2" hint="Pega el enlace directo a la foto (https://…jpg / png / webp).">
              <input className="input" value={form.imageUrl} onChange={(e) => patch({ imageUrl: e.target.value })} placeholder="https://…" />
            </Field>
            <Field label="Título / pie de foto">
              <input className="input" value={form.title} onChange={(e) => patch({ title: e.target.value })} />
            </Field>
            <Field label="Categoría">
              <select className="input" value={form.category} onChange={(e) => patch({ category: e.target.value as CategoryId | 'general', teamId: undefined })}>
                {CATEGORIES.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.label}
                  </option>
                ))}
                <option value="general">General</option>
              </select>
            </Field>
            <Field label="Jornada (opcional)">
              <input type="number" min={1} className="input" value={form.matchday ?? ''} onChange={(e) => patch({ matchday: e.target.value ? Number(e.target.value) : undefined })} />
            </Field>
            <Field label="Equipo (opcional)">
              <select className="input" value={form.teamId ?? ''} onChange={(e) => patch({ teamId: e.target.value || undefined })}>
                <option value="">—</option>
                {teams
                  .filter((t) => form.category === 'general' || t.category === form.category)
                  .map((t) => (
                    <option key={t.id} value={t.id}>
                      {t.name}
                    </option>
                  ))}
              </select>
            </Field>
            <Field label="Fecha">
              <input type="date" className="input" value={form.date} onChange={(e) => patch({ date: e.target.value })} />
            </Field>
            <Field label="Etiquetas (separadas por comas)">
              <input className="input" value={tags} onChange={(e) => setTags(e.target.value)} placeholder="grada, ambiente" />
            </Field>
            <Field label="Descripción" className="sm:col-span-2">
              <textarea className="input min-h-[72px]" value={form.caption} onChange={(e) => patch({ caption: e.target.value })} />
            </Field>
            <div className="sm:col-span-2">
              <button className="btn-gold" onClick={save}>
                <Save size={16} /> {editing ? 'Guardar cambios' : 'Añadir a la galería'}
              </button>
            </div>
          </div>
        </div>
      </SectionCard>

      <div>
        <p className="label">{gallery.length} fotos publicadas</p>
        <ul className="grid grid-cols-2 gap-3 md:grid-cols-4 xl:grid-cols-5">
          {[...gallery]
            .sort((a, b) => b.date.localeCompare(a.date))
            .map((g) => (
              <li key={g.id} className="group card relative overflow-hidden">
                <div className="aspect-[4/3]">
                  <SmartImage src={g.imageUrl} alt={g.title} seed={g.id} className="h-full w-full object-cover" />
                </div>
                <div className="p-2.5">
                  <p className="truncate text-sm font-bold text-white">{g.title}</p>
                  <p className="text-[11px] text-slate-500">{g.category === 'general' ? 'General' : CATEGORY_BY_ID[g.category].short}{g.matchday ? ` · J${g.matchday}` : ''}</p>
                </div>
                <div className="absolute right-2 top-2 flex gap-1.5 opacity-100 transition sm:opacity-0 sm:group-hover:opacity-100">
                  <button className="grid h-8 w-8 place-items-center rounded-lg bg-black/70 text-white backdrop-blur hover:text-amber-300" aria-label={`Editar ${g.title}`} onClick={() => edit(g)}>
                    <Pencil size={14} />
                  </button>
                  <button className="grid h-8 w-8 place-items-center rounded-lg bg-black/70 text-red-300 backdrop-blur hover:text-red-200" aria-label={`Eliminar ${g.title}`} onClick={() => setRemoving(g)}>
                    <Trash2 size={14} />
                  </button>
                </div>
              </li>
            ))}
        </ul>
      </div>

      <ConfirmDialog
        open={!!removing}
        title="Eliminar foto"
        message={`¿Quitar «${removing?.title ?? ''}» de la galería?`}
        confirmLabel="Eliminar foto"
        onCancel={() => setRemoving(null)}
        onConfirm={() => {
          if (removing) deleteGallery(removing.id);
          setRemoving(null);
          toast('Foto eliminada.');
        }}
      />
    </div>
  );
}
