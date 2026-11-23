import { brl } from '../../api/formato';
import { Cartao, Estado, Estrelas, Tabela, Titulo, useCarregar } from '../../componentes/ui';
import { BarrasHoriz } from '../../componentes/graficos';
import { useSessao } from '../../sessao';

export function Rankings() {
  const { api } = useSessao();
  const v = useCarregar(() => api.admin.rankingVendedores({ limite: 10 }), []);
  const c = useCarregar(() => api.admin.rankingCompradores({ limite: 10 }), []);
  return (
    <div>
      <Titulo>Quem mais vendeu e quem mais comprou</Titulo>
      <div className="grid gap-5 lg:grid-cols-2">
        <Cartao titulo="Vendedores (por valor vendido, sem frete)">
          <Estado r={v}>{(l) => (<>
            <BarrasHoriz itens={l.map((x) => ({ rotulo: x.nomeLoja, valor: x.vendidoCentavos }))} />
            <Tabela colunas={['#', 'Loja', 'Vendido', 'Pedidos', 'Nota']} vazio="Sem vendas ainda.">{l.map((x) => <tr key={x.vendedorId}><td className="td">{x.posicao}</td><td className="td font-semibold">{x.nomeLoja}</td><td className="td">{brl(x.vendidoCentavos)}</td><td className="td">{x.pedidos}</td><td className="td"><Estrelas valor={x.nota.media} total={x.nota.total} tamanho={12} /></td></tr>)}</Tabela>
          </>)}</Estado>
        </Cartao>
        <Cartao titulo="Compradores (por valor gasto)">
          <Estado r={c}>{(l) => (<>
            <BarrasHoriz itens={l.map((x) => ({ rotulo: x.nome, valor: x.gastoCentavos }))} />
            <Tabela colunas={['#', 'Comprador', 'Gasto', 'Pedidos']} vazio="Sem compras ainda.">{l.map((x) => <tr key={x.compradorId}><td className="td">{x.posicao}</td><td className="td font-semibold">{x.nome}</td><td className="td">{brl(x.gastoCentavos)}</td><td className="td">{x.pedidos}</td></tr>)}</Tabela>
          </>)}</Estado>
        </Cartao>
      </div>
    </div>
  );
}
