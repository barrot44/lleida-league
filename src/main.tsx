import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import '@fontsource/barlow-semi-condensed/600.css';
import '@fontsource/barlow-semi-condensed/700.css';
import '@fontsource/barlow-semi-condensed/800.css';
import '@fontsource/barlow-semi-condensed/900.css';
import '@fontsource-variable/inter';
import './index.css';
import App from './App';
import { installRouter } from './hooks/useHashRoute';

const root = createRoot(document.getElementById('root')!);

// `/obs` is the transparent overlay loaded by OBS: no site shell, no access gate, its own small chunk.
if (window.location.pathname.replace(/\/+$/, '') === '/obs') {
  document.documentElement.classList.add('obs-overlay');
  // The static SEO placeholder inside #root is opaque: never let OBS show it, not even for a frame.
  document.getElementById('root')!.replaceChildren();
  document.title = 'Lleida League · Capa OBS';
  const robots = document.createElement('meta');
  robots.name = 'robots';
  robots.content = 'noindex, nofollow';
  document.head.appendChild(robots);
  void import('./obs/OverlayApp').then(({ default: OverlayApp }) =>
    root.render(
      <StrictMode>
        <OverlayApp />
      </StrictMode>,
    ),
  );
} else {
  installRouter();
  root.render(
    <StrictMode>
      <App />
    </StrictMode>,
  );
}
