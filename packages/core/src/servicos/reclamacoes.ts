import { z } from 'zod';
import { ErroNegocio } from '../erros';
import { PRAZO_APOS_RECLAMACAO_REJEITADA_DIAS, somarDias } from '../regras';
import type { Ator, Pagina, Reclamacao } from '../tipos';
import { criarBase, esquemaPaginacao, mapaPorId, validar, type Contexto } from './base';
import { enriquecerPedidos, type PedidoCompleto } from './pedidos';

export function criarReclamacoes(ctx: Contexto) {
  const { repo } = ctx;
  const { iso, autenticar, paginacao } = criarBase(ctx);

  return {
    /** O comprador só pode reclamar depois que o prazo de entrega venceu e o pedido não foi recebido. */
    async abrir(ator: Ator | null, entrada: { pedidoId: number; motivo: string }) {
      const u = await autenticar(ator, 'comprador');
      const d = validar(z.object({ pedidoId: z.number().int(), motivo: z.string().trim().min(10).max(1000) }), entrada);
      const p = await repo.pedidos.obter(d.pedidoId);
      if (!p || p.compradorId !== u.id) throw new ErroNegocio('NAO_ENCONTRADO', 'Pedido não encontrado.', 404);
      if (p.status !== 'enviado') throw new ErroNegocio('STATUS_INVALIDO', 'Só é possível reclamar de pedidos enviados e ainda não recebidos.', 409);
      if (!p.prazoEntregaEm || iso() <= p.prazoEntregaEm) throw new ErroNegocio('PRAZO_NAO_VENCIDO', 'O prazo de entrega ainda não venceu.', 409);
      if ((await repo.reclamacoes.contar({ pedidoId: p.id })) > 0) throw new ErroNegocio('JA_EXISTE', 'Já existe uma reclamação para este pedido.', 409);
      return repo.transacao(async (tx) => {
        const r = await tx.reclamacoes.inserir({ pedidoId: p.id, compradorId: u.id, motivo: d.motivo, status: 'aberta', respostaAdmin: null, criadoEm: iso(), resolvidaEm: null });
        await tx.pedidos.atualizar(p.id, { status: 'reclamacao' });
        return r;
      });
    },

    async minhas(ator: Ator | null, _entrada?: undefined) {
      const u = await autenticar(ator, 'comprador');
      return repo.reclamacoes.listar({ compradorId: u.id }, { ordem: [['id', 'desc']] });
    },

    /** Fila de reclamações para o admin decidir. */
    async listar(ator: Ator | null, entrada: { status?: Reclamacao['status']; pagina?: number; porPagina?: number } = {}): Promise<Pagina<Reclamacao & { pedido: PedidoCompleto | null }>> {
      await autenticar(ator, 'admin');
      const d = validar(z.object({ status: z.enum(['aberta', 'reembolsada', 'rejeitada']).optional(), ...esquemaPaginacao }), entrada);
      const { pagina, porPagina, deslocamento } = paginacao(d);
      const where = d.status ? { status: d.status } : {};
      const [total, linhas] = await Promise.all([
        repo.reclamacoes.contar(where),
        repo.reclamacoes.listar(where, { ordem: [['id', 'desc']], limite: porPagina, deslocamento }),
      ]);
      const pedidos = mapaPorId(await enriquecerPedidos(repo, linhas.length ? await repo.pedidos.listar({ id: { in: linhas.map((r) => r.pedidoId) } }) : []));
      return { itens: linhas.map((r) => ({ ...r, pedido: pedidos.get(r.pedidoId) ?? null })), total, pagina, porPagina };
    },

    /**
     * Decisão do admin.
     *  - reembolsar: o pedido é cancelado (o dinheiro volta ao comprador e nada é liberado ao vendedor);
     *  - rejeitar: o pedido volta a "enviado" e ganha mais alguns dias de prazo.
     */
    async resolver(ator: Ator | null, entrada: { id: number; decisao: 'reembolsar' | 'rejeitar'; resposta: string }) {
      await autenticar(ator, 'admin');
      const d = validar(z.object({ id: z.number().int(), decisao: z.enum(['reembolsar', 'rejeitar']), resposta: z.string().trim().min(5).max(1000) }), entrada);
      const r = await repo.reclamacoes.obter(d.id);
      if (!r) throw new ErroNegocio('NAO_ENCONTRADO', 'Reclamação não encontrada.', 404);
      if (r.status !== 'aberta') throw new ErroNegocio('STATUS_INVALIDO', 'Esta reclamação já foi resolvida.', 409);
      return repo.transacao(async (tx) => {
        const agora = iso();
        if (d.decisao === 'reembolsar') await tx.pedidos.atualizar(r.pedidoId, { status: 'cancelado' });
        else await tx.pedidos.atualizar(r.pedidoId, { status: 'enviado', prazoEntregaEm: somarDias(agora, PRAZO_APOS_RECLAMACAO_REJEITADA_DIAS) });
        return tx.reclamacoes.atualizar(r.id, { status: d.decisao === 'reembolsar' ? 'reembolsada' : 'rejeitada', respostaAdmin: d.resposta, resolvidaEm: agora });
      });
    },
  };
}
