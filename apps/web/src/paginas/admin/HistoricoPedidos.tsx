import { useState } from 'react';
import { Link } from 'react-router-dom';
import { STATUS_PEDIDO } from '@mkt/core';
import { brl, data, ROTULO_STATUS } from '../../api/formato';
import { Estado, Paginacao, Selo, Tabela, Titulo, useCarregar } from '../../componentes/ui';
import { useSessao } from '../../sessao';

export function HistoricoPedidos() {
  const { api } = useSessao();
  const [q, setQ] = useState('');
  const [status, setStatus] = useState('');
  const [pagina, setPagina] = useState(1);
  const r = useCarregar(() => api.admin.historicoPedidos({ q: q || undefined, status: (status || undefined) as never, pagina }), [q, status, pagina]);
  return (
    <div>
      <Titulo>Histórico de pedidos</Titulo>
      <div className="mb-4 flex flex-wrap gap-3">
        <input className="campo !w-64" placeholder="Buscar pelo código do pedido" value={q} onChange={(e) => { setQ(e.target.value); setPagina(1); }} />
        <select className="campo !w-auto" value={status} onChange={(e) => { setStatus(e.target.value); setPagina(1); }}><option value="">Todos os status</option>{STATUS_PEDIDO.map((s) => <option key={s} value={s}>{ROTULO_STATUS[s]}</option>)}</select>
      </div>
      <Estado r={r}>
        {(p) => (
          <div className="cartao">
            <Tabela colunas={['Pedido', 'Data', 'Comprador', 'Loja', 'Total', 'Comissão', 'Status', '']} vazio="Nenhum pedido encontrado.">
              {p.itens.map((x) => (
                <tr key={x.id}><td className="td font-mono text-xs">{x.codigo}</td><td className="td">{data(x.criadoEm)}</td><td className="td">{x.comprador.nome}</td><td className="td">{x.vendedor.nomeLoja}</td><td className="td font-semibold">{brl(x.totalCentavos)}</td><td className="td">{brl(x.comissaoCentavos)}</td><td className="td"><Selo status={x.status} /></td><td className="td"><Link className="font-semibold text-marca-700" to={`/pedidos/${x.id}`}>Ver</Link></td></tr>
              ))}
            </Tabela>
            <Paginacao p={p} onPagina={setPagina} />
          </div>
        )}
      </Estado>
    </div>
  );
}
