import { defineConfig, loadEnv, type Plugin } from 'vite';
import react from '@vitejs/plugin-react';
import { fileURLToPath, URL } from 'node:url';

const ROUTES = ['/', '/classificacio', '/calendari', '/golejadors', '/galeria', '/descobreix-nos'];
const SOCIALS = ['https://www.instagram.com/lleidaleague/', 'https://www.tiktok.com/@lleidaleague', 'https://www.youtube.com/@LleidaLeague'];

/**
 * SEO at build time: canonical + Open Graph URLs, JSON-LD, sitemap.xml and robots.txt.
 * The public URL comes from VITE_SITE_URL, or from the host's own build variables
 * (Vercel: VERCEL_PROJECT_PRODUCTION_URL, Netlify: URL). Without any of them the absolute-URL parts are skipped.
 */
function seoPlugin(env: Record<string, string | undefined>): Plugin {
  const raw = env.VITE_SITE_URL || (env.VERCEL_PROJECT_PRODUCTION_URL ? `https://${env.VERCEL_PROJECT_PRODUCTION_URL}` : env.URL || '');
  const siteUrl = raw.replace(/\/+$/, '');

  return {
    name: 'lleida-league-seo',
    transformIndexHtml() {
      const jsonLd = {
        '@context': 'https://schema.org',
        '@type': 'SportsOrganization',
        name: 'Lleida League',
        alternateName: ['LLEIDA LEAGUE', 'LleidaLeague', 'Lleida League Futbol Sala'],
        slogan: 'Més que un joc, una batalla presidencial',
        sport: 'Futsal',
        foundingDate: '2023-02-27',
        areaServed: 'Lleida',
        email: 'lleidaleague@gmail.com',
        sameAs: SOCIALS,
        ...(siteUrl ? { url: siteUrl, logo: `${siteUrl}/logo.png` } : {}),
      };
      // Google takes the name it shows above the result ("site name") from this WebSite block.
      const website = siteUrl ? { '@context': 'https://schema.org', '@type': 'WebSite', name: 'Lleida League', alternateName: ['LleidaLeague', 'LLEIDA LEAGUE'], url: `${siteUrl}/`, inLanguage: 'ca' } : null;
      return [
        { tag: 'script', attrs: { type: 'application/ld+json' }, children: JSON.stringify(jsonLd), injectTo: 'head' as const },
        ...(website ? [{ tag: 'script', attrs: { type: 'application/ld+json' }, children: JSON.stringify(website), injectTo: 'head' as const }] : []),
        ...(siteUrl
          ? [
              { tag: 'link', attrs: { rel: 'canonical', href: `${siteUrl}/` }, injectTo: 'head' as const },
              { tag: 'meta', attrs: { property: 'og:url', content: `${siteUrl}/` }, injectTo: 'head' as const },
              { tag: 'meta', attrs: { property: 'og:image', content: `${siteUrl}/og-image.png` }, injectTo: 'head' as const },
              { tag: 'meta', attrs: { name: 'twitter:image', content: `${siteUrl}/og-image.png` }, injectTo: 'head' as const },
            ]
          : []),
      ];
    },
    generateBundle() {
      this.emitFile({
        type: 'asset',
        fileName: 'robots.txt',
        source: `User-agent: *\nAllow: /\nDisallow: /admin\nDisallow: /obs\n${siteUrl ? `\nSitemap: ${siteUrl}/sitemap.xml\n` : ''}`,
      });
      if (!siteUrl) return;
      const today = new Date().toISOString().slice(0, 10);
      const urls = ROUTES.map((p) => `  <url><loc>${siteUrl}${p === '/' ? '/' : p}</loc><lastmod>${today}</lastmod><changefreq>${p === '/' ? 'daily' : 'weekly'}</changefreq><priority>${p === '/' ? '1.0' : '0.8'}</priority></url>`).join('\n');
      this.emitFile({ type: 'asset', fileName: 'sitemap.xml', source: `<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n${urls}\n</urlset>\n` });
    },
  };
}

export default defineConfig(({ mode }) => ({
  plugins: [react(), seoPlugin({ ...loadEnv(mode, process.cwd(), ''), ...process.env })],
  resolve: {
    alias: { '@': fileURLToPath(new URL('./src', import.meta.url)) },
  },
  server: { port: 5173 },
  build: {
    chunkSizeWarningLimit: 900,
    rollupOptions: {
      output: {
        // Libraries in their own files: they rarely change, so phones keep them cached between deploys.
        manualChunks: {
          react: ['react', 'react-dom'],
          motion: ['framer-motion'],
        },
      },
    },
  },
}));
