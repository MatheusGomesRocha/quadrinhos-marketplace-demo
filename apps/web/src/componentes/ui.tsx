import { useCallback, useEffect, useMemo, useRef, useState, type ImgHTMLAttributes, type InputHTMLAttributes, type ReactNode } from 'react';
import { ChevronLeft, ChevronRight, ImagePlus, Loader2, Star, X } from 'lucide-react';
import { arteDataUri, type Pagina, type VistaArte } from '@mkt/core';
import { COR_STATUS, ROTULO_STATUS } from '../api/formato';
import { MAX_FOTOS, reduzirImagem } from '../utils/imagem';

/* ───────────── carregamento de dados ───────────── */

/** Carrega dados de uma chamada à API; recarrega quando `deps` mudam e expõe `recarregar`. */
export function useCarregar<T>(fn: () => Promise<T>, deps: unknown[]) {
  const [dados, setDados] = useState<T | null>(null);
  const [erro, setErro] = useState<string | null>(null);
  const [carregando, setCarregando] = useState(true);
  const fnRef = useRef(fn);
  fnRef.current = fn;
  const recarregar = useCallback(() => {
    setCarregando(true);
    return fnRef.current().then((d) => { setDados(d); setErro(null); }).catch((e: Error) => setErro(e.message)).finally(() => setCarregando(false));
  }, []);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  useEffect(() => { void recarregar(); }, deps);
  return { dados, erro, carregando, recarregar, setDados };
}

export interface Infinita<T> {
  itens: T[]; total: number; carregando: boolean; inicial: boolean; fim: boolean; erro: string | null;
  carregar: () => Promise<void>; reiniciar: () => void;
}

/**
 * Lista com scroll infinito: busca a página 1 e, a cada vez que o fim da lista aparece na tela (<Sentinela />),
 * busca a próxima e ACRESCENTA ao que já está na tela. Mudou `deps` (filtro, busca)? Recomeça do zero.
 */
export function useInfinita<T>(buscar: (pagina: number) => Promise<Pagina<T>>, deps: unknown[]): Infinita<T> {
  const [itens, setItens] = useState<T[]>([]);
  const [total, setTotal] = useState(0);
  const [carregando, setCarregando] = useState(false);
  const [inicial, setInicial] = useState(true);
  const [fim, setFim] = useState(false);
  const [erro, setErro] = useState<string | null>(null);
  const proxima = useRef(1);
  const ocupado = useRef(false);
  const geracao = useRef(0);
  const buscarRef = useRef(buscar);
  buscarRef.current = buscar;

  const carregar = useCallback(async () => {
    if (ocupado.current) return;
    ocupado.current = true;
    setCarregando(true);
    const g = geracao.current;
    try {
      const p = await buscarRef.current(proxima.current);
      if (g !== geracao.current) return; // chegou uma resposta velha (o filtro mudou no meio): descarta
      setItens((a) => [...a, ...p.itens]);
      setTotal(p.total);
      setFim(p.itens.length === 0 || proxima.current >= Math.ceil(p.total / p.porPagina));
      proxima.current += 1;
      setErro(null);
    } catch (e) {
      if (g === geracao.current) setErro((e as Error).message);
    } finally {
      if (g === geracao.current) { ocupado.current = false; setCarregando(false); setInicial(false); }
    }
  }, []);

  const reiniciar = useCallback(() => {
    geracao.current += 1;
    ocupado.current = false;
    proxima.current = 1;
    setItens([]); setTotal(0); setFim(false); setErro(null); setInicial(true);
    void carregar();
  }, [carregar]);

  // eslint-disable-next-line react-hooks/exhaustive-deps
  useEffect(() => { reiniciar(); }, deps);
  return { itens, total, carregando, inicial, fim, erro, carregar, reiniciar };
}

/** Marcador no fim da lista: quando entra na tela, pede a próxima página. */
export function Sentinela<T>({ l, unidade = 'itens' }: { l: Infinita<T>; unidade?: string }) {
  const ref = useRef<HTMLDivElement>(null);
  useEffect(() => {
    const el = ref.current;
    if (!el || l.fim || l.erro || l.inicial) return;
    // Recriar o observador a cada página faz ele avisar de novo se o marcador ainda estiver visível (lista curta).
    const o = new IntersectionObserver((e) => { if (e[0]?.isIntersecting) void l.carregar(); }, { rootMargin: '500px' });
    o.observe(el);
    return () => o.disconnect();
  }, [l.itens.length, l.fim, l.erro, l.inicial, l.carregar]); // eslint-disable-line react-hooks/exhaustive-deps
  return (
    <div ref={ref} className="py-6 text-center text-sm text-stone-500">
      {l.erro ? (
        <p>{l.erro} <button className="font-semibold text-marca-600 underline" onClick={() => void l.carregar()}>Tentar de novo</button></p>
      ) : l.carregando && !l.inicial ? (
        <span className="inline-flex items-center gap-2"><Loader2 size={16} className="animate-spin" /> Carregando mais…</span>
      ) : l.fim && l.itens.length > 0 ? (
        <span>Você viu todos os {l.total} {unidade}.</span>
      ) : null}
    </div>
  );
}

/* ───────────── blocos básicos ───────────── */

export const Carregando = () => <div className="flex justify-center py-16 text-stone-400"><Loader2 className="animate-spin" /></div>;
export const Erro = ({ texto }: { texto: string | null }) => (texto ? <p className="rounded-xl bg-red-50 px-3.5 py-2.5 text-sm text-red-700 ring-1 ring-red-100" role="alert">{texto}</p> : null);
export const Vazio = ({ texto, icone, acao }: { texto: string; icone?: ReactNode; acao?: ReactNode }) => (
  <div className="flex flex-col items-center gap-3 py-14 text-center text-sm text-stone-500">{icone && <span className="rounded-full bg-stone-100 p-4 text-stone-400">{icone}</span>}<p className="max-w-sm">{texto}</p>{acao}</div>
);

export function Estado<T>({ r, children }: { r: { dados: T | null; erro: string | null; carregando: boolean }; children: (d: T) => ReactNode }) {
  if (r.erro) return <Erro texto={r.erro} />;
  if (!r.dados) return <Carregando />;
  return <>{children(r.dados)}</>;
}

/** Cobre a lista inicial com linhas "esqueleto" enquanto a 1ª página não chegou. */
export function EsqueletoLista({ linhas = 6 }: { linhas?: number }) {
  return <div className="space-y-3 p-2">{Array.from({ length: linhas }, (_, i) => <div key={i} className="esqueleto h-10" />)}</div>;
}

export const Selo = ({ status }: { status: string }) => (
  <span className={`inline-block whitespace-nowrap rounded-full px-2.5 py-0.5 text-xs font-semibold ${COR_STATUS[status] ?? 'bg-stone-100'}`}>{ROTULO_STATUS[status] ?? status}</span>
);

export const Titulo = ({ children, acao, sub }: { children: ReactNode; acao?: ReactNode; sub?: string }) => (
  <div className="mb-6 flex flex-wrap items-end justify-between gap-3">
    <div><h1 className="text-2xl font-extrabold text-stone-900 sm:text-3xl">{children}</h1>{sub && <p className="mt-1 text-sm text-stone-500">{sub}</p>}</div>{acao}
  </div>
);

export function Cartao({ titulo, children, className = '' }: { titulo?: string; children: ReactNode; className?: string }) {
  return <section className={`cartao ${className}`}>{titulo && <h2 className="mb-3 text-sm font-bold text-stone-700">{titulo}</h2>}{children}</section>;
}

export function Indicador({ rotulo, valor, detalhe, destaque, icone }: { rotulo: string; valor: string; detalhe?: string; destaque?: boolean; icone?: ReactNode }) {
  return (
    <div className={`rounded-2xl border p-5 shadow-cartao ${destaque ? 'border-transparent bg-tinta-900 text-white' : 'border-stone-200/80 bg-white'}`}>
      <div className="flex items-center justify-between"><p className={`text-xs font-semibold ${destaque ? 'text-stone-300' : 'text-stone-500'}`}>{rotulo}</p>{icone && <span className={destaque ? 'text-marca-200' : 'text-stone-400'}>{icone}</span>}</div>
      <p className="mt-2 font-display text-2xl font-extrabold">{valor}</p>
      {detalhe && <p className={`mt-0.5 text-xs ${destaque ? 'text-stone-400' : 'text-stone-500'}`}>{detalhe}</p>}
    </div>
  );
}

/* ───────────── arte do produto ───────────── */

interface DadosProduto { titulo: string; autor?: string; tipo: Parameters<typeof arteDataUri>[0]['tipo']; cor: string }
const cacheArte = new Map<string, string>();
export function uriArte(p: DadosProduto, vista: VistaArte = 'frente', semente = 0) {
  const k = `${p.titulo}|${p.autor}|${p.tipo}|${p.cor}|${vista}|${semente}`;
  let u = cacheArte.get(k);
  if (!u) { u = arteDataUri(p, vista, semente); cacheArte.set(k, u); }
  return u;
}

/** Foto (fictícia, gerada) do produto. `vista`: frente, verso ou cenario (o exemplar numa mesa). */
export function Arte({ p, vista = 'frente', semente = 0, className = '', ...resto }: { p: DadosProduto; vista?: VistaArte; semente?: number; className?: string } & Omit<ImgHTMLAttributes<HTMLImageElement>, 'src'>) {
  const src = useMemo(() => uriArte(p, vista, semente), [p.titulo, p.autor, p.tipo, p.cor, vista, semente]); // eslint-disable-line react-hooks/exhaustive-deps
  return <img src={src} alt={`${p.titulo}${vista === 'frente' ? '' : ` (${vista})`}`} loading="lazy" draggable={false} className={`select-none ${className}`} {...(resto as object)} />;
}

/* ───────────── estrelas ───────────── */

/** Estrelas somente leitura, com meia estrela. */
export function Estrelas({ valor, total, tamanho = 16 }: { valor: number; total?: number; tamanho?: number }) {
  return (
    <span className="inline-flex items-center gap-1.5" title={`${valor.toFixed(1)} de 5`}>
      <span className="inline-flex">
        {[1, 2, 3, 4, 5].map((i) => {
          const cheia = valor >= i ? 100 : valor >= i - 0.5 ? 50 : 0;
          return (
            <span key={i} className="relative inline-block" style={{ width: tamanho, height: tamanho }}>
              <Star size={tamanho} className="absolute text-stone-300" />
              <span className="absolute inset-0 overflow-hidden" style={{ width: `${cheia}%` }}><Star size={tamanho} className="fill-amber-400 text-amber-400" /></span>
            </span>
          );
        })}
      </span>
      {total !== undefined && <span className="text-xs text-stone-500">{total > 0 ? `${valor.toFixed(1)} (${total})` : 'sem avaliações'}</span>}
    </span>
  );
}

/** Seletor de nota de 1 a 5, de meia em meia estrela (metade esquerda = x,5; metade direita = inteiro). */
export function SeletorNota({ valor, onChange }: { valor: number; onChange: (n: number) => void }) {
  const [sobre, setSobre] = useState<number | null>(null);
  const atual = sobre ?? valor;
  return (
    <div className="flex items-center gap-2">
      <div className="inline-flex" onMouseLeave={() => setSobre(null)} role="radiogroup" aria-label="Nota">
        {[1, 2, 3, 4, 5].map((i) => (
          <span key={i} className="relative inline-block h-8 w-8">
            <Star size={32} className="absolute text-stone-300" />
            <span className="pointer-events-none absolute inset-0 overflow-hidden" style={{ width: atual >= i ? '100%' : atual >= i - 0.5 ? '50%' : '0%' }}><Star size={32} className="fill-amber-400 text-amber-400" /></span>
            <button type="button" aria-label={`${i - 0.5} estrelas`} className="absolute inset-y-0 left-0 w-1/2" onMouseEnter={() => setSobre(i - 0.5)} onClick={() => onChange(i - 0.5)} />
            <button type="button" aria-label={`${i} estrelas`} className="absolute inset-y-0 right-0 w-1/2" onMouseEnter={() => setSobre(i)} onClick={() => onChange(i)} />
          </span>
        ))}
      </div>
      <span className="w-8 text-sm font-semibold text-stone-600">{valor ? valor.toFixed(1) : '—'}</span>
    </div>
  );
}

/* ───────────── modais, fotos e formulários ───────────── */

export function Modal({ titulo, onFechar, children }: { titulo: string; onFechar: () => void; children: ReactNode }) {
  useEffect(() => { const f = (e: KeyboardEvent) => e.key === 'Escape' && onFechar(); window.addEventListener('keydown', f); return () => window.removeEventListener('keydown', f); }, [onFechar]);
  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center bg-tinta-900/50 p-0 backdrop-blur-sm sm:items-center sm:p-4" onClick={onFechar}>
      <div className="max-h-[92vh] w-full max-w-lg animate-subir overflow-auto rounded-t-3xl bg-white p-6 shadow-2xl sm:rounded-3xl" onClick={(e) => e.stopPropagation()} role="dialog" aria-label={titulo}>
        <div className="mb-4 flex items-center justify-between"><h2 className="text-lg font-extrabold">{titulo}</h2><button onClick={onFechar} aria-label="Fechar" className="rounded-full p-1.5 hover:bg-stone-100"><X size={20} /></button></div>
        {children}
      </div>
    </div>
  );
}

/** Visualizador de fotos em tela cheia, com setas e teclado. */
export function Lightbox({ fotos, inicio, onFechar, legenda }: { fotos: string[]; inicio: number; onFechar: () => void; legenda?: (i: number) => ReactNode }) {
  const [i, setI] = useState(inicio);
  const ir = useCallback((d: number) => setI((x) => (x + d + fotos.length) % fotos.length), [fotos.length]);
  useEffect(() => {
    const f = (e: KeyboardEvent) => { if (e.key === 'Escape') onFechar(); if (e.key === 'ArrowRight') ir(1); if (e.key === 'ArrowLeft') ir(-1); };
    window.addEventListener('keydown', f);
    return () => window.removeEventListener('keydown', f);
  }, [ir, onFechar]);
  return (
    <div className="fixed inset-0 z-[60] flex flex-col items-center justify-center bg-black/90 p-4" onClick={onFechar} role="dialog" aria-label="Foto ampliada">
      <button className="absolute right-4 top-4 rounded-full bg-white/10 p-2 text-white hover:bg-white/20" onClick={onFechar} aria-label="Fechar"><X /></button>
      <img src={fotos[i]} alt="" className="max-h-[78vh] max-w-full rounded-lg object-contain" onClick={(e) => e.stopPropagation()} />
      {legenda && <div className="mt-3 text-sm text-white/90" onClick={(e) => e.stopPropagation()}>{legenda(i)}</div>}
      {fotos.length > 1 && (<>
        <button className="absolute left-3 top-1/2 -translate-y-1/2 rounded-full bg-white/10 p-3 text-white hover:bg-white/20" onClick={(e) => { e.stopPropagation(); ir(-1); }} aria-label="Anterior"><ChevronLeft /></button>
        <button className="absolute right-3 top-1/2 -translate-y-1/2 rounded-full bg-white/10 p-3 text-white hover:bg-white/20" onClick={(e) => { e.stopPropagation(); ir(1); }} aria-label="Próxima"><ChevronRight /></button>
        <p className="absolute bottom-4 text-xs text-white/70">{i + 1} / {fotos.length}</p>
      </>)}
    </div>
  );
}

/** Seleção de até 3 fotos: reduz no navegador e mostra as miniaturas com botão de remover. */
export function UploadFotos({ fotos, onChange }: { fotos: string[]; onChange: (f: string[]) => void }) {
  const [erro, setErro] = useState<string | null>(null);
  const [lendo, setLendo] = useState(false);
  async function escolher(files: FileList | null) {
    if (!files?.length) return;
    setErro(null); setLendo(true);
    try {
      const novas: string[] = [];
      for (const f of Array.from(files).slice(0, MAX_FOTOS - fotos.length)) novas.push(await reduzirImagem(f));
      onChange([...fotos, ...novas]);
    } catch (e) { setErro((e as Error).message); } finally { setLendo(false); }
  }
  return (
    <div>
      <div className="flex flex-wrap gap-2">
        {fotos.map((f, i) => (
          <div key={i} className="relative h-20 w-20 overflow-hidden rounded-xl ring-1 ring-stone-200">
            <img src={f} alt={`Foto ${i + 1}`} className="h-full w-full object-cover" />
            <button type="button" aria-label="Remover foto" className="absolute right-1 top-1 rounded-full bg-black/60 p-0.5 text-white" onClick={() => onChange(fotos.filter((_, k) => k !== i))}><X size={14} /></button>
          </div>
        ))}
        {fotos.length < MAX_FOTOS && (
          <label className="flex h-20 w-20 cursor-pointer flex-col items-center justify-center gap-1 rounded-xl border-2 border-dashed border-stone-300 text-xs font-semibold text-stone-500 hover:border-marca-500 hover:text-marca-600">
            {lendo ? <Loader2 size={18} className="animate-spin" /> : <ImagePlus size={20} />}Foto
            <input type="file" accept="image/jpeg,image/png,image/webp" multiple className="hidden" onChange={(e) => { void escolher(e.target.files); e.target.value = ''; }} />
          </label>
        )}
      </div>
      <p className="mt-1.5 text-xs text-stone-400">Até {MAX_FOTOS} fotos (JPG, PNG ou WEBP). Elas são reduzidas automaticamente.</p>
      <Erro texto={erro} />
    </div>
  );
}

export function Tabela({ colunas, children, vazio, carregando }: { colunas: string[]; children: ReactNode; vazio?: string; carregando?: boolean }) {
  const linhas = Array.isArray(children) ? children.length : children ? 1 : 0;
  return (
    <div className="overflow-x-auto">
      <table className="w-full">
        <thead className="border-b border-stone-200"><tr>{colunas.map((c) => <th key={c} className="th">{c}</th>)}</tr></thead>
        <tbody className="divide-y divide-stone-100 [&>tr:hover]:bg-stone-50/70">{children}</tbody>
      </table>
      {carregando && linhas === 0 && <EsqueletoLista />}
      {!carregando && vazio && linhas === 0 && <Vazio texto={vazio} />}
    </div>
  );
}

export function Campo({ rotulo, children, dica }: { rotulo: string; children: ReactNode; dica?: ReactNode }) {
  return <label className="block"><span className="rotulo">{rotulo}</span>{children}{dica && <span className="mt-1 block text-xs text-stone-500">{dica}</span>}</label>;
}

/** Campo de texto que formata enquanto digita (telefone, CEP, CPF/CNPJ, moeda). */
export function InputMascara({ mascara, value, onChange, className = 'campo', ...resto }: { mascara: (v: string) => string; value: string; onChange: (v: string) => void; className?: string } & Omit<InputHTMLAttributes<HTMLInputElement>, 'value' | 'onChange'>) {
  return <input {...resto} className={className} inputMode={resto.inputMode ?? 'numeric'} value={value} onChange={(e) => onChange(mascara(e.target.value))} />;
}
