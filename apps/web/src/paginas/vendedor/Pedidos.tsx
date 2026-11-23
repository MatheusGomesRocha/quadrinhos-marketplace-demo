import { useState } from 'react';
import { Link } from 'react-router-dom';
import { STATUS_PEDIDO } from '@mkt/core';
import { brl, data, ROTULO_STATUS } from '../../api/formato';
import { Estado, Paginacao, Selo, Tabela, Titulo, useCarregar } from '../../componentes/ui';
import { useSessao } from '../../sessao';

export function PedidosVendedor() {
  const { api } = useSessao();
  const [status, setStatus] = useState('');
  const [pagina, setPagina] = useState(1);
  const r = useCarregar(() => api.painelVendedor.pedidos({ status: (status || undefined) as never, pagina }), [status, pagina]);
  return (
    <div>
      <Titulo acao={<select className="campo !w-auto" value={status} onChange={(e) => { setStatus(e.target.value); setPagina(1); }}><option value="">Todos os status</option>{STATUS_PEDIDO.map((s) => <option key={s} value={s}>{ROTULO_STATUS[s]}</option>)}</select>}>Pedidos recebidos</Titulo>
      <Estado r={r}>
        {(p) => (
          <div className="cartao">
            <Tabela colunas={['Pedido', 'Data', 'Comprador', 'Endereço', 'Itens', 'Valor', 'Líquido', 'Status', '']} vazio="Nenhum pedido por aqui.">
              {p.itens.map((x) => (
                <tr key={x.id}>
                  <td className="td font-mono text-xs">{x.codigo}</td><td className="td">{data(x.criadoEm)}</td><td className="td">{x.comprador.nome}</td>
                  <td className="td text-xs">{x.enderecoRua}, {x.enderecoNumero} · {x.enderecoCidade}/{x.enderecoUf}</td>
                  <td className="td text-xs">{x.itens.map((i) => `${i.quantidade}× ${i.titulo}`).join(', ')}</td>
                  <td className="td font-semibold">{brl(x.totalCentavos)}</td><td className="td text-emerald-700">{brl(x.liquidoVendedorCentavos)}</td>
                  <td className="td"><Selo status={x.status} /></td>
                  <td className="td"><Link className="font-semibold text-marca-700" to={`/pedidos/${x.id}`}>{x.status === 'pago' ? 'Enviar' : 'Ver'}</Link></td>
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
