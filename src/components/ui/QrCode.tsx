import { useMemo } from 'react';
import { encode } from 'uqr';

interface Props {
  value: string;
  size: number;
  /** Quiet zone in modules around the code (scanners need some white margin). */
  border?: number;
  dark?: string;
  light?: string;
  className?: string;
}

/** QR code drawn as one SVG path (crisp at any size, no canvas, no innerHTML). */
export function QrCode({ value, size, border = 2, dark = '#05070c', light = '#ffffff', className }: Props) {
  const { path, n } = useMemo(() => {
    const qr = encode(value, { ecc: 'M', border: 0 });
    let d = '';
    qr.data.forEach((row, y) =>
      row.forEach((on, x) => {
        if (on) d += `M${x + border} ${y + border}h1v1h-1z`;
      }),
    );
    return { path: d, n: qr.size + border * 2 };
  }, [value, border]);

  return (
    <svg viewBox={`0 0 ${n} ${n}`} width={size} height={size} shapeRendering="crispEdges" className={className} role="img" aria-label={`Codi QR: ${value}`}>
      <rect width={n} height={n} fill={light} />
      <path d={path} fill={dark} />
    </svg>
  );
}
