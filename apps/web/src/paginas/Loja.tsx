import { useEffect, useState } from 'react';
import { PackageSearch, ShieldCheck, SlidersHorizontal, Truck, Star } from 'lucide-react';
import { Link, useSearchParams } from 'react-router-dom';
import { TIPOS_PRODUTO, type ProdutoVitrine } from '@mkt/core';
import { brl, ROTULO_TIPO } from '../api/formato';
import { reaisParaCentavos } from '../api/formato';
import { Arte, Estrelas, InputMascara, Sentinela, useInfinita, Vazio } from '../componentes/ui';
import { useApi } from '../sessao';
import { mascaraMoeda } from '../utils/mascaras';

const CAPAS_HERO = [
  { titulo: 'Cometa Rubro', autor: 'M. Aoki', tipo: 'manga', cor: '#e11d48' },
  { titulo: 'A Casa dos Ventos Antigos', autor: 'Helena Prado', tipo: 'livro', cor: '#0f766e' },
  { titulo: 'Guardiões do Crepúsculo', autor: 'R. Lima', tipo: 'hq', cor: '#4f46e5' },
] as const;

function Hero() {
  return (
    <section className="relative mb-8 overflow-hidden rounded-3xl bg-tinta-900 text-white">
      <div className="absolute -right-24 -top-24 h-96 w-96 rounded-full bg-marca-500/30 blur-3xl" />
      <div className="absolute -bottom-32 left-1/3 h-80 w-80 rounded-full bg-violet-500/20 blur-3xl" />
      <div className="relative grid items-center gap-6 p-8 sm:p-12 md:grid-cols-[1.2fr_1fr]">
        <div>
          <p className="mb-3 inline-flex items-center gap-2 rounded-full bg-white/10 px-3 py-1 text-xs font-semibold text-marca-200"><Star size={13} className="fill-marca-200" /> Lojas independentes, de verdade</p>
          <h1 className="text-4xl font-extrabold leading-[1.05] sm:text-5xl">Histórias que merecem <span className="text-marca-500">uma segunda leitura.</span></h1>
          <p className="mt-4 max-w-md text-stone-300">HQs, mangás, gibis e livros novos e usados, de sebos e lojas de todo o país, com avaliações e fotos de quem já comprou.</p>
          <div className="mt-6 flex flex-wrap gap-3"><a href="#vitrine" className="btn-primario !rounded-full !px-6">Explorar o catálogo</a><Link to="/vender" className="btn !rounded-full border border-white/20 !px-6 text-white hover:bg-white/10">Quero vender</Link></div>
        </div>
        <div className="relative mx-auto hidden h-64 w-72 md:block" aria-hidden>
          {CAPAS_HERO.map((c, i) => (
            <Arte key={c.titulo} p={c as never} loading="eager" className="absolute h-60 rounded-lg shadow-2xl ring-1 ring-white/10" style={{ left: i * 62, top: i === 1 ? 0 : 14, transform: `rotate(${(i - 1) * 7}deg)`, zIndex: i === 1 ? 2 : 1 } as never} />
          ))}
        </div>
      </div>
    </section>
  );
}

const Beneficios = () => (
  <div className="mb-8 grid gap-3 sm:grid-cols-3">
    {[[Truck, 'Frete grátis', 'Acima de R$ 150 por loja'], [ShieldCheck, 'Compra protegida', 'Reclame se o prazo de entrega vencer'], [Star, 'Avaliações reais', 'Notas e fotos de quem comprou']].map(([Icone, t, d]) => {
      const I = Icone as typeof Truck;
      return <div key={t as string} className="flex items-center gap-3 rounded-2xl border border-stone-200/80 bg-white px-4 py-3.5"><span className="rounded-xl bg-marca-50 p-2.5 text-marca-600"><I size={20} /></span><div><p className="text-sm font-bold">{t as string}</p><p className="text-xs text-stone-500">{d as string}</p></div></div>;
    })}
  </div>
);

export function CartaoProduto({ i }: { i: ProdutoVitrine }) {
  return (
    <Link to={`/produto/${i.id}`} className="group flex flex-col rounded-2xl border border-stone-200/80 bg-white p-3 transition duration-200 hover:-translate-y-1 hover:shadow-suave">
      <div className="relative overflow-hidden rounded-xl bg-stone-100">
        <Arte p={i} className="aspect-[5/7] w-full object-cover transition duration-300 group-hover:scale-[1.04]" />
        <span className={`absolute left-2 top-2 rounded-full px-2.5 py-0.5 text-[11px] font-bold ${i.estado === 'novo' ? 'bg-white/95 text-emerald-700' : 'bg-white/95 text-amber-700'}`}>{i.estado === 'novo' ? 'Novo' : 'Usado'}</span>
        {i.estoque <= 3 && <span className="absolute bottom-2 left-2 rounded-full bg-tinta-900/90 px-2.5 py-0.5 text-[11px] font-semibold text-white">Restam {i.estoque}</span>}
      </div>
      <div className="mt-3 flex flex-1 flex-col px-1">
        <p className="text-[11px] font-bold uppercase tracking-wide text-marca-600">{ROTULO_TIPO[i.tipo]}</p>
        <p className="line-clamp-2 min-h-[2.5rem] text-sm font-bold leading-snug text-stone-900">{i.titulo}</p>
        <p className="truncate text-xs text-stone-500">{i.autor}</p>
        <div className="mt-1.5"><Estrelas valor={i.nota.media} total={i.nota.total} tamanho={13} /></div>
        <div className="mt-auto pt-2.5"><p className="font-display text-xl font-extrabold text-stone-900">{brl(i.precoCentavos)}</p><p className="truncate text-xs text-stone-500">por {i.vendedor.nomeLoja}</p></div>
      </div>
    </Link>
  );
}

const Esqueleto = () => <div className="rounded-2xl border border-stone-200/80 bg-white p-3"><div className="esqueleto aspect-[5/7] w-full" /><div className="esqueleto mt-3 h-4 w-3/4" /><div className="esqueleto mt-2 h-3 w-1/2" /><div className="esqueleto mt-4 h-6 w-1/3" /></div>;

export function Loja() {
  const api = useApi();
  const [params, setParams] = useSearchParams();
  const q = params.get('q') ?? '';
  const tipo = params.get('tipo') ?? '';
  const estado = params.get('estado') ?? '';
  const ordem = (params.get('ordem') ?? 'recentes') as 'recentes' | 'menor_preco' | 'maior_preco' | 'mais_vendidos';
  const min = params.get('min') ?? '';
  const max = params.get('max') ?? '';
  const [minTxt, setMinTxt] = useState(min);
  const [maxTxt, setMaxTxt] = useState(max);
  const [filtrosAbertos, setFiltrosAbertos] = useState(false);
  useEffect(() => { setMinTxt(min); setMaxTxt(max); }, [min, max]);

  const mudar = (novo: Record<string, string>) => {
    const p = new URLSearchParams(params);
    for (const [k, v] of Object.entries(novo)) v ? p.set(k, v) : p.delete(k);
    setParams(p, { replace: true });
  };
  const l = useInfinita(
    (pagina) => api.catalogo.listar({ q: q || undefined, tipo: (tipo || undefined) as never, estado: (estado || undefined) as never, ordem, precoMinCentavos: min ? reaisParaCentavos(min) : undefined, precoMaxCentavos: max ? reaisParaCentavos(max) : undefined, pagina, porPagina: 12 }),
    [q, tipo, estado, ordem, min, max],
  );
  const filtrado = !!(q || tipo || estado || min || max);

  return (
    <div>
      {!filtrado && <><Hero /><Beneficios /></>}
      <div id="vitrine" className="grid scroll-mt-40 gap-8 lg:grid-cols-[230px_1fr]">
        <aside className="lg:sticky lg:top-36 lg:self-start">
          <button className="btn-sec mb-3 w-full lg:hidden" onClick={() => setFiltrosAbertos((x) => !x)}><SlidersHorizontal size={16} /> Filtros</button>
          <div className={`${filtrosAbertos ? 'block' : 'hidden'} space-y-6 rounded-2xl border border-stone-200/80 bg-white p-5 lg:block`}>
            <div>
              <p className="rotulo">Tipo</p>
              <div className="flex flex-wrap gap-1.5">
                {[['', 'Todos'], ...TIPOS_PRODUTO.map((t) => [t, ROTULO_TIPO[t]!])].map(([t, rot]) => <button key={t} onClick={() => mudar({ tipo: t! })} className={`chip !px-3 !py-1 text-xs ${tipo === t ? 'chip-ativo' : ''}`}>{rot}</button>)}
              </div>
            </div>
            <div>
              <p className="rotulo">Estado</p>
              <div className="flex gap-1.5">{[['', 'Todos'], ['novo', 'Novo'], ['usado', 'Usado']].map(([v, rot]) => <button key={v} onClick={() => mudar({ estado: v! })} className={`chip !px-3 !py-1 text-xs ${estado === v ? 'chip-ativo' : ''}`}>{rot}</button>)}</div>
            </div>
            <form onSubmit={(e) => { e.preventDefault(); mudar({ min: minTxt, max: maxTxt }); }}>
              <p className="rotulo">Preço (R$)</p>
              <div className="flex items-center gap-2">
                <InputMascara mascara={mascaraMoeda} value={minTxt} onChange={setMinTxt} placeholder="Mín." aria-label="Preço mínimo" className="campo !px-3" />
                <span className="text-stone-400">–</span>
                <InputMascara mascara={mascaraMoeda} value={maxTxt} onChange={setMaxTxt} placeholder="Máx." aria-label="Preço máximo" className="campo !px-3" />
              </div>
              <button className="btn-sec mt-2 w-full !py-1.5 text-xs">Aplicar preço</button>
            </form>
            {filtrado && <button className="w-full text-sm font-semibold text-marca-600 underline" onClick={() => setParams({}, { replace: true })}>Limpar filtros</button>}
          </div>
        </aside>

        <section>
          <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
            <div>
              <h2 className="text-xl font-extrabold">{q ? <>Resultados para “{q}”</> : tipo ? ROTULO_TIPO[tipo] : 'Em destaque'}</h2>
              <p className="text-sm text-stone-500">{l.inicial ? 'Buscando…' : `${l.total} ${l.total === 1 ? 'produto' : 'produtos'}`}</p>
            </div>
            <select className="campo !w-auto !rounded-full !py-2" value={ordem} onChange={(e) => mudar({ ordem: e.target.value === 'recentes' ? '' : e.target.value })} aria-label="Ordenar por">
              <option value="recentes">Mais recentes</option><option value="mais_vendidos">Mais vendidos</option><option value="menor_preco">Menor preço</option><option value="maior_preco">Maior preço</option>
            </select>
          </div>
          {l.erro && l.itens.length === 0 ? <p className="rounded-xl bg-red-50 p-4 text-sm text-red-700">{l.erro}</p>
            : l.inicial ? <div className="grid grid-cols-2 gap-4 md:grid-cols-3 xl:grid-cols-4">{Array.from({ length: 8 }, (_, i) => <Esqueleto key={i} />)}</div>
            : l.itens.length === 0 ? <Vazio icone={<PackageSearch size={28} />} texto="Nenhum produto encontrado com esses filtros." acao={<button className="btn-sec" onClick={() => setParams({}, { replace: true })}>Limpar filtros</button>} />
            : (
              <>
                <div className="grid grid-cols-2 gap-4 md:grid-cols-3 xl:grid-cols-4">{l.itens.map((i) => <CartaoProduto key={i.id} i={i} />)}</div>
                <Sentinela l={l} unidade="produtos" />
              </>
            )}
        </section>
      </div>
    </div>
  );
}
