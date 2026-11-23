import { useState } from 'react';
import { Link } from 'react-router-dom';
import { brl, ROTULO_TIPO } from '../../api/formato';
import { Estado, Paginacao, Selo, Tabela, Titulo, useCarregar } from '../../componentes/ui';
import { useSessao } from '../../sessao';

const ABAS = [['aVenda', 'À venda'], ['vendidos', 'Já vendidos'], ['todos', 'Todos']] as const;

export function ProdutosVendedor() {
  const { api } = useSessao();
  const [situacao, setSituacao] = useState<'aVenda' | 'vendidos' | 'todos'>('aVenda');
  const [q, setQ] = useState('');
  const [pagina, setPagina] = useState(1);
  const r = useCarregar(() => api.produtos.meus({ situacao, q: q || undefined, pagina }), [situacao, q, pagina]);
  return (
    <div>
      <Titulo acao={<Link to="/vendedor/produtos/novo" className="btn-primario">Novo produto</Link>}>Meus produtos</Titulo>
      <div className="mb-4 flex flex-wrap items-center gap-3">
        <div className="inline-flex rounded-lg border border-stone-300 bg-white p-1">{ABAS.map(([v, rot]) => <button key={v} onClick={() => { setSituacao(v); setPagina(1); }} className={`rounded-md px-3 py-1 text-sm font-semibold ${situacao === v ? 'bg-marca-600 text-white' : 'text-stone-600'}`}>{rot}</button>)}</div>
        <input className="campo !w-64" placeholder="Buscar pelo título" value={q} onChange={(e) => { setQ(e.target.value); setPagina(1); }} />
      </div>
      <Estado r={r}>
        {(p) => (
          <div className="cartao">
            <Tabela colunas={['Produto', 'Tipo', 'Preço', 'Estoque', 'Vendidos', 'Receita', 'Situação', '']} vazio="Nenhum produto nesta lista.">
              {p.itens.map((x) => (
                <tr key={x.id}>
                  <td className="td font-semibold">{x.titulo}</td><td className="td">{ROTULO_TIPO[x.tipo]}</td><td className="td">{brl(x.precoCentavos)}</td>
                  <td className={`td ${x.estoque <= 3 ? 'font-bold text-red-600' : ''}`}>{x.estoque}</td><td className="td">{x.vendidos}</td><td className="td">{brl(x.receitaCentavos)}</td>
                  <td className="td"><Selo status={x.status} /></td>
                  <td className="td"><Link className="font-semibold text-marca-700" to={`/vendedor/produtos/${x.id}`}>Editar</Link></td>
                </tr>
              ))}
            </Tabela>
            <Paginacao p={p} onPagina={setPagina} />
          </div>
        )}
      </Estado>
    </div>
  );
}
