import { useState } from 'react';
import { Search } from 'lucide-react';
import { Link } from 'react-router-dom';
import { TIPOS_PRODUTO } from '@mkt/core';
import { brl, ROTULO_TIPO } from '../api/formato';
import { Capa, Estado, Estrelas, Paginacao, Titulo, useCarregar, Vazio } from '../componentes/ui';
import { useApi } from '../sessao';

export function Loja() {
  const api = useApi();
  const [q, setQ] = useState('');
  const [busca, setBusca] = useState('');
  const [tipo, setTipo] = useState('');
  const [estado, setEstado] = useState('');
  const [ordem, setOrdem] = useState<'recentes' | 'menor_preco' | 'maior_preco' | 'mais_vendidos'>('recentes');
  const [pagina, setPagina] = useState(1);
  const r = useCarregar(
    () => api.catalogo.listar({ q: busca || undefined, tipo: (tipo || undefined) as never, estado: (estado || undefined) as never, ordem, pagina, porPagina: 12 }),
    [busca, tipo, estado, ordem, pagina],
  );
  const filtrar = (fn: () => void) => { fn(); setPagina(1); };

  return (
    <div>
      <Titulo>Quadrinhos, mangás e livros</Titulo>
      <form className="cartao mb-5 grid gap-3 sm:grid-cols-[1fr_auto_auto_auto_auto]" onSubmit={(e) => { e.preventDefault(); filtrar(() => setBusca(q)); }}>
        <div className="relative"><Search size={16} className="absolute left-3 top-3 text-stone-400" /><input className="campo pl-9" placeholder="Buscar por título, autor ou editora" value={q} onChange={(e) => setQ(e.target.value)} /></div>
        <select className="campo" value={tipo} onChange={(e) => filtrar(() => setTipo(e.target.value))} aria-label="Tipo"><option value="">Todos os tipos</option>{TIPOS_PRODUTO.map((t) => <option key={t} value={t}>{ROTULO_TIPO[t]}</option>)}</select>
        <select className="campo" value={estado} onChange={(e) => filtrar(() => setEstado(e.target.value))} aria-label="Estado"><option value="">Novo ou usado</option><option value="novo">Novo</option><option value="usado">Usado</option></select>
        <select className="campo" value={ordem} onChange={(e) => filtrar(() => setOrdem(e.target.value as typeof ordem))} aria-label="Ordenar"><option value="recentes">Mais recentes</option><option value="mais_vendidos">Mais vendidos</option><option value="menor_preco">Menor preço</option><option value="maior_preco">Maior preço</option></select>
        <button className="btn-primario">Buscar</button>
      </form>
      <Estado r={r}>
        {(p) => p.itens.length === 0 ? <Vazio texto="Nenhum produto encontrado com esses filtros." /> : (
          <>
            <div className="grid grid-cols-2 gap-4 md:grid-cols-3 lg:grid-cols-4">
              {p.itens.map((i) => (
                <Link key={i.id} to={`/produto/${i.id}`} className="cartao group !p-3 transition hover:shadow-md">
                  <Capa titulo={i.titulo} cor={i.cor} className="h-44" />
                  <p className="mt-3 line-clamp-2 min-h-[2.5rem] text-sm font-semibold group-hover:text-marca-700">{i.titulo}</p>
                  <p className="text-xs text-stone-500">{i.autor} · {ROTULO_TIPO[i.tipo]} · {i.estado}</p>
                  <div className="mt-1"><Estrelas valor={i.nota.media} total={i.nota.total} tamanho={13} /></div>
                  <p className="mt-2 text-lg font-bold">{brl(i.precoCentavos)}</p>
                  <p className="text-xs text-stone-500">{i.vendedor.nomeLoja}{i.estoque <= 3 ? ` · restam ${i.estoque}` : ''}</p>
                </Link>
              ))}
            </div>
            <Paginacao p={p} onPagina={setPagina} />
          </>
        )}
      </Estado>
    </div>
  );
}
