import { useCallback, useEffect, useRef, useState, type ReactNode } from 'react';
import { Star, X } from 'lucide-react';
import type { Pagina } from '@mkt/core';
import { COR_STATUS, ROTULO_STATUS } from '../api/formato';

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

export const Carregando = () => <p className="py-10 text-center text-sm text-stone-500">Carregando…</p>;
export const Erro = ({ texto }: { texto: string | null }) => (texto ? <p className="rounded-lg bg-red-50 px-3 py-2 text-sm text-red-700" role="alert">{texto}</p> : null);
export const Vazio = ({ texto }: { texto: string }) => <p className="py-10 text-center text-sm text-stone-500">{texto}</p>;

export function Estado<T>({ r, children }: { r: { dados: T | null; erro: string | null; carregando: boolean }; children: (d: T) => ReactNode }) {
  if (r.erro) return <Erro texto={r.erro} />;
  if (!r.dados) return <Carregando />;
  return <>{children(r.dados)}</>;
}

export const Selo = ({ status }: { status: string }) => (
  <span className={`inline-block rounded-full px-2.5 py-0.5 text-xs font-semibold ${COR_STATUS[status] ?? 'bg-stone-100'}`}>{ROTULO_STATUS[status] ?? status}</span>
);

export const Titulo = ({ children, acao }: { children: ReactNode; acao?: ReactNode }) => (
  <div className="mb-5 flex flex-wrap items-center justify-between gap-3"><h1 className="text-2xl font-bold text-stone-900">{children}</h1>{acao}</div>
);

export function Cartao({ titulo, children, className = '' }: { titulo?: string; children: ReactNode; className?: string }) {
  return <section className={`cartao ${className}`}>{titulo && <h2 className="mb-3 text-sm font-semibold text-stone-600">{titulo}</h2>}{children}</section>;
}

export function Indicador({ rotulo, valor, detalhe, destaque }: { rotulo: string; valor: string; detalhe?: string; destaque?: boolean }) {
  return (
    <div className={`cartao ${destaque ? 'border-marca-500 bg-marca-50' : ''}`}>
      <p className="text-xs font-semibold uppercase tracking-wide text-stone-500">{rotulo}</p>
      <p className="mt-1 text-2xl font-bold text-stone-900">{valor}</p>
      {detalhe && <p className="mt-0.5 text-xs text-stone-500">{detalhe}</p>}
    </div>
  );
}

/** Capa gerada: cor própria do produto + título (sem imagens de terceiros). */
export function Capa({ titulo, cor, className = 'h-48' }: { titulo: string; cor: string; className?: string }) {
  return (
    <div className={`flex items-end rounded-lg p-3 text-white shadow-inner ${className}`} style={{ background: `linear-gradient(145deg, ${cor}, #1c1917)` }} aria-hidden>
      <span className="line-clamp-3 text-sm font-bold leading-tight drop-shadow">{titulo}</span>
    </div>
  );
}

/** Estrelas somente leitura, com meia estrela. */
export function Estrelas({ valor, total, tamanho = 16 }: { valor: number; total?: number; tamanho?: number }) {
  return (
    <span className="inline-flex items-center gap-1" title={`${valor.toFixed(1)} de 5`}>
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
          <span key={i} className="relative inline-block h-7 w-7">
            <Star size={28} className="absolute text-stone-300" />
            <span className="pointer-events-none absolute inset-0 overflow-hidden" style={{ width: atual >= i ? '100%' : atual >= i - 0.5 ? '50%' : '0%' }}><Star size={28} className="fill-amber-400 text-amber-400" /></span>
            <button type="button" aria-label={`${i - 0.5} estrelas`} className="absolute inset-y-0 left-0 w-1/2" onMouseEnter={() => setSobre(i - 0.5)} onClick={() => onChange(i - 0.5)} />
            <button type="button" aria-label={`${i} estrelas`} className="absolute inset-y-0 right-0 w-1/2" onMouseEnter={() => setSobre(i)} onClick={() => onChange(i)} />
          </span>
        ))}
      </div>
      <span className="w-8 text-sm font-semibold text-stone-600">{valor ? valor.toFixed(1) : '—'}</span>
    </div>
  );
}

export function Modal({ titulo, onFechar, children }: { titulo: string; onFechar: () => void; children: ReactNode }) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4" onClick={onFechar}>
      <div className="max-h-[90vh] w-full max-w-lg overflow-auto rounded-xl bg-white p-6 shadow-xl" onClick={(e) => e.stopPropagation()} role="dialog" aria-label={titulo}>
        <div className="mb-4 flex items-center justify-between"><h2 className="text-lg font-bold">{titulo}</h2><button onClick={onFechar} aria-label="Fechar"><X size={20} /></button></div>
        {children}
      </div>
    </div>
  );
}

export function Paginacao({ p, onPagina }: { p: Pagina<unknown>; onPagina: (n: number) => void }) {
  const paginas = Math.max(1, Math.ceil(p.total / p.porPagina));
  if (paginas <= 1) return <p className="mt-3 text-xs text-stone-500">{p.total} {p.total === 1 ? 'registro' : 'registros'}</p>;
  return (
    <div className="mt-3 flex items-center justify-between text-sm">
      <span className="text-xs text-stone-500">{p.total} registros</span>
      <div className="flex items-center gap-2">
        <button className="btn-sec !px-3 !py-1" disabled={p.pagina <= 1} onClick={() => onPagina(p.pagina - 1)}>Anterior</button>
        <span>{p.pagina} / {paginas}</span>
        <button className="btn-sec !px-3 !py-1" disabled={p.pagina >= paginas} onClick={() => onPagina(p.pagina + 1)}>Próxima</button>
      </div>
    </div>
  );
}

export function Tabela({ colunas, children, vazio }: { colunas: string[]; children: ReactNode; vazio?: string }) {
  const linhas = Array.isArray(children) ? children.length : 1;
  return (
    <div className="overflow-x-auto">
      <table className="w-full">
        <thead className="border-b border-stone-200"><tr>{colunas.map((c) => <th key={c} className="th">{c}</th>)}</tr></thead>
        <tbody className="divide-y divide-stone-100">{children}</tbody>
      </table>
      {vazio && linhas === 0 && <Vazio texto={vazio} />}
    </div>
  );
}

export function Campo({ rotulo, children }: { rotulo: string; children: ReactNode }) {
  return <label className="block"><span className="rotulo">{rotulo}</span>{children}</label>;
}
