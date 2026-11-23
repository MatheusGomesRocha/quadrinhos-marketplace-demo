import { useState } from 'react';
import { Link } from 'react-router-dom';
import { STATUS_PEDIDO } from '@mkt/core';
import { brl, data, ROTULO_STATUS } from '../../api/formato';
import { Selo, Sentinela, Tabela, Titulo, useInfinita } from '../../componentes/ui';
import { mascaraTelefone } from '../../utils/mascaras';
import { useSessao } from '../../sessao';

export function PedidosVendedor() {
  const { api } = useSessao();
  const [status, setStatus] = useState('');
  const l = useInfinita((pagina) => api.painelVendedor.pedidos({ status: (status || undefined) as never, pagina, porPagina: 10 }), [status]);
  return (
    <div className="animate-subir">
      <Titulo sub={l.inicial ? undefined : `${l.total} pedidos`} acao={<select className="campo !w-auto !rounded-full" value={status} onChange={(e) => setStatus(e.target.value)}><option value="">Todos os status</option>{STATUS_PEDIDO.map((s) => <option key={s} value={s}>{ROTULO_STATUS[s]}</option>)}</select>}>Pedidos recebidos</Titulo>
      <div className="cartao !p-2">
        <Tabela carregando={l.inicial} colunas={['Pedido', 'Data', 'Comprador', 'Entrega', 'Itens', 'Valor', 'Líquido', 'Status', '']} vazio="Nenhum pedido por aqui.">
          {l.itens.map((x) => (
            <tr key={x.id}>
              <td className="td font-mono text-xs">{x.codigo}</td><td className="td">{data(x.criadoEm)}</td>
              <td className="td"><p className="font-semibold">{x.comprador.nome}</p>{x.enderecoTelefone && <p className="text-xs text-stone-500">{mascaraTelefone(x.enderecoTelefone)}</p>}</td>
              <td className="td text-xs">{x.enderecoRua}, {x.enderecoNumero}<br />{x.enderecoCidade}/{x.enderecoUf} · {x.enderecoCep}</td>
              <td className="td text-xs">{x.itens.map((i) => `${i.quantidade}× ${i.titulo}`).join(', ')}</td>
              <td className="td font-bold">{brl(x.totalCentavos)}</td><td className="td font-semibold text-emerald-700">{brl(x.liquidoVendedorCentavos)}</td>
              <td className="td"><Selo status={x.status} /></td>
              <td className="td"><Link className="font-semibold text-marca-600" to={`/pedidos/${x.id}`}>{x.status === 'pago' ? 'Enviar' : 'Ver'}</Link></td>
            </tr>
          ))}
        </Tabela>
        <Sentinela l={l} unidade="pedidos" />
      </div>
    </div>
  );
}
