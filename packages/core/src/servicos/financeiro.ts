import { diaDe } from '../regras';
import type { Pedido, PedidoItem, Produto, StatusPedido, TipoProduto } from '../tipos';

const soma = (ps: Pedido[], f: (p: Pedido) => number) => ps.reduce((s, p) => s + f(p), 0);
const EM_ABERTO: StatusPedido[] = ['pago', 'enviado', 'reclamacao'];

/**
 * Regras do dinheiro (todas em centavos):
 *  - bruto: soma do total dos pedidos NÃO cancelados;
 *  - liberado ao vendedor / comissão realizada: só de pedidos ENTREGUES (o comprador confirmou o recebimento);
 *  - a receber / comissão prevista: pedidos ainda em andamento (pago, enviado ou em reclamação).
 */
export function resumoFinanceiro(pedidos: Pedido[]) {
  const ativos = pedidos.filter((p) => p.status !== 'cancelado');
  const entregues = pedidos.filter((p) => p.status === 'entregue');
  const abertos = pedidos.filter((p) => EM_ABERTO.includes(p.status));
  const bruto = soma(ativos, (p) => p.totalCentavos);
  return {
    totalPedidos: pedidos.length,
    pedidosAtivos: ativos.length,
    brutoCentavos: bruto,
    ticketMedioCentavos: ativos.length ? Math.round(bruto / ativos.length) : 0,
    comissaoRealizadaCentavos: soma(entregues, (p) => p.comissaoCentavos),
    comissaoPrevistaCentavos: soma(abertos, (p) => p.comissaoCentavos),
    liberadoVendedorCentavos: soma(entregues, (p) => p.liquidoVendedorCentavos),
    aReceberVendedorCentavos: soma(abertos, (p) => p.liquidoVendedorCentavos),
    canceladosCentavos: soma(pedidos.filter((p) => p.status === 'cancelado'), (p) => p.totalCentavos),
  };
}

/** Série diária dos últimos `dias` dias (dias sem venda aparecem com zero, para o gráfico não "pular"). */
export function serieDiaria(pedidos: Pedido[], agora: Date, dias = 30) {
  const mapa = new Map<string, { valorCentavos: number; comissaoCentavos: number; pedidos: number }>();
  for (let i = dias - 1; i >= 0; i--) {
    const d = new Date(agora);
    d.setUTCDate(d.getUTCDate() - i);
    mapa.set(diaDe(d.toISOString()), { valorCentavos: 0, comissaoCentavos: 0, pedidos: 0 });
  }
  for (const p of pedidos) {
    if (p.status === 'cancelado' || !p.pagoEm) continue;
    const m = mapa.get(diaDe(p.pagoEm));
    if (!m) continue;
    m.valorCentavos += p.totalCentavos;
    m.comissaoCentavos += p.comissaoCentavos;
    m.pedidos += 1;
  }
  return [...mapa.entries()].map(([data, v]) => ({ data, ...v }));
}

export function pedidosPorStatus(pedidos: Pedido[]) {
  const r: Record<StatusPedido, number> = { pago: 0, enviado: 0, entregue: 0, reclamacao: 0, cancelado: 0 };
  for (const p of pedidos) r[p.status] += 1;
  return r;
}

/** Receita e unidades por tipo (HQ, mangá...) considerando só pedidos não cancelados. */
export function porTipo(pedidos: Pedido[], itens: PedidoItem[], produtos: Map<number, Produto>) {
  const validos = new Set(pedidos.filter((p) => p.status !== 'cancelado').map((p) => p.id));
  const r = new Map<TipoProduto, { tipo: TipoProduto; valorCentavos: number; unidades: number }>();
  for (const i of itens) {
    if (!validos.has(i.pedidoId)) continue;
    const tipo = produtos.get(i.produtoId)?.tipo ?? 'outro';
    const atual = r.get(tipo) ?? { tipo, valorCentavos: 0, unidades: 0 };
    atual.valorCentavos += i.precoUnitarioCentavos * i.quantidade;
    atual.unidades += i.quantidade;
    r.set(tipo, atual);
  }
  return [...r.values()].sort((a, b) => b.valorCentavos - a.valorCentavos);
}

export function topProdutos(pedidos: Pedido[], itens: PedidoItem[], limite = 5) {
  const validos = new Set(pedidos.filter((p) => p.status !== 'cancelado').map((p) => p.id));
  const r = new Map<number, { produtoId: number; titulo: string; unidades: number; valorCentavos: number }>();
  for (const i of itens) {
    if (!validos.has(i.pedidoId)) continue;
    const a = r.get(i.produtoId) ?? { produtoId: i.produtoId, titulo: i.titulo, unidades: 0, valorCentavos: 0 };
    a.unidades += i.quantidade;
    a.valorCentavos += i.precoUnitarioCentavos * i.quantidade;
    r.set(i.produtoId, a);
  }
  return [...r.values()].sort((a, b) => b.unidades - a.unidades || b.valorCentavos - a.valorCentavos).slice(0, limite);
}
