/**
 * Arte FICTÍCIA gerada por código (SVG): capas, versos e fotos de "cenário".
 * Nada aqui copia uma obra real: são composições geométricas determinadas pelo título (mesmo título, mesma arte).
 */
import type { TipoProduto } from './tipos';

export interface DadosArte { titulo: string; autor?: string; tipo: TipoProduto; cor: string }
export type VistaArte = 'frente' | 'verso' | 'cenario' | 'foto';

const hash = (s: string) => { let h = 2166136261; for (let i = 0; i < s.length; i++) { h ^= s.charCodeAt(i); h = Math.imul(h, 16777619); } return h >>> 0; };
const gerador = (semente: number) => { let a = semente || 1; return () => { a = (Math.imul(a, 1664525) + 1013904223) >>> 0; return a / 4294967296; }; };
const esc = (s: string) => s.replace(/[<>&"']/g, (c) => ({ '<': '&lt;', '>': '&gt;', '&': '&amp;', '"': '&quot;', "'": '&#39;' })[c]!);

const rgb = (hex: string): [number, number, number] => { const n = parseInt(hex.replace('#', '').padEnd(6, '0').slice(0, 6), 16); return [(n >> 16) & 255, (n >> 8) & 255, n & 255]; };
const hex = ([r, g, b]: number[]) => `#${[r, g, b].map((v) => Math.max(0, Math.min(255, Math.round(v))).toString(16).padStart(2, '0')).join('')}`;
const misturar = (a: string, b: string, t: number) => { const x = rgb(a), y = rgb(b); return hex(x.map((v, i) => v + (y[i]! - v) * t)); };
const claro = (c: string, t: number) => misturar(c, '#ffffff', t);
const escuro = (c: string, t: number) => misturar(c, '#000000', t);

/** Quebra o título em até `max` linhas de ~`largura` caracteres. */
function linhas(titulo: string, largura: number, max = 3): string[] {
  const palavras = titulo.split(/\s+/).filter(Boolean);
  const out: string[] = [];
  let atual = '';
  for (const p of palavras) {
    if (atual && (atual + ' ' + p).length > largura) { out.push(atual); atual = p; } else atual = atual ? `${atual} ${p}` : p;
  }
  if (atual) out.push(atual);
  if (out.length > max) { const resto = out.splice(max - 1).join(' '); out.push(resto.length > largura + 4 ? `${resto.slice(0, largura + 1)}…` : resto); }
  return out;
}

const texto = (linhasT: string[], x: number, y0: number, tam: number, atrib: string, passo = 1.12) =>
  linhasT.map((l, i) => `<text x="${x}" y="${y0 + i * tam * passo}" font-size="${tam}" ${atrib}>${esc(l)}</text>`).join('');

function frente(d: DadosArte, p: string): string {
  const h = hash(d.titulo);
  const r = gerador(h);
  const topo = claro(d.cor, 0.12), base = escuro(d.cor, 0.55), acento = misturar(d.cor, '#fde047', 0.7), tinta = escuro(d.cor, 0.75);
  const fundo = `<defs><linearGradient id="${p}g" x1="0" y1="0" x2="0.6" y2="1"><stop offset="0" stop-color="${topo}"/><stop offset="1" stop-color="${base}"/></linearGradient></defs><rect width="300" height="420" fill="url(#${p}g)"/>`;
  const autor = d.autor ? esc(d.autor.toUpperCase()) : '';

  if (d.tipo === 'manga') {
    let raios = '';
    for (let i = 0; i < 36; i++) { const a = (i / 36) * Math.PI * 2 + r() * 0.1; raios += `<path d="M120 190 L${(120 + Math.cos(a) * 420).toFixed(0)} ${(190 + Math.sin(a) * 420).toFixed(0)}" stroke="#fff" stroke-opacity="${(0.06 + r() * 0.12).toFixed(2)}" stroke-width="${(1 + r() * 4).toFixed(1)}"/>`; }
    let pontos = '';
    for (let y = 0; y < 9; y++) for (let x = 0; x < 14; x++) pontos += `<circle cx="${10 + x * 20}" cy="${300 + y * 14}" r="${Math.max(0.4, 4.2 - y * 0.5).toFixed(1)}" fill="${tinta}" fill-opacity=".35"/>`;
    const tit = d.titulo.length > 26 ? `${d.titulo.slice(0, 25)}…` : d.titulo;
    const comp = Math.min(tit.length * 14, 250);
    return `${fundo}${raios}<circle cx="110" cy="200" r="78" fill="#fff" fill-opacity=".92"/><path d="M40 330 C50 250 90 232 110 232 C140 232 175 252 182 330 Z" fill="${tinta}"/><circle cx="110" cy="190" r="42" fill="${claro(d.cor, 0.7)}"/><path d="M68 186 C80 140 140 140 152 186 C140 168 80 168 68 186Z" fill="${tinta}"/><circle cx="96" cy="196" r="4" fill="${tinta}"/><circle cx="124" cy="196" r="4" fill="${tinta}"/>${pontos}<rect x="216" y="22" width="64" height="276" fill="#fff"/><rect x="220" y="26" width="56" height="268" fill="none" stroke="${tinta}" stroke-width="1.5"/><text transform="translate(260 36) rotate(90)" font-size="26" font-weight="900" font-family="'Arial Black',Impact,sans-serif" fill="${tinta}" textLength="${comp}" lengthAdjust="spacingAndGlyphs">${esc(tit.toUpperCase())}</text><rect x="14" y="14" width="44" height="22" rx="3" fill="${acento}"/><text x="36" y="30" font-size="12" font-weight="800" text-anchor="middle" font-family="Arial,sans-serif" fill="${tinta}">VOL. ${(h % 12) + 1}</text><text x="150" y="404" font-size="12" font-weight="700" text-anchor="middle" font-family="Arial,sans-serif" fill="#fff" fill-opacity=".9" letter-spacing="2">${autor}</text>`;
  }

  if (d.tipo === 'hq') {
    let estrela = '';
    for (let i = 0; i < 24; i++) { const a = (i / 24) * Math.PI * 2, rr = i % 2 ? 84 : 128; estrela += `${(150 + Math.cos(a) * rr).toFixed(1)},${(220 + Math.sin(a) * rr).toFixed(1)} `; }
    let pontos = '';
    for (let y = 0; y < 8; y++) for (let x = 0; x < 8; x++) pontos += `<circle cx="${20 + x * 14}" cy="${330 + y * 11}" r="${(3 - y * 0.3).toFixed(1)}" fill="${tinta}" fill-opacity=".4"/>`;
    const l = linhas(d.titulo.toUpperCase(), 14, 2);
    return `${fundo}${pontos}<polygon points="${estrela}" fill="${acento}" stroke="${tinta}" stroke-width="5" stroke-linejoin="round"/><polygon points="${estrela}" fill="none" stroke="#fff" stroke-width="2" transform="translate(150 220) scale(.9) translate(-150 -220)"/><text x="150" y="268" font-size="128" font-weight="900" text-anchor="middle" font-family="Impact,'Arial Black',sans-serif" fill="${tinta}" stroke="#fff" stroke-width="4" paint-order="stroke">${esc((d.titulo[0] ?? 'H').toUpperCase())}</text><rect x="0" y="0" width="300" height="${l.length > 1 ? 92 : 66}" fill="${tinta}"/><rect x="0" y="${l.length > 1 ? 92 : 66}" width="300" height="6" fill="${acento}"/>${texto(l, 150, l.length > 1 ? 40 : 46, Math.min(32, 280 / (Math.max(...l.map((x) => x.length)) * 0.66)), `text-anchor="middle" font-weight="900" font-family="Impact,'Arial Black',sans-serif" fill="#fff" letter-spacing="1"`, 1.05)}<rect x="0" y="388" width="300" height="32" fill="${tinta}"/><text x="150" y="409" font-size="13" font-weight="700" text-anchor="middle" font-family="Arial,sans-serif" fill="${acento}" letter-spacing="2">${autor}</text>`;
  }

  if (d.tipo === 'gibi') {
    const fundoClaro = claro(d.cor, 0.62);
    const rostos = [60, 150, 240].map((x, i) => { const y = 250 + (i % 2) * 22, rad = 46 + Math.floor(r() * 12); const pele = ['#fcd5b0', '#e9b48a', '#c98f66', '#f6c9a0'][Math.floor(r() * 4)]!; return `<circle cx="${x}" cy="${y}" r="${rad}" fill="${pele}" stroke="${tinta}" stroke-width="4"/><circle cx="${x - 15}" cy="${y - 6}" r="6" fill="#fff" stroke="${tinta}" stroke-width="2"/><circle cx="${x + 15}" cy="${y - 6}" r="6" fill="#fff" stroke="${tinta}" stroke-width="2"/><circle cx="${x - 14}" cy="${y - 5}" r="2.5" fill="${tinta}"/><circle cx="${x + 14}" cy="${y - 5}" r="2.5" fill="${tinta}"/><path d="M${x - 16} ${y + 16} Q${x} ${y + 32} ${x + 16} ${y + 16}" fill="none" stroke="${tinta}" stroke-width="4" stroke-linecap="round"/>`; }).join('');
    const l = linhas(d.titulo, 15, 2);
    const tam = Math.min(38, 270 / (Math.max(...l.map((x) => x.length)) * 0.62));
    return `<rect width="300" height="420" fill="${fundoClaro}"/><circle cx="150" cy="215" r="170" fill="${claro(d.cor, 0.3)}"/><rect width="300" height="${l.length > 1 ? 108 : 84}" fill="${d.cor}"/>${texto(l, 150, l.length > 1 ? 46 : 56, tam, `text-anchor="middle" font-weight="900" font-family="Impact,'Arial Black',sans-serif" fill="#fde047" stroke="${tinta}" stroke-width="6" paint-order="stroke" stroke-linejoin="round"`, 1.05)}${rostos}<g transform="translate(250 360)"><polygon points="${Array.from({ length: 16 }, (_, i) => { const a = (i / 16) * Math.PI * 2, rr = i % 2 ? 30 : 40; return `${(Math.cos(a) * rr).toFixed(1)},${(Math.sin(a) * rr).toFixed(1)}`; }).join(' ')}" fill="#ef4444" stroke="${tinta}" stroke-width="3"/><text y="5" font-size="14" font-weight="900" text-anchor="middle" font-family="Arial,sans-serif" fill="#fff">GIBI</text></g><rect x="3" y="3" width="294" height="414" fill="none" stroke="${tinta}" stroke-width="6"/>`;
  }

  if (d.tipo === 'livro') {
    const dourado = '#e8c872';
    const l = linhas(d.titulo, 15, 4);
    const pontas = Array.from({ length: 16 }, (_, i) => { const a = (i / 16) * Math.PI * 2, rr = i % 2 ? 14 : 30; return `${(150 + Math.cos(a) * rr).toFixed(1)},${(112 + Math.sin(a) * rr).toFixed(1)}`; }).join(' ');
    return `${fundo}<rect x="14" y="14" width="272" height="392" fill="none" stroke="${dourado}" stroke-width="2"/><rect x="22" y="22" width="256" height="376" fill="none" stroke="${dourado}" stroke-opacity=".5" stroke-width="1"/><circle cx="150" cy="112" r="48" fill="none" stroke="${dourado}" stroke-width="1.5"/><polygon points="${pontas}" fill="${dourado}"/>${texto(l, 150, 206, 27, `text-anchor="middle" font-family="Georgia,'Times New Roman',serif" font-weight="700" fill="#fff"`, 1.25)}<path d="M100 ${206 + l.length * 34} H200" stroke="${dourado}" stroke-width="1.5"/><text x="150" y="372" font-size="13" text-anchor="middle" font-family="Georgia,serif" fill="${dourado}" letter-spacing="3">${autor}</text>`;
  }

  const l = linhas(d.titulo, 14, 3);
  return `${fundo}<circle cx="90" cy="120" r="90" fill="${acento}" fill-opacity=".85"/><circle cx="190" cy="150" r="70" fill="#fff" fill-opacity=".25"/><rect x="150" y="60" width="110" height="110" fill="${tinta}" fill-opacity=".55" transform="rotate(18 205 115)"/>${texto(l, 24, 290, 30, `font-weight="800" font-family="Arial,sans-serif" fill="#fff"`)}<text x="24" y="398" font-size="12" font-family="Arial,sans-serif" fill="#fff" fill-opacity=".85" letter-spacing="2">${autor}</text>`;
}

function verso(d: DadosArte, p: string): string {
  const r = gerador(hash(d.titulo) ^ 0x9e37);
  let barras = '';
  for (let i = 0; i < 9; i++) barras += `<rect x="30" y="${150 + i * 20}" width="${(150 + r() * 100).toFixed(0)}" height="7" rx="3" fill="#d6d3d1"/>`;
  let cod = '';
  for (let i = 0; i < 34; i++) cod += `<rect x="${206 + i * 2.6}" y="352" width="${r() > 0.5 ? 1.6 : 1}" height="42" fill="#292524"/>`;
  const l = linhas(d.titulo, 18, 3);
  return `<rect width="300" height="420" fill="#faf7f2"/><rect width="14" height="420" fill="${d.cor}"/><defs><linearGradient id="${p}s" x1="0" x2="1"><stop offset="0" stop-color="#000" stop-opacity=".18"/><stop offset="1" stop-color="#000" stop-opacity="0"/></linearGradient></defs><rect x="14" width="26" height="420" fill="url(#${p}s)"/>${texto(l, 30, 58, 22, `font-family="Georgia,serif" font-weight="700" fill="${escuro(d.cor, 0.5)}"`, 1.2)}<path d="M30 ${70 + l.length * 26} h60" stroke="${d.cor}" stroke-width="3"/><text x="30" y="${112 + l.length * 8}" font-size="11" font-style="italic" font-family="Georgia,serif" fill="#78716c">“Uma história para ler de uma vez só.”</text>${barras}<rect x="196" y="340" width="86" height="62" fill="#fff"/>${cod}<text x="30" y="398" font-size="10" font-family="Arial,sans-serif" fill="#78716c">${esc(d.autor ?? '')} · Estante Viva</text>`;
}

/** Foto "de cenário": o exemplar sobre uma mesa, com objetos. Varia com a semente. */
function cenario(d: DadosArte, semente: number, paisagem: boolean): string {
  const r = gerador(hash(d.titulo) + semente * 7919);
  const w = paisagem ? 400 : 300, h = paisagem ? 300 : 420;
  const paletas = [['#f1e7da', '#c9a27a', '#8a5a36'], ['#dfe8f0', '#b9a58b', '#6b4a30'], ['#2b2f3a', '#7a5a3c', '#3d2a1b'], ['#f6e3e1', '#d8b894', '#9a6b45']];
  const [parede, mesa, sombra] = paletas[Math.floor(r() * paletas.length)]!;
  const escura = parede === '#2b2f3a';
  const horizonte = h * 0.58;
  const lw = paisagem ? 130 : 160, lh = lw * 1.4;
  const bx = paisagem ? 90 + r() * 60 : w / 2 - lw / 2, by = horizonte - lh + 40, ang = -12 + r() * 24;
  const caneca = paisagem ? `<g transform="translate(${w - 110} ${horizonte - 6})"><ellipse cx="22" cy="46" rx="30" ry="6" fill="#000" fill-opacity=".25"/><rect width="44" height="46" rx="6" fill="${r() > 0.5 ? '#ef4444' : '#38bdf8'}"/><path d="M44 10 q18 0 18 16 q0 14 -18 14" fill="none" stroke="#e5e7eb" stroke-width="5"/><path d="M12 -6 q-5 -10 0 -18 M26 -6 q-5 -10 0 -18" stroke="#fff" stroke-opacity=".6" stroke-width="3" fill="none" stroke-linecap="round"/></g>` : '';
  const planta = `<g transform="translate(${paisagem ? 24 : w - 60} ${horizonte - 70})"><rect x="6" y="52" width="38" height="34" rx="5" fill="#c2410c"/><ellipse cx="25" cy="44" rx="10" ry="26" fill="#16a34a" transform="rotate(-24 25 44)"/><ellipse cx="25" cy="42" rx="10" ry="28" fill="#22c55e"/><ellipse cx="25" cy="44" rx="10" ry="26" fill="#15803d" transform="rotate(26 25 44)"/></g>`;
  return `<defs><linearGradient id="c${semente}p" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="${parede}"/><stop offset="1" stop-color="${claro(parede, escura ? 0.12 : -0.1 + 0.1)}"/></linearGradient><filter id="c${semente}b"><feGaussianBlur stdDeviation="6"/></filter></defs><rect width="${w}" height="${h}" fill="url(#c${semente}p)"/><rect y="${horizonte}" width="${w}" height="${h - horizonte}" fill="${mesa}"/><rect y="${horizonte}" width="${w}" height="5" fill="${sombra}" fill-opacity=".5"/>${Array.from({ length: 5 }, (_, i) => `<path d="M0 ${horizonte + 14 + i * 22} H${w}" stroke="${sombra}" stroke-opacity=".18" stroke-width="2"/>`).join('')}${planta}<ellipse cx="${bx + lw / 2 + 12}" cy="${horizonte + 38}" rx="${lw * 0.55}" ry="14" fill="#000" fill-opacity=".35" filter="url(#c${semente}b)"/><g transform="rotate(${ang.toFixed(1)} ${bx + lw / 2} ${by + lh})"><svg x="${bx}" y="${by}" width="${lw}" height="${lh}" viewBox="0 0 300 420">${frente(d, `c${semente}`)}</svg><rect x="${bx}" y="${by}" width="${lw}" height="${lh}" fill="none" stroke="#000" stroke-opacity=".25"/></g>${caneca}`;
}

/** Marcação SVG completa da arte. `semente` muda o cenário (fotos de avaliações diferentes). */
export function arteSvg(d: DadosArte, vista: VistaArte = 'frente', semente = 0): string {
  const paisagem = vista === 'foto';
  const [w, h] = paisagem ? [400, 300] : [300, 420];
  const corpo = vista === 'frente' ? frente(d, 'f') : vista === 'verso' ? verso(d, 'v') : cenario(d, semente, paisagem);
  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${w} ${h}" width="${w}" height="${h}">${corpo}</svg>`;
}

export const arteDataUri = (d: DadosArte, vista: VistaArte = 'frente', semente = 0): string =>
  `data:image/svg+xml;utf8,${encodeURIComponent(arteSvg(d, vista, semente))}`;
