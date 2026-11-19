// =============================================================================
// Browser-side upload helpers for /admin/content. CLIENT ONLY.
// =============================================================================

/** PUT a file/blob to a presigned S3 URL, reporting progress 0–1. */
export function putToS3(
  url: string, body: Blob, contentType: string, onProgress?: (fraction: number) => void,
): Promise<void> {
  return new Promise((resolve, reject) => {
    const xhr = new XMLHttpRequest();
    xhr.open('PUT', url);
    // Must match the type the URL was signed for, or S3 answers 403.
    xhr.setRequestHeader('Content-Type', contentType);
    xhr.upload.onprogress = (e) => {
      if (e.lengthComputable && onProgress) onProgress(e.loaded / e.total);
    };
    xhr.onload = () => (xhr.status >= 200 && xhr.status < 300
      ? resolve()
      : reject(new Error(`Storage refused the upload (${xhr.status}).`)));
    // A CORS rejection surfaces here with no status at all.
    xhr.onerror = () => reject(new Error('The upload could not reach storage. Check your connection and try again.'));
    xhr.onabort = () => reject(new Error('Upload cancelled.'));
    xhr.send(body);
  });
}

/** Whole minutes (rounded up, as the loaders did) of an audio file, or null. */
export function audioMinutes(file: File): Promise<number | null> {
  return new Promise((resolve) => {
    const audio = new Audio();
    const src = URL.createObjectURL(file);
    const done = (value: number | null) => { URL.revokeObjectURL(src); resolve(value); };
    audio.preload = 'metadata';
    audio.onloadedmetadata = () =>
      done(Number.isFinite(audio.duration) && audio.duration > 0 ? Math.ceil(audio.duration / 60) : null);
    audio.onerror = () => done(null);
    audio.src = src;
  });
}

function toBlob(canvas: HTMLCanvasElement): Promise<Blob> {
  return new Promise((resolve, reject) => {
    // Safari can't encode WebP and silently hands back a PNG; the caller
    // reads blob.type rather than assuming.
    canvas.toBlob((b) => (b ? resolve(b) : reject(new Error('Could not process that image.'))), 'image/webp', 0.86);
  });
}

/**
 * Headshot: a square crop, 400px. PresenterCard shows a 140px cover crop, so
 * the source must already be a face-centred square (and small — the 8-18-26
 * rule: always downscale headshots). `focus` 0–1 slides the crop window along
 * the image's long side: 0 = top/left, 1 = bottom/right.
 */
export async function squareCrop(file: File, focus: number, size = 400): Promise<Blob> {
  const bitmap = await createImageBitmap(file);
  const side = Math.min(bitmap.width, bitmap.height);
  const sx = (bitmap.width - side) * (bitmap.width > bitmap.height ? focus : 0.5);
  const sy = (bitmap.height - side) * (bitmap.height >= bitmap.width ? focus : 0.5);
  const canvas = document.createElement('canvas');
  canvas.width = canvas.height = Math.min(size, side);
  const ctx = canvas.getContext('2d')!;
  ctx.imageSmoothingQuality = 'high';
  ctx.drawImage(bitmap, sx, sy, side, side, 0, 0, canvas.width, canvas.height);
  bitmap.close();
  return toBlob(canvas);
}

/** Org logo: whole image, transparency kept, longest side capped at 480px. */
export async function fitImage(file: File, max = 480): Promise<Blob> {
  const bitmap = await createImageBitmap(file);
  const scale = Math.min(1, max / Math.max(bitmap.width, bitmap.height));
  const canvas = document.createElement('canvas');
  canvas.width = Math.round(bitmap.width * scale);
  canvas.height = Math.round(bitmap.height * scale);
  const ctx = canvas.getContext('2d')!;
  ctx.imageSmoothingQuality = 'high';
  ctx.drawImage(bitmap, 0, 0, canvas.width, canvas.height);
  bitmap.close();
  return toBlob(canvas);
}
