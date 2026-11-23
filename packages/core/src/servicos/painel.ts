import { z } from 'zod';
import type { Ator, Pagina, StatusPedido } from '../tipos';
import { STATUS_PEDIDO } from '../tipos';
import { criarBase, esquemaPaginacao, mapaPorId, validar, type Contexto } from './base';
import { pedidosPorStatus, porTipo, resumoFinanceiro, serieDiaria, topProdutos } from './financeiro';
import { notasDeVendedores } from './notas';
import { enriquecerPedidos, type PedidoCompleto } from './pedidos';

/** Painel do vendedor: cards, gráficos e a lista de pedidos recebidos (com comprador e endereço). */
export function criarPainelVendedor(ctx: Contexto) {
  const { repo } = ctx;
  const { autenticar, paginacao } = criarBase(ctx);

  return {
    async resumo(ator: Ator | null, _entrada?: undefined) {
      const u = await autenticar(ator, 'vendedor');
      const [pedidos, produtos] = await Promise.all([repo.pedidos.listar({ vendedorId: u.id }), repo.produtos.listar({ vendedorId: u.id })]);
      const itens = pedidos.length ? await repo.pedidoItens.listar({ pedidoId: { in: pedidos.map((p) => p.id) } }) : [];
      const fin = resumoFinanceiro(pedidos);
      const nota = (await notasDeVendedores(repo, [u.id])).get(u.id)!;
      return {
        financeiro: {
          ...fin,
          // Para o vendedor, o "bruto" é o que ele vendeu em produtos; a comissão sai disso.
          vendidoCentavos: pedidos.filter((p) => p.status !== 'cancelado').reduce((s, p) => s + p.subtotalCentavos, 0),
          comissaoPagaCentavos: fin.comissaoRealizadaCentavos + fin.comissaoPrevistaCentavos,
        },
        produtos: {
          aVenda: produtos.filter((p) => p.status === 'ativo' && p.estoque > 0).length,
          esgotados: produtos.filter((p) => p.estoque === 0).length,
          unidadesEmEstoque: produtos.reduce((s, p) => s + p.estoque, 0),
          unidadesVendidas: produtos.reduce((s, p) => s + p.vendidos, 0),
        },
        nota,
        pedidosParaEnviar: pedidos.filter((p) => p.status === 'pago').length,
        graficos: {
          vendasPorDia: serieDiaria(pedidos, ctx.agora(), 30),
          porTipo: porTipo(pedidos, itens, mapaPorId(produtos)),
          topProdutos: topProdutos(pedidos, itens, 5),
          pedidosPorStatus: pedidosPorStatus(pedidos),
        },
      };
    },

    async pedidos(ator: Ator | null, entrada: { status?: StatusPedido; pagina?: number; porPagina?: number } = {}): Promise<Pagina<PedidoCompleto>> {
      const u = await autenticar(ator, 'vendedor');
      const d = validar(z.object({ status: z.enum(STATUS_PEDIDO as [string, ...string[]]).optional(), ...esquemaPaginacao }), entrada);
      const { pagina, porPagina, deslocamento } = paginacao(d);
      const where = { vendedorId: u.id, ...(d.status ? { status: d.status as StatusPedido } : {}) };
      const [total, pedidos] = await Promise.all([
        repo.pedidos.contar(where),
        repo.pedidos.listar(where, { ordem: [['id', 'desc']], limite: porPagina, deslocamento }),
      ]);
      return { itens: await enriquecerPedidos(repo, pedidos), total, pagina, porPagina };
    },
  };
}
