import { useState } from 'react';
import { brl, ROTULO_TIPO } from '../../api/formato';
import { Estado, Paginacao, Selo, Tabela, Titulo, useCarregar } from '../../componentes/ui';
import { useSessao } from '../../sessao';

export function Estoque() {
  const { api } = useSessao();
  const [q, setQ] = useState('');
  const [baixo, setBaixo] = useState(false);
  const [pagina, setPagina] = useState(1);
  const r = useCarregar(() => api.admin.estoque({ q: q || undefined, baixo, pagina }), [q, baixo, pagina]);
  return (
    <div>
      <Titulo>Estoque</Titulo>
      <div className="mb-4 flex flex-wrap items-center gap-3">
        <input className="campo !w-64" placeholder="Buscar produto" value={q} onChange={(e) => { setQ(e.target.value); setPagina(1); }} />
        <label className="flex items-center gap-2 text-sm"><input type="checkbox" checked={baixo} onChange={(e) => { setBaixo(e.target.checked); setPagina(1); }} /> Só estoque baixo (3 ou menos)</label>
      </div>
      <Estado r={r}>
        {(p) => (
          <div className="cartao">
            <Tabela colunas={['Produto', 'Loja', 'Tipo', 'Preço', 'Em estoque', 'Vendidos', 'Situação']} vazio="Nada encontrado.">
              {p.itens.map((x) => <tr key={x.id}><td className="td font-semibold">{x.titulo}</td><td className="td">{x.vendedorNome}</td><td className="td">{ROTULO_TIPO[x.tipo]}</td><td className="td">{brl(x.precoCentavos)}</td><td className={`td ${x.estoque <= 3 ? 'font-bold text-red-600' : ''}`}>{x.estoque}</td><td className="td">{x.vendidos}</td><td className="td"><Selo status={x.status} /></td></tr>)}
            </Tabela>
            <Paginacao p={p} onPagina={setPagina} />
          </div>
        )}
      </Estado>
    </div>
  );
}
