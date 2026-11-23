import { useState } from 'react';
import { Link } from 'react-router-dom';
import { brl, ROTULO_TIPO } from '../../api/formato';
import { Arte, Selo, Sentinela, Tabela, Titulo, useInfinita } from '../../componentes/ui';
import { useSessao } from '../../sessao';

const ABAS = [['aVenda', 'À venda'], ['vendidos', 'Já vendidos'], ['todos', 'Todos']] as const;

export function ProdutosVendedor() {
  const { api } = useSessao();
  const [situacao, setSituacao] = useState<'aVenda' | 'vendidos' | 'todos'>('aVenda');
  const [q, setQ] = useState('');
  const l = useInfinita((pagina) => api.produtos.meus({ situacao, q: q || undefined, pagina, porPagina: 12 }), [situacao, q]);
  return (
    <div className="animate-subir">
      <Titulo sub={l.inicial ? undefined : `${l.total} ${l.total === 1 ? 'produto' : 'produtos'} nesta lista`} acao={<Link to="/vendedor/produtos/novo" className="btn-primario">Novo produto</Link>}>Meus produtos</Titulo>
      <div className="mb-4 flex flex-wrap items-center gap-3">
        <div className="inline-flex rounded-full border border-stone-200 bg-white p-1">{ABAS.map(([v, rot]) => <button key={v} onClick={() => setSituacao(v)} className={`rounded-full px-4 py-1.5 text-sm font-semibold transition ${situacao === v ? 'bg-tinta-900 text-white' : 'text-stone-600 hover:text-stone-900'}`}>{rot}</button>)}</div>
        <input className="campo !w-64 !rounded-full" placeholder="Buscar pelo título" value={q} onChange={(e) => setQ(e.target.value)} />
      </div>
      <div className="cartao !p-2">
        <Tabela carregando={l.inicial} colunas={['Produto', 'Tipo', 'Preço', 'Estoque', 'Vendidos', 'Receita', 'Situação', '']} vazio="Nenhum produto nesta lista.">
          {l.itens.map((x) => (
            <tr key={x.id}>
              <td className="td"><div className="flex items-center gap-3"><Arte p={x} className="aspect-[5/7] w-9 rounded object-cover" /><span className="font-bold">{x.titulo}</span></div></td><td className="td">{ROTULO_TIPO[x.tipo]}</td><td className="td">{brl(x.precoCentavos)}</td>
              <td className={`td ${x.estoque <= 3 ? 'font-bold text-red-600' : ''}`}>{x.estoque}</td><td className="td">{x.vendidos}</td><td className="td">{brl(x.receitaCentavos)}</td>
              <td className="td"><Selo status={x.status} /></td>
              <td className="td"><Link className="font-semibold text-marca-600" to={`/vendedor/produtos/${x.id}`}>Editar</Link></td>
            </tr>
          ))}
        </Tabela>
        <Sentinela l={l} unidade="produtos" />
      </div>
    </div>
  );
}
