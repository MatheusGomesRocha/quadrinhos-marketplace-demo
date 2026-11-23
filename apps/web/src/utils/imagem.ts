export const MAX_FOTOS = 3;
const MAX_CHARS = 440_000; // abaixo do limite do servidor (450 mil caracteres por foto)

/** Reduz a foto no próprio navegador (lado maior ≤ 900 px, JPEG) para caber no limite e economizar internet. */
export async function reduzirImagem(arquivo: File, lado = 900): Promise<string> {
  if (!/^image\/(jpeg|png|webp)$/.test(arquivo.type)) throw new Error('Envie imagens JPG, PNG ou WEBP.');
  const bmp = await createImageBitmap(arquivo);
  const escala = Math.min(1, lado / Math.max(bmp.width, bmp.height));
  const canvas = document.createElement('canvas');
  canvas.width = Math.round(bmp.width * escala);
  canvas.height = Math.round(bmp.height * escala);
  const ctx = canvas.getContext('2d')!;
  ctx.fillStyle = '#fff';
  ctx.fillRect(0, 0, canvas.width, canvas.height);
  ctx.drawImage(bmp, 0, 0, canvas.width, canvas.height);
  bmp.close();
  for (let q = 0.78; q >= 0.4; q -= 0.12) {
    const url = canvas.toDataURL('image/jpeg', q);
    if (url.length <= MAX_CHARS) return url;
  }
  throw new Error('Esta foto é pesada demais. Tente outra.');
}
