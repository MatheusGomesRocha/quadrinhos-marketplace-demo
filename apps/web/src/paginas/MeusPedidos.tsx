import { useState } from 'react';
import { Link } from 'react-router-dom';
import { STATUS_PEDIDO } from '@mkt/core';
import { brl, data, ROTULO_STATUS } from '../api/formato';
import { Estado, Paginacao, Selo, Tabela, Titulo, useCarregar } from '../componentes/ui';
import { useApi } from '../sessao';

export function MeusPedidos() {
  const api = useApi();
  const [status, setStatus] = useState('');
  const [pagina, setPagina] = useState(1);
  const r = useCarregar(() => api.pedidos.meus({ status: (status || undefined) as never, pagina }), [status, pagina]);
  return (
    <div>
      <Titulo acao={<select className="campo !w-auto" value={status} onChange={(e) => { setStatus(e.target.value); setPagina(1); }}><option value="">Todos os status</option>{STATUS_PEDIDO.map((s) => <option key={s} value={s}>{ROTULO_STATUS[s]}</option>)}</select>}>Meus pedidos</Titulo>
      <Estado r={r}>
        {(p) => (
          <div className="cartao">
            <Tabela colunas={['Pedido', 'Data', 'Loja', 'Itens', 'Total', 'Status', '']} vazio="Você ainda não fez nenhum pedido.">
              {p.itens.map((x) => (
                <tr key={x.id}>
                  <td className="td font-mono text-xs">{x.codigo}</td><td className="td">{data(x.criadoEm)}</td><td className="td">{x.vendedor.nomeLoja}</td>
                  <td className="td">{x.itens.reduce((s, i) => s + i.quantidade, 0)}</td><td className="td font-semibold">{brl(x.totalCentavos)}</td><td className="td"><Selo status={x.status} /></td>
                  <td className="td"><Link className="font-semibold text-marca-700" to={`/pedidos/${x.id}`}>Acompanhar</Link></td>
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
