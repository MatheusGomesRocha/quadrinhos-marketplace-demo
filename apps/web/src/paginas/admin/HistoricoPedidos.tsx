import { useState } from 'react';
import { Link } from 'react-router-dom';
import { STATUS_PEDIDO } from '@mkt/core';
import { brl, data, ROTULO_STATUS } from '../../api/formato';
import { Selo, Sentinela, Tabela, Titulo, useInfinita } from '../../componentes/ui';
import { useSessao } from '../../sessao';

export function HistoricoPedidos() {
  const { api } = useSessao();
  const [q, setQ] = useState('');
  const [status, setStatus] = useState('');
  const l = useInfinita((pagina) => api.admin.historicoPedidos({ q: q || undefined, status: (status || undefined) as never, pagina, porPagina: 15 }), [q, status]);
  return (
    <div className="animate-subir">
      <Titulo sub={l.inicial ? undefined : `${l.total} pedidos`}>Histórico de pedidos</Titulo>
      <div className="mb-4 flex flex-wrap gap-3">
        <input className="campo !w-72 !rounded-full" placeholder="Buscar pelo código do pedido" value={q} onChange={(e) => setQ(e.target.value)} />
        <select className="campo !w-auto !rounded-full" value={status} onChange={(e) => setStatus(e.target.value)}><option value="">Todos os status</option>{STATUS_PEDIDO.map((s) => <option key={s} value={s}>{ROTULO_STATUS[s]}</option>)}</select>
      </div>
      <div className="cartao !p-2">
        <Tabela carregando={l.inicial} colunas={['Pedido', 'Data', 'Comprador', 'Loja', 'Total', 'Comissão', 'Status', '']} vazio="Nenhum pedido encontrado.">
          {l.itens.map((x) => (
            <tr key={x.id}><td className="td font-mono text-xs">{x.codigo}</td><td className="td">{data(x.criadoEm)}</td><td className="td">{x.comprador.nome}</td><td className="td">{x.vendedor.nomeLoja}</td><td className="td font-bold">{brl(x.totalCentavos)}</td><td className="td">{brl(x.comissaoCentavos)}</td><td className="td"><Selo status={x.status} /></td><td className="td"><Link className="font-semibold text-marca-600" to={`/pedidos/${x.id}`}>Ver</Link></td></tr>
          ))}
        </Tabela>
        <Sentinela l={l} unidade="pedidos" />
      </div>
    </div>
  );
}
