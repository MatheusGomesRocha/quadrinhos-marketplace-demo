import { useState } from 'react';
import { Package } from 'lucide-react';
import { Link } from 'react-router-dom';
import { STATUS_PEDIDO } from '@mkt/core';
import { brl, data, ROTULO_STATUS } from '../api/formato';
import { Selo, Sentinela, Tabela, Titulo, useInfinita, Vazio } from '../componentes/ui';
import { useApi } from '../sessao';

export function MeusPedidos() {
  const api = useApi();
  const [status, setStatus] = useState('');
  const l = useInfinita((pagina) => api.pedidos.meus({ status: (status || undefined) as never, pagina, porPagina: 10 }), [status]);
  return (
    <div className="animate-subir">
      <Titulo sub={l.inicial ? undefined : `${l.total} ${l.total === 1 ? 'pedido' : 'pedidos'}`} acao={<select className="campo !w-auto !rounded-full" value={status} onChange={(e) => setStatus(e.target.value)}><option value="">Todos os status</option>{STATUS_PEDIDO.map((s) => <option key={s} value={s}>{ROTULO_STATUS[s]}</option>)}</select>}>Meus pedidos</Titulo>
      <div className="cartao !p-2">
        <Tabela carregando={l.inicial} colunas={['Pedido', 'Data', 'Loja', 'Itens', 'Total', 'Status', '']}>
          {l.itens.map((x) => (
            <tr key={x.id}>
              <td className="td font-mono text-xs">{x.codigo}</td><td className="td">{data(x.criadoEm)}</td><td className="td">{x.vendedor.nomeLoja}</td>
              <td className="td">{x.itens.reduce((s, i) => s + i.quantidade, 0)}</td><td className="td font-bold">{brl(x.totalCentavos)}</td><td className="td"><Selo status={x.status} /></td>
              <td className="td"><Link className="font-semibold text-marca-600" to={`/pedidos/${x.id}`}>Acompanhar</Link></td>
            </tr>
          ))}
        </Tabela>
        {!l.inicial && l.itens.length === 0 && !l.erro && <Vazio icone={<Package size={28} />} texto="Você ainda não fez nenhum pedido." acao={<Link to="/" className="btn-primario">Explorar o catálogo</Link>} />}
        <Sentinela l={l} unidade="pedidos" />
      </div>
    </div>
  );
}
