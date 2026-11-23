import { z } from 'zod';
import { ErroNegocio } from '../erros';
import { notaValida } from '../regras';
import type { Ator } from '../tipos';
import { criarBase, validar, type Contexto } from './base';
import { notasDeProdutos, notasDeVendedores } from './notas';

const nota = z.number().refine(notaValida, 'Dê uma nota de 1 a 5 (pode ter meia estrela).');
const comentario = z.string().trim().max(1000).nullish();

export function criarAvaliacoes(ctx: Contexto) {
  const { repo } = ctx;
  const { iso, autenticar } = criarBase(ctx);

  /** Só avalia quem comprou, e só depois de marcar o pedido como recebido. */
  async function pedidoAvaliavel(ator: Ator | null, pedidoId: number) {
    const u = await autenticar(ator, 'comprador');
    const p = await repo.pedidos.obter(pedidoId);
    if (!p || p.compradorId !== u.id) throw new ErroNegocio('NAO_ENCONTRADO', 'Pedido não encontrado.', 404);
    if (p.status !== 'entregue') throw new ErroNegocio('STATUS_INVALIDO', 'Você só pode avaliar depois de marcar o pedido como recebido.', 409);
    return { u, p };
  }

  return {
    async avaliarProduto(ator: Ator | null, entrada: { pedidoId: number; produtoId: number; nota: number; comentario?: string | null }) {
      const d = validar(z.object({ pedidoId: z.number().int(), produtoId: z.number().int(), nota, comentario }), entrada);
      const { u, p } = await pedidoAvaliavel(ator, d.pedidoId);
      if ((await repo.pedidoItens.contar({ pedidoId: p.id, produtoId: d.produtoId })) === 0) throw new ErroNegocio('NAO_ENCONTRADO', 'Este produto não faz parte do pedido.', 404);
      if ((await repo.avaliacoesProduto.contar({ pedidoId: p.id, produtoId: d.produtoId })) > 0) throw new ErroNegocio('JA_AVALIADO', 'Você já avaliou este produto neste pedido.', 409);
      return repo.avaliacoesProduto.inserir({ produtoId: d.produtoId, pedidoId: p.id, compradorId: u.id, nota: d.nota, comentario: d.comentario?.trim() || null, criadoEm: iso() });
    },

    async avaliarVendedor(ator: Ator | null, entrada: { pedidoId: number; nota: number; comentario?: string | null }) {
      const d = validar(z.object({ pedidoId: z.number().int(), nota, comentario }), entrada);
      const { u, p } = await pedidoAvaliavel(ator, d.pedidoId);
      if ((await repo.avaliacoesVendedor.contar({ pedidoId: p.id })) > 0) throw new ErroNegocio('JA_AVALIADO', 'Você já avaliou o vendedor neste pedido.', 409);
      return repo.avaliacoesVendedor.inserir({ vendedorId: p.vendedorId, pedidoId: p.id, compradorId: u.id, nota: d.nota, comentario: d.comentario?.trim() || null, criadoEm: iso() });
    },

    async doProduto(_ator: Ator | null, entrada: { produtoId: number }) {
      const { produtoId } = validar(z.object({ produtoId: z.number().int() }), entrada);
      const nota = (await notasDeProdutos(repo, [produtoId])).get(produtoId)!;
      return { nota, avaliacoes: await repo.avaliacoesProduto.listar({ produtoId }, { ordem: [['id', 'desc']] }) };
    },

    async doVendedor(_ator: Ator | null, entrada: { vendedorId: number }) {
      const { vendedorId } = validar(z.object({ vendedorId: z.number().int() }), entrada);
      const nota = (await notasDeVendedores(repo, [vendedorId])).get(vendedorId)!;
      return { nota, avaliacoes: await repo.avaliacoesVendedor.listar({ vendedorId }, { ordem: [['id', 'desc']] }) };
    },
  };
}
