/** Higher-resolution variant of a remote image URL (Unsplash `w=` param or Wix `fit/w_…,h_…` transform). */
export function largeImage(url: string, size = 1600): string {
  return url
    .replace(/([?&])w=\d+/, `$1w=${size}`)
    .replace(/\/fit\/w_\d+,h_\d+/, `/fit/w_${size},h_${size}`)
    .replace(/\/fill\/w_\d+,h_\d+/, `/fill/w_${size},h_${Math.round(size * 0.75)}`);
}
