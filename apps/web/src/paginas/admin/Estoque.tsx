import { useState } from 'react';
import { brl, ROTULO_TIPO } from '../../api/formato';
import { Arte, Selo, Sentinela, Tabela, Titulo, useInfinita } from '../../componentes/ui';
import { useSessao } from '../../sessao';

export function Estoque() {
  const { api } = useSessao();
  const [q, setQ] = useState('');
  const [baixo, setBaixo] = useState(false);
  const l = useInfinita((pagina) => api.admin.estoque({ q: q || undefined, baixo, pagina, porPagina: 15 }), [q, baixo]);
  return (
    <div className="animate-subir">
      <Titulo sub={l.inicial ? undefined : `${l.total} produtos`}>Estoque</Titulo>
      <div className="mb-4 flex flex-wrap items-center gap-3">
        <input className="campo !w-72 !rounded-full" placeholder="Buscar produto" value={q} onChange={(e) => setQ(e.target.value)} />
        <label className="flex items-center gap-2 text-sm font-medium"><input type="checkbox" className="accent-marca-500" checked={baixo} onChange={(e) => setBaixo(e.target.checked)} /> Só estoque baixo (3 ou menos)</label>
      </div>
      <div className="cartao !p-2">
        <Tabela carregando={l.inicial} colunas={['Produto', 'Loja', 'Tipo', 'Preço', 'Em estoque', 'Vendidos', 'Situação']} vazio="Nada encontrado.">
          {l.itens.map((x) => <tr key={x.id}><td className="td"><div className="flex items-center gap-3"><Arte p={x} className="aspect-[5/7] w-9 rounded object-cover" /><span className="font-bold">{x.titulo}</span></div></td><td className="td">{x.vendedorNome}</td><td className="td">{ROTULO_TIPO[x.tipo]}</td><td className="td">{brl(x.precoCentavos)}</td><td className={`td ${x.estoque <= 3 ? 'font-bold text-red-600' : ''}`}>{x.estoque}</td><td className="td">{x.vendidos}</td><td className="td"><Selo status={x.status} /></td></tr>)}
        </Tabela>
        <Sentinela l={l} unidade="produtos" />
      </div>
    </div>
  );
}
