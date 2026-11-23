import { Link } from 'react-router-dom';
import { brl, ROTULO_STATUS, ROTULO_TIPO } from '../../api/formato';
import { Cartao, Estado, Indicador, Titulo, useCarregar } from '../../componentes/ui';
import { LinhaVendas, RoscaValores } from '../../componentes/graficos';
import { useSessao } from '../../sessao';

export function Geral() {
  const { api } = useSessao();
  const r = useCarregar(() => api.admin.resumo(), []);
  return (
    <div>
      <Titulo>Visão geral da plataforma</Titulo>
      <Estado r={r}>
        {(d) => (
          <div className="space-y-5">
            <div className="flex flex-wrap gap-3">
              {d.usuarios.vendedoresPendentes > 0 && <Link to="/admin/vendedores" className="rounded-lg bg-amber-100 px-4 py-2 text-sm font-semibold text-amber-900">{d.usuarios.vendedoresPendentes} solicitação(ões) de vendedor →</Link>}
              {d.reclamacoesAbertas > 0 && <Link to="/admin/reclamacoes" className="rounded-lg bg-red-100 px-4 py-2 text-sm font-semibold text-red-900">{d.reclamacoesAbertas} reclamação(ões) aberta(s) →</Link>}
              {d.catalogo.estoqueBaixo > 0 && <Link to="/admin/estoque" className="rounded-lg bg-stone-200 px-4 py-2 text-sm font-semibold">{d.catalogo.estoqueBaixo} produto(s) com estoque baixo →</Link>}
            </div>
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
              <Indicador rotulo="Faturamento bruto" valor={brl(d.financeiro.brutoCentavos)} detalhe={`${d.financeiro.pedidosAtivos} pedidos (sem cancelados)`} destaque />
              <Indicador rotulo="Comissão realizada" valor={brl(d.financeiro.comissaoRealizadaCentavos)} detalhe={`prevista: ${brl(d.financeiro.comissaoPrevistaCentavos)}`} />
              <Indicador rotulo="Repassado a vendedores" valor={brl(d.financeiro.liberadoVendedorCentavos)} detalhe={`a repassar: ${brl(d.financeiro.aReceberVendedorCentavos)}`} />
              <Indicador rotulo="Ticket médio" valor={brl(d.financeiro.ticketMedioCentavos)} detalhe={`cancelado: ${brl(d.financeiro.canceladosCentavos)}`} />
              <Indicador rotulo="Compradores" valor={String(d.usuarios.compradores)} />
              <Indicador rotulo="Vendedores ativos" valor={String(d.usuarios.vendedores)} detalhe={`${d.usuarios.bloqueados} usuário(s) bloqueado(s)`} />
              <Indicador rotulo="Produtos ativos" valor={String(d.catalogo.produtosAtivos)} />
              <Indicador rotulo="Unidades em estoque" valor={String(d.catalogo.unidadesEmEstoque)} />
            </div>
            <div className="grid gap-5 lg:grid-cols-2">
              <Cartao titulo="Vendas nos últimos 30 dias"><LinhaVendas serie={d.graficos.vendasPorDia} /></Cartao>
              <Cartao titulo="Comissão da plataforma por dia"><LinhaVendas serie={d.graficos.vendasPorDia} campo="comissaoCentavos" rotulo="Comissão" /></Cartao>
              <Cartao titulo="Vendas por tipo de produto"><RoscaValores itens={d.graficos.porTipo.map((t) => ({ rotulo: ROTULO_TIPO[t.tipo] ?? t.tipo, valor: t.valorCentavos }))} /></Cartao>
              <Cartao titulo="Pedidos por situação"><RoscaValores formatar={(n) => `${n} pedidos`} itens={Object.entries(d.graficos.pedidosPorStatus).filter(([, n]) => n > 0).map(([s, n]) => ({ rotulo: ROTULO_STATUS[s] ?? s, valor: n }))} /></Cartao>
            </div>
          </div>
        )}
      </Estado>
    </div>
  );
}
