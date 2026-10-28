import { CATEGORY_BY_ID, SITE } from '@/config/site';
import type { CategoryId } from '@/types';
import { ageOf, fullName, season, type RegData } from '@/lib/registration';

const esc = (s: string) => s.replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' })[c] ?? c);

/** Text of the image-rights authorization (shown in the portal and printed on the paper). */
export const RIGHTS_TEXT = [
  `Les persones sotasignades autoritzen la ${SITE.name} (${SITE.email}) a fer i fer servir fotografies i vídeos on surtin, presos durant els partits i els actes de la competició, i la foto de cara facilitada en la inscripció.`,
  'Aquestes imatges es poden publicar a la web de la lliga, a les retransmissions en directe i a les xarxes socials de la lliga (Instagram, TikTok, YouTube), només per informar i donar a conèixer la competició i sense cap contraprestació econòmica.',
  'La foto del document d’identitat només serveix perquè l’organització comprovi l’edat: no es publica mai i s’esborra un cop comprovada.',
  `Aquesta autorització val mentre duri la temporada i es pot retirar en qualsevol moment escrivint a ${SITE.email} (les publicacions anteriors no es veuen afectades). En el cas dels menors de 18 anys, signa també el pare, la mare o el tutor legal.`,
];

/** Printable page (A4) with the authorization and one signature row per player. */
export function rightsDocHtml(data: RegData, category: CategoryId): string {
  const players = [...data.players].sort((a, b) => (a.dorsal ?? 999) - (b.dorsal ?? 999));
  // A few blank rows for late additions.
  const blanks = Math.max(3, 14 - players.length);
  const rows = [
    ...players.map((p) => {
      const age = ageOf(p.birthDate);
      const minor = age !== null && age < 18;
      return `<tr><td class="c">${p.dorsal ?? ''}</td><td>${esc(fullName(p))}</td><td class="c">${p.birthDate ? p.birthDate.split('-').reverse().join('/') : ''}</td><td></td><td class="${minor ? '' : 'na'}">${minor ? '' : '—'}</td></tr>`;
    }),
    ...Array.from({ length: blanks }, () => '<tr><td></td><td></td><td></td><td></td><td></td></tr>'),
  ].join('');

  return `<!doctype html><html lang="ca"><head><meta charset="utf-8"><title>Drets d'imatge · ${esc(data.team.name || 'Equip')}</title>
<style>
  @page { size: A4; margin: 14mm; }
  * { box-sizing: border-box; }
  body { font: 11pt/1.45 system-ui, -apple-system, Segoe UI, Roboto, sans-serif; color: #111; margin: 0; }
  h1 { font-size: 17pt; margin: 0 0 2mm; text-transform: uppercase; letter-spacing: .02em; }
  .meta { display: flex; gap: 8mm; flex-wrap: wrap; font-size: 10.5pt; margin-bottom: 4mm; }
  .meta b { text-transform: uppercase; font-size: 8.5pt; color: #555; letter-spacing: .08em; display: block; }
  p { margin: 0 0 2.2mm; text-align: justify; }
  table { width: 100%; border-collapse: collapse; margin-top: 4mm; }
  th, td { border: 1px solid #333; padding: 0 2mm; height: 11mm; font-size: 10pt; }
  th { background: #eee; height: 8mm; font-size: 8.5pt; text-transform: uppercase; letter-spacing: .05em; }
  td.c { text-align: center; width: 13mm; }
  td.na { text-align: center; color: #999; }
  .sign { display: flex; justify-content: space-between; gap: 10mm; margin-top: 8mm; font-size: 10pt; }
  .sign div { flex: 1; border-top: 1px solid #333; padding-top: 1.5mm; }
  .hint { margin-top: 5mm; font-size: 9pt; color: #555; }
  @media screen { body { max-width: 190mm; margin: 6mm auto; padding: 0 4mm; } }
</style></head><body>
<h1>Autorització de drets d'imatge</h1>
<div class="meta">
  <span><b>Competició</b>${esc(SITE.name)} · ${esc(CATEGORY_BY_ID[category]?.label ?? category)}</span>
  <span><b>Temporada</b>${season()}</span>
  <span><b>Equip</b>${esc(data.team.name || '________________')}</span>
  <span><b>President/a</b>${esc(data.president.name || '________________')}</span>
</div>
${RIGHTS_TEXT.map((t) => `<p>${esc(t)}</p>`).join('')}
<table>
  <thead><tr><th>Dorsal</th><th>Nom i cognoms</th><th>Naixement</th><th>Signatura del jugador/a</th><th>Menors: nom i signatura del pare, mare o tutor/a</th></tr></thead>
  <tbody>${rows}</tbody>
</table>
<div class="sign"><div>Signatura del president/a</div><div>Lloc i data</div></div>
<p class="hint">Un cop signat per tothom, fes-ne una foto (o escaneja'l) i puja-la a la inscripció de l'equip.</p>
</body></html>`;
}
