import { Link } from 'react-router-dom';
import { brl, ROTULO_STATUS, ROTULO_TIPO } from '../../api/formato';
import { Cartao, Estado, Estrelas, Indicador, Titulo, useCarregar } from '../../componentes/ui';
import { BarrasHoriz, LinhaVendas, RoscaValores } from '../../componentes/graficos';
import { useSessao } from '../../sessao';

export function PainelVendedor() {
  const { api, usuario } = useSessao();
  const r = useCarregar(() => api.painelVendedor.resumo(), []);
  return (
    <div>
      <Titulo acao={<Link to="/vendedor/produtos/novo" className="btn-primario">Cadastrar produto</Link>}>Painel da {usuario?.nomeLoja}</Titulo>
      <Estado r={r}>
        {(d) => (
          <div className="space-y-5">
            {d.pedidosParaEnviar > 0 && <Link to="/vendedor/pedidos" className="block rounded-lg bg-amber-100 px-4 py-3 text-sm font-semibold text-amber-900">Você tem {d.pedidosParaEnviar} pedido(s) aguardando envio →</Link>}
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
              <Indicador rotulo="Vendido (sem frete)" valor={brl(d.financeiro.vendidoCentavos)} detalhe={`${d.financeiro.pedidosAtivos} pedidos`} />
              <Indicador rotulo="Já liberado para você" valor={brl(d.financeiro.liberadoVendedorCentavos)} detalhe="pedidos recebidos pelo comprador" destaque />
              <Indicador rotulo="A receber" valor={brl(d.financeiro.aReceberVendedorCentavos)} detalhe="pedidos em andamento" />
              <Indicador rotulo="Comissão da plataforma (10%)" valor={brl(d.financeiro.comissaoPagaCentavos)} detalhe={`ticket médio ${brl(d.financeiro.ticketMedioCentavos)}`} />
              <Indicador rotulo="Produtos à venda" valor={String(d.produtos.aVenda)} detalhe={`${d.produtos.esgotados} esgotados`} />
              <Indicador rotulo="Unidades em estoque" valor={String(d.produtos.unidadesEmEstoque)} />
              <Indicador rotulo="Unidades vendidas" valor={String(d.produtos.unidadesVendidas)} />
              <div className="cartao"><p className="text-xs font-semibold uppercase tracking-wide text-stone-500">Sua nota</p><div className="mt-2"><Estrelas valor={d.nota.media} total={d.nota.total} tamanho={20} /></div></div>
            </div>
            <div className="grid gap-5 lg:grid-cols-2">
              <Cartao titulo="Vendas nos últimos 30 dias"><LinhaVendas serie={d.graficos.vendasPorDia} /></Cartao>
              <Cartao titulo="Vendas por tipo de produto"><RoscaValores itens={d.graficos.porTipo.map((t) => ({ rotulo: ROTULO_TIPO[t.tipo] ?? t.tipo, valor: t.valorCentavos }))} /></Cartao>
              <Cartao titulo="Produtos mais vendidos (unidades)"><BarrasHoriz rotulo="Unidades" formatar={(n) => `${n} un.`} itens={d.graficos.topProdutos.map((t) => ({ rotulo: t.titulo, valor: t.unidades }))} /></Cartao>
              <Cartao titulo="Pedidos por situação"><RoscaValores formatar={(n) => `${n} pedidos`} itens={Object.entries(d.graficos.pedidosPorStatus).filter(([, n]) => n > 0).map(([s, n]) => ({ rotulo: ROTULO_STATUS[s] ?? s, valor: n }))} /></Cartao>
            </div>
          </div>
        )}
      </Estado>
    </div>
  );
}
