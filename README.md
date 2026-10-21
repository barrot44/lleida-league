<div align="center">

<img src="public/logo.png" alt="Lleida League — Futsal" width="140" />

# LLEIDA LEAGUE

**Més que un joc, una batalla presidencial.**

La plataforma web oficial de la lliga de futbol sala de Lleida: classificació en directe, calendari i resultats,
golejadors i MVPs, galeria, club, **generador d'imatges per a xarxes** i un tauler d'administració amb **login real**.

`React 18` · `TypeScript (strict)` · `Vite` · `Tailwind CSS` · `Framer Motion` · `Zustand` · `Radix UI` · `Supabase`

</div>

---

## Què és

**Lleida League** (des del 2023) organitza quatre competicions de futbol sala — **Senior, Juvenil, Junior i Femenina** — amb
un to propi: cada equip té un *president* i cada jornada és una *batalla presidencial*.

Aquesta app substitueix la [web antiga de Wix](https://lleidaleague.wixsite.com/lleidaleague) per una **SPA moderna i ràpida**, en **català**, amb
estètica de videojoc esportiu: mode fosc, accents daurat/cian/maragda, targetes hologràfiques 3D i microanimacions.

## Funcionalitats

| Àrea | Què inclou |
| --- | --- |
| **Capçalera** | Logo amb llum neó, ticker animat (en directe · propers · últims resultats), selector de categoria i navegació; al mòbil, barra inferior tipus app. |
| **Inici** | Hero amb partícules, **compte enrere en temps real** al proper gran partit, partits en directe, targetes FIFA del **MVP de la setmana** i del **màxim golejador**, mini-classificació, comunicats i col·laboradors. |
| **Classificació** | Taula en directe (3 pts victòria / 1 empat; desempat per diferència de gols → gols a favor), ratxa V-E-D i **fitxa d'equip** amb plantilla, president, Lleidalitos i resultats. Confeti quan es corona un campió. |
| **Calendari** | Filtre per jornada i estat, targetes amb marcador digital i **fitxa del partit** (cronologia, assistències, MVP) amb botó **«Imatge per a xarxes»**. |
| **Golejadors i MVPs** | Podi Top 3, rànquings de gols, MVPs i assistències amb cerca i filtre per posició, i fitxa de jugador. |
| **Galeria** | Mosaic amb filtres per categoria, jornada i equip, i *lightbox* a pantalla completa. |
| **Descobreix-nos** | *Qui som?*, **Palmarès** (historial de campions), **La nostra grada**, **Col·laboradors**, **Àrbitres** i **Moneda virtual** (Lleidalitos) — el contingut de la web antiga. |
| **Admin** | Partits (marcador en directe, golejadors, assistències, targetes, MVP), equips, jugadors, **estudi de xarxes**, galeria, comunicats, club (palmarès, col·laboradors, àrbitres) i còpies de seguretat. |

### Càlcul automàtic

La classificació i les estadístiques dels jugadors **no es guarden: es deriven** dels partits. Cada cop que un partit passa a
`finished` (o s'edita/elimina) tot es recalcula i es reordena a l'instant (`src/lib/standings.ts`).

## Posada en marxa

Requisits: **Node.js 18+**.

```bash
npm install
npm run dev        # http://localhost:5173
```

```bash
npm run build      # typecheck (tsc strict) + build de producció a /dist
npm run preview    # serveix /dist en local
npm run typecheck  # només comprovació de tipus
```

Sense cap configuració, l'app funciona en **mode local**: les dades es guarden al `localStorage` del navegador i el tauler
s'obre amb la contrasenya de demostració `admin123` (només una barrera visual).

---

## Dades compartides i login real amb Supabase

En mode local, les dades només existeixen al navegador de qui edita. Per **compartir-les amb tots els visitants** i tenir un
**login d'administrador de veritat** (correu + contrasenya, permisos al servidor), connecta Supabase. Passos:

1. **Crea un projecte** a [supabase.com](https://supabase.com).
2. **SQL Editor → New query**: enganxa el contingut de [`supabase/schema.sql`](supabase/schema.sql) i executa'l.
   Crea la taula `league_state` (lectura pública, escriptura només per a administradors), la taula `admins` i el control de conflictes.
3. **Authentication → Users → Add user**: crea el teu usuari amb correu i contrasenya (marca *Auto Confirm User*).
   Recomanat: a *Authentication → Sign In / Providers* desactiva *Allow new users to sign up*, perquè ningú més es pugui registrar.
4. **Dóna permisos d'administrador** a aquest usuari (SQL Editor):

   ```sql
   insert into public.admins (user_id)
   select id from auth.users where email = 'EL-TEU-CORREU@exemple.com'
   on conflict do nothing;
   ```

5. **Project Settings → API**: copia la *Project URL* i la clau *anon public*. En local, crea `.env.local` (a partir de `.env.example`):

   ```bash
   VITE_SUPABASE_URL=https://EL-TEU-PROJECTE.supabase.co
   VITE_SUPABASE_ANON_KEY=la-teva-anon-key
   ```

   En producció (Vercel / Netlify) afegeix aquestes **mateixes variables** a *Environment Variables* i torna a desplegar.
6. Obre **`/#/admin`**, entra amb el correu i la contrasenya i fes un primer canvi (o *Ajustos → Publica les dades d'aquest navegador*).
   A partir d'aquí tothom veu les mateixes dades.

**Com funciona**

- Tot l'estat de la lliga és **una fila JSON** (`league_state`, `id = 'main'`).
- **Lectura**: pública i anònima; la web es refresca sola cada 20 s. Mentre es carreguen les dades per primer cop es veu una pantalla de càrrega (mai dades d'exemple).
- **Escriptura**: només usuaris autenticats que figurin a `admins` (polítiques RLS + funció `is_admin()` al servidor). La clau *anon* és pública per disseny: la seguretat la donen les polítiques, no el secret de la clau.
- **Conflictes**: cada desat comprova la versió (`updated_at`). Si un altre administrador ha desat abans, s'avisa i es carrega l'última versió en lloc de sobreescriure-la.
- **Temps real opcional**: `alter publication supabase_realtime add table public.league_state;` (el codi actual fa *polling*, que n'hi ha prou per a una lliga).

> Mentre `VITE_SUPABASE_URL` i `VITE_SUPABASE_ANON_KEY` estiguin buides, tot continua funcionant en mode local.

## Equips i dades reals

- Els **16 equips de la Senior**, els presidents, els **Lleidalitos**, el **palmarès**, els **col·laboradors** i els **àrbitres** vénen de la web antiga
  (`src/data/initialLeagueData.ts`). Els colors, forces i històries curtes són orientatius.
- Els **partits, resultats i jugadors** (i les categories Juvenil, Junior i Femenina) són **d'exemple**, generats de forma determinista i relativa a «avui» perquè la web no sigui buida.
- Quan estiguis a punt: **Admin → Ajustos → «Començar temporada en blanc»** esborra partits i jugadors d'exemple i conserva els equips.
- Les imatges dels col·laboradors i de *La nostra grada* s'enllacen des de la web antiga (Wix). Quan la tanquis, descarrega-les i
  puja-les a un altre lloc (p. ex. la galeria o Supabase Storage) i actualitza les URL des de l'admin; si una imatge falla, la web mostra un text/illustració de reserva.

## Imatges per a xarxes socials

**Admin → Xarxes** genera imatges 1080 px llestes per a Instagram, TikTok i stories amb les dades de la lliga:

| Plantilla | Contingut |
| --- | --- |
| Resultat d'un partit | Marcador, escuts, golejadors i MVP |
| Resum de la jornada | Tots els resultats de la jornada |
| Cartell de la jornada | Horaris dels propers partits |
| Classificació | Taula amb els primers equips |
| Màxims golejadors | Pitxitxi i Top 5 |
| MVP | Targeta FIFA del millor jugador |

Formats: **post 4:5** (1080×1350), **story/TikTok/Reel 9:16** (1080×1920) i **quadrat 1:1**. Cada imatge porta un **text suggerit** (amb emojis i hashtags)
per copiar, es pot **descarregar en PNG** i, al mòbil, **compartir** directament. Qualsevol visitant també pot generar la imatge d'un partit des de la seva fitxa.

## Estructura del projecte

```
├── index.html
├── public/logo.png                 # Escut oficial
├── supabase/schema.sql             # Taules, RLS i funció is_admin()
├── src/
│   ├── main.tsx · App.tsx          # Arrencada, layout i rutes (hash router)
│   ├── types.ts                    # Models de dades
│   ├── config/                     # site.ts (marca, categories, xarxes) · nav.ts
│   ├── data/initialLeagueData.ts   # Dades inicials (equips reals + partits d'exemple)
│   ├── store/                      # useLeagueStore (dades + persist) · useUiStore (UI, modals, sessió admin, sync)
│   ├── lib/                        # standings, supabase (auth), remoteSync, confetti, images, utils
│   ├── hooks/                      # useHashRoute, useLeagueView, useRemoteSync, useNow…
│   ├── components/
│   │   ├── ui/ · layout/ · home/ · standings/ · calendar/ · stats/ · gallery/ · club/
│   │   ├── social/                 # Plantilles d'imatge, exportació PNG i textos
│   │   └── admin/                  # Gestors i estudi de xarxes
│   └── pages/                      # Inici, Classificació, Calendari, Golejadors, Galeria, Descobreix-nos i Admin (càrrega diferida)
├── tailwind.config.js · vite.config.ts · tsconfig.json
└── .env.example
```

## Desplegament

L'app és 100 % estàtica (`/dist`) i fa servir rutes amb `#`, per la qual cosa **no necessita regles de reescriptura**.

- **Vercel** — [Importa el repo](https://vercel.com/new) (detecta Vite: *Build* `npm run build`, *Output* `dist`). Afegeix les variables `VITE_SUPABASE_*`.
- **Netlify** — [Nou lloc des de Git](https://app.netlify.com/start); `netlify.toml` ja porta la configuració.
- **GitHub Pages** — `npm run build` i publica `dist` (el `base` és relatiu, `./`).

## Personalització ràpida

- **Marca, categories, xarxes i email**: `src/config/site.ts`.
- **Colors i tipografies**: `tailwind.config.js` (`pitch`, `surface`, `gold`, `neon`; *Barlow Semi Condensed* i *Inter*).
- **Play-off i zona de perill** per categoria: `playoffSpots` / `relegationSpots` a `CATEGORIES` (a la Senior estan neutres fins que es defineixi el format de competició).
- **Textos de «Qui som?»**: `src/pages/DiscoverPage.tsx`.
- **Logo**: substitueix `public/logo.png`.

---

<div align="center">
Fet amb ⚽ a Lleida · <a href="mailto:lleidaleague@gmail.com">lleidaleague@gmail.com</a>
</div>
