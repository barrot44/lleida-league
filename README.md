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
| **Classificació** | Taula en directe (3 pts victòria / 1 empat; desempat per diferència de gols → gols a favor), ratxa V-E-D, **gràfic d'evolució jornada a jornada** i **fitxa d'equip** amb plantilla, president, Lleidalitos i resultats. Confeti quan es corona un campió. |
| **Calendari** | Filtre per jornada i estat, targetes amb marcador digital i **fitxa del partit** (cronologia, assistències, MVP) amb botó **«Imatge per a xarxes»**. |
| **Golejadors i MVPs** | Rànquings amb podi Top 3, **rècords de la lliga**, **quintet ideal** de cada jornada (amb imatge per a xarxes) i **comparador** de jugadors i d'equips amb cara a cara. |
| **Galeria** | Fotos (mosaic, filtres i *lightbox*) i **vídeos i resums** de YouTube, TikTok o Instagram que es reprodueixen dins la web; també a la fitxa del partit i a la portada. |
| **Descobreix-nos** | *Qui som?*, **Palmarès** (historial de campions), **La nostra grada**, **Col·laboradors**, **Àrbitres** i **Moneda virtual** (Lleidalitos, amb saldos i **historial de moviments** en directe) — el contingut de la web antiga. |
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

   Això només cal per al primer. La resta d'administradors s'afegeixen (i es treuen) des del tauler: **Accés → Administradors**
   (necessita `SUPABASE_SERVICE_ROLE_KEY` a Vercel, com la inscripció d'equips).

5. **Settings → API Keys**: copia la *Project URL* i la clau **Publishable** (`sb_publishable_…`; també val la clau *anon* antiga `eyJ…`).
   **Mai** facis servir la clau *secret* / *service_role*. En local, crea `.env.local` (a partir de `.env.example`):

   ```bash
   VITE_SUPABASE_URL=https://EL-TEU-PROJECTE.supabase.co
   VITE_SUPABASE_ANON_KEY=la-teva-anon-key
   ```

   En producció (Vercel / Netlify) afegeix aquestes **mateixes variables** a *Environment Variables* i torna a desplegar.
6. Obre **`/admin`**, entra amb el correu i la contrasenya i fes un primer canvi (o *Ajustos → Publica les dades d'aquest navegador*).
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

## Comptador de llançament i mode manteniment

A **Admin → Accés** pots tancar la web als visitants:

- **Comptador de llançament**: els visitants veuen un compte enrere gegant (dies, hores, minuts i segons) amb el títol i el missatge que triïs. Pots fer que **s'obri sola** quan arribi a zero (amb confeti!).
- **Manteniment**: avís de manteniment, amb un temps estimat opcional.
- A la capçalera del tauler hi ha el botó **«Mode manteniment»** per activar-lo (o desactivar-lo) en un clic. Hi ha també un botó **Previsualitza**.

Els administradors identificats sempre veuen la web (amb un avís groc) i `/admin` continua accessible per poder entrar-hi. La configuració es guarda amb les dades de la lliga: amb Supabase, **tots els visitants la reben en uns 20 segons**.

> És una porta a la web, no una protecció de dades: serveix per preparar un llançament o fer manteniment, però no amaga la base de dades a algú que la consulti directament.

## Directes amb OBS

**Admin → Directe (OBS)** és una sala de control per als directes. A OBS només cal una font **Navegador** amb l'adreça `https://LA-TEVA-WEB/obs`
(1920 × 1080): és una capa transparent que mostra el que decideixis des del tauler, amb la mateixa estètica de la web.

| Gràfic | Què fa |
| --- | --- |
| Marcador | Escuts, resultat, rellotge de futbol sala (compte enrere), part i faltes acumulades |
| Gol! | Animació gran amb el golejador, el minut i el nou resultat (també gol en pròpia) |
| Targetes i temps morts | Avís animat sota el marcador |
| Alineació | Quintet inicial sobre una pista animada + suplents, o la plantilla sencera |
| Prèvia | Els dos equips cara a cara amb posició, punts, ratxa, data i pavelló |
| Jugador destacat / MVP | Targeta amb foto, valoració i estadístiques de la temporada i del partit |
| Classificació, golejadors, resultats i resum | Taules animades amb els equips del partit ressaltats |
| Rètol, barra inferior, marca i patrocinadors | Lower third, ticker amb resultats, «Directe» + @lleidaleague i logos rotatius |
| Pantalles completes | Comencem aviat (amb compte enrere), Tornem de seguida, Descans i Gràcies |

- **Des del mòbil**: amb Supabase, els canvis arriben a OBS per internet en temps real (cal executar `supabase/schema.sql` actualitzat, que crea la taula `obs_state`).
- **Sincronitza amb la web**: els gols, les targetes i el minut també es guarden al partit del calendari.
- **Connexió amb OBS** (opcional, al mateix ordinador): canvia d'escena, comença l'emissió o la gravació i afegeix la capa automàticament
  (OBS → Eines → Configuració del servidor WebSocket).
- `/obs?capes=marcador,rotul` dibuixa només algunes capes, per si vols separar-les en diverses fonts.

### Realització: transicions, repeticions i jugades del partit

Quan afegeixes la capa des de **Connexió amb OBS → «Afegeix la capa a l'escena actual»**, la capa rep l'adreça d'OBS al final de
l'enllaç (`/obs#obs=…`, que mai surt de l'ordinador) i passa a **controlar OBS ella mateixa**. Així, des de qualsevol dispositiu (també el mòbil):

- **Escenes amb la transició del logo**: dues fulles amb el logo tapen la pantalla, OBS canvia d'escena i s'obren.
- **Repetició / Càmera lenta**: desa els últims segons amb el *buffer de repeticions* d'OBS (cal activar-lo a Configuració → Sortida),
  crea sola l'escena «Lleida League · Repetició», la reprodueix amb el rètol «REPETICIÓ» i torna al directe.
- **Jugades del partit**: cada repetició s'acumula en una llista (etiqueta editable i ⭐). El botó **Resum** les reprodueix seguides.

### Votació de l'MVP del públic i QR

- A **Directe → Votació MVP del públic** obres la votació amb els jugadors dels dos equips. La gent vota a **`/vota`**, des del bàner
  de la pàgina d'inici o des de la fitxa del partit (1 vot per dispositiu). Al directe surt un gràfic amb **QR i percentatges en temps real**,
  i en tancar-la, el **guanyador**, que pots desar com a MVP del partit.
- **QR a la cantonada** (Marca, QR i patrocinadors): porta a la web, a la votació, a la classificació o al calendari.
- Cal executar el `supabase/schema.sql` actualitzat (taules `mvp_polls`, `mvp_votes` i la funció `mvp_tally`).

### Situacions, música, entrevista, estadístiques i porra

Cada apartat del panell es pot plegar (la fletxa del títol); el panell recorda quins tens oberts. El marcador ocupa tota
l'amplada (local · rellotge · visitant) i el temps es pot corregir tocant-lo i escrivint-lo (p. ex. `12:34`).

- **Situacions del partit**: Prepartit, Partit, Temps mort, Descans, Entrevista i Final. Cada botó canvia a l'escena d'OBS que hi
  hagis assignat (amb la transició del logo) i posa els gràfics que toquen. Les escenes es trien a «Escena d'OBS de cada situació».
- **Música**: OBS captura el so d'una sola app de l'ordinador (Spotify, Chrome amb YouTube, VLC…) amb una «Captura d'àudio
  d'aplicació» (Windows 10/11). «Prepara la música a OBS» la crea a totes les escenes; després la fas sonar o l'apagues amb
  una fosa, o deixes que ho facin les situacions (sona a Prepartit, Descans i Final).
- **Mode entrevista**: rètol a baix al mig amb nom, càrrec i escut, la pregunta al costat i una franja de patrocinadors.
- **Estadístiques en directe**: xuts, xuts a porta, parades, córners, faltes i targetes; surten en un gràfic i a `/directe`.
- **Porra en directe**: preguntes ràpides (qui guanyarà, proper gol…) o la teva; es vota a `/vota` amb el mateix QR que l'MVP.
  Surt **sota el marcador** amb una línia i el % de cada resposta (o en gran amb QR). El jugador destacat també pot sortir
  sota el marcador. Les faltes acumulades són a sobre de cada equip.
- **Dau del públic**: el resultat diu directament «1 contra 1 durant 2 minuts», «2 contra 2»… (el 5 compta com a 1 i el 6 com a 2).
- **Jugadors**: només es distingeix porter o jugador.

### App al mòbil i avisos

La web es pot instal·lar com a app (Android/ordinador: botó «Instal·la-la»; iPhone: Compartir → Afegeix a la pantalla d'inici).
Qui activa els avisos rep notificacions quan comença el directe, a cada gol, al final i quan s'obre una votació (automàtics o
des de **Directe → Avisos al mòbil**). Necessita:

1. El `supabase/schema.sql` actualitzat (taula `push_subscriptions` i funcions `push_*`).
2. La variable `VAPID_PRIVATE_KEY` a Vercel (la clau privada és a `.env.local`, que no es puja mai a GitHub):
   `npx vercel env add VAPID_PRIVATE_KEY production --sensitive` i torna a publicar.

## Inscripció d'equips (presidents)

Cada president entra a **`/inscripcio`** amb el correu i la contrasenya que li dona l'organització i omple només el seu equip:
escut, nom, sigles i colors; les seves dades; i els jugadors (nom, dorsal, porter o jugador, data de naixement, foto de cara
tipus DNI i foto del DNI). També imprimeix el paper de drets d'imatge (ja surt amb els jugadors), el fa signar i en puja la foto.
La pàgina s'obre encara que el comptador de llançament estigui actiu.

- **Públic**: escut, nom de l'equip, president i la seva foto, i de cada jugador el nom, el dorsal, el rol i la foto de cara.
- **Privat** (només l'organització): DNI, dates de naixement, telèfon i papers signats, en el bucket privat `privat` de Supabase.
  Des de la inscripció, «Esborra els DNI» els elimina un cop comprovada l'edat.

Al tauler, **Inscripcions**: «Dona d'alta un president» (correu + categoria + contrasenya generada) crea l'accés i et prepara el
missatge per enviar-li. Després revises cada inscripció, mires els DNI i els papers, i l'aproves (l'equip i els jugadors passen a
la lliga) o li demanes canvis amb una nota. Necessita:

1. El `supabase/schema.sql` actualitzat (secció 4f: taula `registrations`, funcions i bucket `privat`).
2. Per crear els comptes amb un clic, la variable `SUPABASE_SERVICE_ROLE_KEY` a Vercel (Supabase → Project Settings →
   API Keys → `service_role` / secret): `npx vercel env add SUPABASE_SERVICE_ROLE_KEY production --sensitive` i torna a publicar.
   Sense aquesta clau, el compte es crea a mà: Supabase → Authentication → Users → Add user → Create new user, amb
   «Auto Confirm User» marcat.

## Estructura del projecte

```
├── index.html
├── public/logo.png                 # Escut oficial
├── supabase/schema.sql             # Taules, RLS i funció is_admin()
├── vercel.json · netlify.toml      # Rutes de l'SPA i capçaleres de caché
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

## Publica-la gratis i que surti a Google

No cal comprar cap domini. Els tres hostings següents regalen una adreça pròpia i Google l'indexa igual:

| Hosting | Adreça gratuïta | Nota |
| --- | --- | --- |
| **Vercel** | `nom.vercel.app` | El més còmode. El pla *Hobby* és per a ús no comercial. |
| **Netlify** | `nom.netlify.app` | `netlify.toml` ja porta la configuració. |
| **Cloudflare Pages** | `nom.pages.dev` | Permet ús comercial al pla gratuït. |

**Passos amb Vercel** (els altres són equivalents):

1. Fes el *merge* de la branca a `main` (pull request a GitHub).
2. A [vercel.com/new](https://vercel.com/new) importa el repo `lleida-league-app`. Posa-hi un nom curt, p. ex. `lleida-league` → l'adreça serà `lleida-league.vercel.app`.
3. A *Environment Variables* afegeix `VITE_SUPABASE_URL` i `VITE_SUPABASE_ANON_KEY` (mateixos valors que el `.env.local`) i desplega.
4. Obre l'adreça i comprova que `/classificacio`, `/calendari`… carreguen directament (el fitxer `vercel.json` ho garanteix).

**Domini propi (`www.lleidaleague.com`):** comprat a Cloudflare i afegit a Vercel (Settings → Domains). A Cloudflare, els registres
DNS que indica Vercel (A per a `@`, CNAME per a `www`) han d'estar en gris, «DNS only». `lleida-league.vercel.app` redirigeix al
domini (`vercel.json`) i l'adreça pública per a SEO és a `.env.production` (`VITE_SITE_URL`).

**Perquè Google la trobi:**

1. Entra a [Google Search Console](https://search.google.com/search-console) → *Afegeix una propietat* → *Prefix de l'URL* i escriu la teva adreça.
2. Verifica-la amb l'opció *Etiqueta HTML* (enganxa la `<meta name="google-site-verification" …>` dins del `<head>` d'`index.html`) i torna a desplegar.
3. A *Sitemaps* envia `sitemap.xml`. A *Inspecció d'URL* enganxa la portada i prem *Sol·licita la indexació*.
4. Tarda dies (de vegades setmanes) a aparèixer. Ajuda molt posar l'adreça a la bio d'Instagram, TikTok i YouTube i que et enllacin.

**Què ja està preparat per a SEO:** URLs reals per a cada pàgina, títol i descripció propis per pàgina, `canonical`, Open Graph/Twitter (imatge `og-image.png`), dades estructurades JSON-LD (`SportsOrganization`), `sitemap.xml` i `robots.txt` generats en construir (l'adreça es detecta sola a Vercel i Netlify; amb domini propi defineix `VITE_SITE_URL`) i contingut inicial en HTML per als cercadors.

> Mentre el **comptador o el manteniment** estiguin actius, Google veurà aquella pantalla en lloc de la web: desactiva'ls abans de demanar la indexació.

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
