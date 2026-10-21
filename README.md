<div align="center">

<img src="public/logo.png" alt="Lleida League — Futsal" width="140" />

# LLEIDA LEAGUE

**Més que un joc, una batalla presidencial.**

La plataforma web oficial de la liga de fútbol sala de Lleida: clasificación en directo, calendario y resultados,
goleadores & MVPs, galería y un panel de administración "todo en uno".

`React 18` · `TypeScript (strict)` · `Vite` · `Tailwind CSS` · `Framer Motion` · `Zustand` · `Radix UI`

</div>

---

## ¿Qué es?

**Lleida League** (desde 2023) organiza cuatro competiciones de fútbol sala — **Senior, Juvenil, Junior y Femenina** — con
un tono propio: cada equipo tiene un *presidente* y cada jornada es una *batalla presidencial*.

Esta aplicación sustituye a la web antigua ([Wix](https://lleidaleague.wixsite.com/lleidaleague)) por una **SPA moderna, rápida y
sin backend obligatorio**, con estética de videojuego deportivo (inspirada en Kings League y EA Sports FC):
modo oscuro, acentos dorado/cian/esmeralda, glassmorphism, tarjetas holográficas 3D y micro‑animaciones.

## Funcionalidades

| Área | Qué incluye |
| --- | --- |
| **Cabecera** | Logo con brillo neón, ticker animado (en directo · próximos · últimos resultados), selector de categoría y navegación; en móvil, barra inferior tipo app. |
| **Inicio** | Hero con partículas, **cuenta atrás en tiempo real** al próximo gran partido, banner del partido en directo, tarjetas FIFA del **MVP de la semana** y del **máximo goleador** con *tilt* 3D + holograma, mini‑clasificación, comunicados y galería. |
| **Clasificación** | Tabla en vivo (3 pts victoria / 1 empate; desempate por diferencia de goles → goles a favor), zonas de play‑off y de peligro, racha V‑E‑D y **modal de equipo** con plantilla, historia, resultados y próximo partido. Confeti cuando se corona un campeón. |
| **Calendario** | Filtro por jornada y estado, tarjetas con marcador digital y **Ficha del partido** (cronología de goles/tarjetas con asistencias y MVP). |
| **Goleadores & MVPs** | Podio Top 3 (oro/plata/bronce), rankings de goles, MVPs y asistencias con búsqueda por jugador/equipo y filtro por posición, y ficha de jugador. |
| **Galería** | Mosaico (masonry) con filtros por categoría, jornada y equipo, y *lightbox* a pantalla completa (flechas, teclado y gestos). |
| **Admin** | Gestor de partidos (marcador en vivo, goleadores, asistencias, tarjetas, MVP), equipos, jugadores, galería y comunicados; exportar/importar JSON y restablecer datos. |

### Cálculo automático

La clasificación y las estadísticas de los jugadores **no se guardan: se derivan** de los partidos. Cada vez que un partido pasa a
`finished` (o se edita/elimina) todo se recalcula y reordena al instante:

- **Clasificación** → `src/lib/standings.ts` (`computeStandings`).
- **Goles, asistencias, tarjetas y MVPs** → `recomputePlayerStats` (suma de eventos de partidos finalizados + *ajustes manuales* que el admin puede aplicar).

## Puesta en marcha

Requisitos: **Node.js 18+**.

```bash
npm install
npm run dev        # http://localhost:5173
```

```bash
npm run build      # typecheck (tsc strict) + build de producción en /dist
npm run preview    # sirve /dist en local
npm run typecheck  # solo comprobación de tipos
```

### Acceso al panel de administración

Pulsa **Admin** (candado) en la cabecera. Contraseña por defecto: **`admin123`**.
Puedes cambiarla desde *Admin → Ajustes y copia* o fijando `VITE_ADMIN_PASSWORD` en tu `.env.local`.

> ⚠️ **Importante:** al ser una app 100 % cliente, la contraseña es solo una barrera de interfaz (cualquiera con las
> herramientas de desarrollador puede saltársela). Sirve para evitar toques accidentales, **no** como seguridad real.
> Si necesitas protección de verdad, conecta un backend con autenticación (ver *Sincronización con Supabase*).

## Datos y persistencia

- Toda la información vive en **`localStorage`** (clave `lleida-league:data`) y sobrevive a recargas.
- Al primer arranque se carga un **seed de demostración** (`src/data/initialLeagueData.ts`): 26 equipos, 234 jugadores,
  146 partidos, galería y comunicados. Es determinista y sus fechas son **relativas a "hoy"**, así que siempre hay un partido
  en directo y próximos encuentros. *Los equipos, jugadores y resultados son ficticios.*
- **Admin → Ajustes y copia**: *Exportar datos (JSON)*, *Importar copia* y *Restablecer datos originales*.
- Los datos solo existen en el navegador de quien los edita. Para compartirlos entre dispositivos/visitantes usa la
  sincronización opcional de abajo (o exporta/importa el JSON).

### Modelo de datos (`src/types.ts`)

`Team`, `Player`, `Match` (con `MatchEvent[]`: goles, asistencias, tarjetas, goles en propia), `GalleryItem` y `NewsItem`
con las categorías `senior | juvenil | junior | femenina`. Los escudos y avatares se **generan** a partir de los colores del equipo
cuando no se indica una URL (`logoUrl` / `photoUrl` vacíos).

## Sincronización con Supabase (opcional)

La capa de datos está preparada para sincronizar con Supabase **sin SDK** (PostgREST sobre `fetch`) con solo definir variables de entorno:

1. Crea un proyecto en [Supabase](https://supabase.com) y ejecuta en el *SQL Editor*:

   ```sql
   create table if not exists public.league_state (
     id text primary key,
     data jsonb not null,
     updated_at timestamptz not null default now()
   );

   alter table public.league_state enable row level security;

   -- Lectura pública (la web pública necesita leer los datos)
   create policy "public read" on public.league_state for select using (true);

   -- ⚠️ SOLO PARA DEMO: permite escribir a cualquiera que tenga la anon key.
   -- En producción NO lo uses: restringe la escritura a usuarios autenticados.
   create policy "demo write" on public.league_state for insert with check (true);
   create policy "demo update" on public.league_state for update using (true) with check (true);
   ```

2. Copia `.env.example` a `.env.local` y rellena:

   ```bash
   VITE_SUPABASE_URL=https://TU-PROYECTO.supabase.co
   VITE_SUPABASE_ANON_KEY=tu-anon-key
   ```

3. Reinicia `npm run dev`. Al cargar, la app **lee** el estado remoto; mientras el panel admin está desbloqueado, cada cambio se
   **envía** (con *debounce*) a la fila `main`. Sin variables, todo sigue funcionando solo con `localStorage`.

> La sincronización es un punto de partida: no resuelve conflictos entre varios administradores simultáneos ni autenticación.
> Para un entorno real, añade Supabase Auth y políticas RLS que limiten la escritura a administradores. (Para Firebase basta con
> sustituir `src/lib/remoteSync.ts`, que expone solo `pullRemote` y `pushRemote`.)

## Estructura del proyecto

```
├── index.html
├── public/logo.png                 # Escudo oficial
├── src/
│   ├── main.tsx · App.tsx          # Arranque, layout y rutas (hash router)
│   ├── index.css                   # Tailwind + capas de diseño (glass, neón, marcador digital…)
│   ├── types.ts                    # Modelos de datos
│   ├── config/                     # site.ts (marca, categorías, redes) · nav.ts
│   ├── data/initialLeagueData.ts   # Seed de demostración (determinista y relativo a "hoy")
│   ├── store/                      # useLeagueStore (datos + persist) · useUiStore (categoría, modales, toasts, admin)
│   ├── lib/                        # standings (cálculo), confetti, remoteSync, auth, utils
│   ├── hooks/                      # useHashRoute, useLeagueView, useNow, useRemoteSync…
│   ├── components/
│   │   ├── ui/                     # TeamCrest, PlayerAvatar, PlayerCard (FIFA), TiltCard, Modal, Toaster…
│   │   ├── layout/                 # Header, Ticker, MobileNav, Footer, GlobalModals
│   │   ├── home/ · standings/ · calendar/ · stats/ · gallery/
│   │   └── admin/                  # Gestores de partidos, equipos, jugadores, galería, comunicados y ajustes
│   └── pages/                      # Home, Standings, Calendar, Stats, Gallery y Admin (carga diferida)
├── tailwind.config.js · vite.config.ts · tsconfig.json
└── .env.example
```

## Despliegue

La app es 100 % estática (`/dist`) y usa rutas con `#`, por lo que **no necesita reglas de reescritura** en ningún hosting.

**Vercel** — [Importar el repo](https://vercel.com/new) (detecta Vite automáticamente: *Build* `npm run build`, *Output* `dist`).

**Netlify** — [Nuevo sitio desde Git](https://app.netlify.com/start); el archivo `netlify.toml` ya incluye la configuración.

**GitHub Pages** — `npm run build` y publica la carpeta `dist` (el `base` es relativo, `./`).

Si usas Supabase, añade las variables `VITE_*` en el panel de variables de entorno del hosting.

## Personalización rápida

- **Marca, categorías, redes y email**: `src/config/site.ts`.
- **Colores y tipografías**: `tailwind.config.js` (paleta `pitch`, `surface`, `gold`, `neon`; fuentes *Barlow Semi Condensed* e *Inter*).
- **Play‑off y zona de peligro** por categoría: `playoffSpots` / `relegationSpots` en `CATEGORIES`.
- **Logo**: sustituye `public/logo.png`.

---

<div align="center">
Hecho con ⚽ en Lleida · <a href="mailto:lleidaleague@gmail.com">lleidaleague@gmail.com</a>
</div>
