import { useEffect, useRef, useState, type ReactNode } from 'react';
import { Copy, Download, Loader2, Share2 } from 'lucide-react';
import { useUiStore } from '@/store/useUiStore';

interface Props {
  width: number;
  height: number;
  filename: string;
  caption: string;
  children: ReactNode;
}

/** Scaled live preview of a 1080-px artwork + PNG export, native share sheet and caption copy. */
export function SocialCard({ width, height, filename, caption, children }: Props) {
  const toast = useUiStore((s) => s.toast);
  const wrapRef = useRef<HTMLDivElement>(null);
  const nodeRef = useRef<HTMLDivElement>(null);
  const [scale, setScale] = useState(0.3);
  const [busy, setBusy] = useState<'download' | 'share' | null>(null);
  const canShareFiles = typeof navigator !== 'undefined' && typeof navigator.canShare === 'function';

  useEffect(() => {
    const el = wrapRef.current;
    if (!el) return;
    const update = () => setScale(Math.max(0.12, Math.min(el.clientWidth / width, 720 / height, 1)));
    update();
    const ro = new ResizeObserver(update);
    ro.observe(el);
    return () => ro.disconnect();
  }, [width, height]);

  const render = async (): Promise<string> => {
    if (!nodeRef.current) throw new Error('No hi ha res a exportar.');
    const { toPng } = await import('html-to-image');
    // First pass warms up fonts/images (otherwise some browsers export them blank).
    await toPng(nodeRef.current, { width, height, pixelRatio: 1, style: { transform: 'none' } }).catch(() => undefined);
    return toPng(nodeRef.current, { width, height, pixelRatio: 1, cacheBust: true, style: { transform: 'none' } });
  };

  const download = async () => {
    setBusy('download');
    try {
      const url = await render();
      const a = document.createElement('a');
      a.href = url;
      a.download = `${filename}.png`;
      document.body.appendChild(a);
      a.click();
      a.remove();
      toast('Imatge descarregada!');
    } catch {
      toast('No s’ha pogut generar la imatge (alguna foto externa pot bloquejar l’exportació).', 'error');
    } finally {
      setBusy(null);
    }
  };

  const share = async () => {
    setBusy('share');
    try {
      const url = await render();
      const blob = await (await fetch(url)).blob();
      const file = new File([blob], `${filename}.png`, { type: 'image/png' });
      if (navigator.canShare?.({ files: [file] })) {
        await navigator.share({ files: [file], text: caption });
      } else {
        toast('Aquest dispositiu no permet compartir imatges directament: descarrega-la.', 'info');
      }
    } catch (e) {
      if (!(e instanceof DOMException && e.name === 'AbortError')) toast('No s’ha pogut compartir la imatge.', 'error');
    } finally {
      setBusy(null);
    }
  };

  const copyCaption = async () => {
    try {
      await navigator.clipboard.writeText(caption);
      toast('Text copiat al porta-retalls.');
    } catch {
      toast('No s’ha pogut copiar el text.', 'error');
    }
  };

  return (
    <div className="space-y-4">
      <div ref={wrapRef} className="mx-auto w-full max-w-[620px]">
        <div className="mx-auto overflow-hidden rounded-2xl border border-white/10 shadow-2xl" style={{ width: width * scale, height: height * scale }}>
          <div ref={nodeRef} style={{ width, height, transform: `scale(${scale})`, transformOrigin: 'top left' }}>
            {children}
          </div>
        </div>
      </div>

      <div className="flex flex-wrap justify-center gap-3">
        <button className="btn-gold" onClick={() => void download()} disabled={busy !== null}>
          {busy === 'download' ? <Loader2 size={16} className="animate-spin" /> : <Download size={16} />} Descarrega PNG
        </button>
        {canShareFiles && (
          <button className="btn-ghost" onClick={() => void share()} disabled={busy !== null}>
            {busy === 'share' ? <Loader2 size={16} className="animate-spin" /> : <Share2 size={16} />} Comparteix
          </button>
        )}
        <button className="btn-ghost" onClick={() => void copyCaption()}>
          <Copy size={16} /> Copia el text
        </button>
      </div>

      <label className="block">
        <span className="label">Text suggerit per a la publicació</span>
        <textarea readOnly value={caption} rows={6} className="input min-h-[130px] resize-y text-[13px] leading-relaxed" onFocus={(e) => e.currentTarget.select()} />
      </label>
    </div>
  );
}
