import { z } from 'zod';
import { ErroNegocio } from '../erros';
import { calcularComissao, calcularFrete, PRAZO_ENTREGA_DIAS, somarDias } from '../regras';
import type { Repo } from '../repo';
import type { Ator, AvaliacaoProduto, AvaliacaoVendedor, Pagina, Pedido, PedidoItem, Reclamacao, StatusPedido } from '../tipos';
import { STATUS_PEDIDO } from '../tipos';
import { criarBase, esquemaPaginacao, mapaPorId, unicos, validar, type Contexto } from './base';

export interface PedidoCompleto extends Pedido {
  itens: PedidoItem[];
  comprador: { id: number; nome: string };
  vendedor: { id: number; nomeLoja: string };
  reclamacao: Reclamacao | null;
}

/** Junta itens, nomes e reclamação aos pedidos (com poucas consultas, sem N+1). */
export async function enriquecerPedidos(repo: Repo, pedidos: Pedido[]): Promise<PedidoCompleto[]> {
  if (!pedidos.length) return [];
  const ids = pedidos.map((p) => p.id);
  const [itens, usuarios, reclamacoes] = await Promise.all([
    repo.pedidoItens.listar({ pedidoId: { in: ids } }),
    repo.usuarios.listar({ id: { in: unicos(pedidos.flatMap((p) => [p.compradorId, p.vendedorId])) } }),
    repo.reclamacoes.listar({ pedidoId: { in: ids } }, { ordem: [['id', 'desc']] }),
  ]);
  const us = mapaPorId(usuarios);
  return pedidos.map((p) => ({
    ...p,
    itens: itens.filter((i) => i.pedidoId === p.id),
    comprador: { id: p.compradorId, nome: us.get(p.compradorId)?.nome ?? '—' },
    vendedor: { id: p.vendedorId, nomeLoja: us.get(p.vendedorId)?.nomeLoja ?? us.get(p.vendedorId)?.nome ?? '—' },
    reclamacao: reclamacoes.find((r) => r.pedidoId === p.id) ?? null,
  }));
}

const esquemaEndereco = z.object({
  nome: z.string().trim().min(2).max(120),
  cep: z.string().trim().regex(/^\d{5}-?\d{3}$/, 'CEP inválido.'),
  rua: z.string().trim().min(2).max(160),
  numero: z.string().trim().min(1).max(12),
  complemento: z.string().trim().max(80).nullish(),
  bairro: z.string().trim().min(2).max(80),
  cidade: z.string().trim().min(2).max(80),
  uf: z.string().trim().length(2).toUpperCase(),
});

export function criarPedidos(ctx: Contexto) {
  const { repo } = ctx;
  const { iso, autenticar, paginacao } = criarBase(ctx);

  /** Só o comprador, o vendedor do pedido ou um admin enxergam o pedido. */
  async function carregarComAcesso(ator: Ator | null, id: number) {
    const u = await autenticar(ator);
    const p = await repo.pedidos.obter(id);
    const acesso = p && (u.papel === 'admin' || p.compradorId === u.id || p.vendedorId === u.id);
    if (!p || !acesso) throw new ErroNegocio('NAO_ENCONTRADO', 'Pedido não encontrado.', 404);
    return { u, p };
  }

  const podeReclamar = (p: Pedido, reclamacao: Reclamacao | null) =>
    p.status === 'enviado' && !!p.prazoEntregaEm && ctx.agora().toISOString() > p.prazoEntregaEm && !reclamacao;

  return {
    /**
     * Checkout. Gera UM pedido por vendedor (cada loja envia e recebe separado) e baixa o estoque de forma atômica.
     * O pagamento é SIMULADO: o pedido já nasce como "pago". Tudo acontece em uma transação.
     */
    async finalizarCompra(ator: Ator | null, entrada: { endereco: z.input<typeof esquemaEndereco>; metodoPagamento: 'pix' | 'cartao' | 'boleto' }) {
      const u = await autenticar(ator, 'comprador');
      const d = validar(z.object({ endereco: esquemaEndereco, metodoPagamento: z.enum(['pix', 'cartao', 'boleto']) }), entrada);

      return repo.transacao(async (tx) => {
        const itens = await tx.carrinhoItens.listar({ compradorId: u.id }, { ordem: [['id', 'asc']] });
        if (!itens.length) throw new ErroNegocio('CARRINHO_VAZIO', 'Seu carrinho está vazio.', 400);
        const produtos = mapaPorId(await tx.produtos.listar({ id: { in: itens.map((i) => i.produtoId) } }));
        const vendedores = mapaPorId(await tx.usuarios.listar({ id: { in: unicos([...produtos.values()].map((p) => p.vendedorId)) } }));

        const porVendedor = new Map<number, { produtoId: number; titulo: string; preco: number; quantidade: number }[]>();
        for (const i of itens) {
          const p = produtos.get(i.produtoId);
          if (!p || p.status !== 'ativo' || vendedores.get(p.vendedorId)?.status !== 'ativo') {
            throw new ErroNegocio('PRODUTO_INDISPONIVEL', `"${p?.titulo ?? 'Um item'}" não está mais disponível. Remova-o do carrinho.`, 409);
          }
          if (i.quantidade > p.estoque) {
            throw new ErroNegocio('ESTOQUE_INSUFICIENTE', `"${p.titulo}": só há ${p.estoque} unidade(s) disponível(is).`, 409);
          }
          porVendedor.set(p.vendedorId, [...(porVendedor.get(p.vendedorId) ?? []), { produtoId: p.id, titulo: p.titulo, preco: p.precoCentavos, quantidade: i.quantidade }]);
        }

        const agora = iso();
        const codigo = `MK-${ctx.agora().getTime().toString(36).toUpperCase()}-${u.id}`;
        const criados: Pedido[] = [];
        for (const [vendedorId, linhas] of porVendedor) {
          const subtotal = linhas.reduce((s, l) => s + l.preco * l.quantidade, 0);
          const frete = calcularFrete(subtotal);
          const comissao = calcularComissao(subtotal);
          const pedido = await tx.pedidos.inserir({
            codigo, compradorId: u.id, vendedorId, status: 'pago',
            subtotalCentavos: subtotal, freteCentavos: frete, totalCentavos: subtotal + frete,
            comissaoCentavos: comissao, liquidoVendedorCentavos: subtotal - comissao + frete,
            metodoPagamento: d.metodoPagamento,
            enderecoNome: d.endereco.nome, enderecoCep: d.endereco.cep, enderecoRua: d.endereco.rua, enderecoNumero: d.endereco.numero,
            enderecoComplemento: d.endereco.complemento ?? null, enderecoBairro: d.endereco.bairro, enderecoCidade: d.endereco.cidade,
            enderecoUf: d.endereco.uf, codigoRastreio: null, criadoEm: agora, pagoEm: agora, enviadoEm: null, prazoEntregaEm: null, entregueEm: null,
          });
          for (const l of linhas) {
            // A baixa só acontece se ainda houver estoque: se outro comprador levou o último exemplar, tudo é desfeito.
            if (!(await tx.produtos.baixarEstoque(l.produtoId, l.quantidade))) {
              throw new ErroNegocio('ESTOQUE_INSUFICIENTE', `"${l.titulo}" acabou de esgotar. Seu carrinho foi mantido.`, 409);
            }
            await tx.pedidoItens.inserir({ pedidoId: pedido.id, produtoId: l.produtoId, titulo: l.titulo, precoUnitarioCentavos: l.preco, quantidade: l.quantidade });
          }
          criados.push(pedido);
        }
        for (const i of itens) await tx.carrinhoItens.remover(i.id);
        return {
          codigo,
          pedidos: criados.map((p) => ({ id: p.id, vendedorId: p.vendedorId, totalCentavos: p.totalCentavos })),
          totalCentavos: criados.reduce((s, p) => s + p.totalCentavos, 0),
        };
      });
    },

    /** Histórico de pedidos do comprador logado. */
    async meus(ator: Ator | null, entrada: { status?: StatusPedido; pagina?: number; porPagina?: number } = {}): Promise<Pagina<PedidoCompleto>> {
      const u = await autenticar(ator, 'comprador');
      const d = validar(z.object({ status: z.enum(STATUS_PEDIDO as [string, ...string[]]).optional(), ...esquemaPaginacao }), entrada);
      const { pagina, porPagina, deslocamento } = paginacao(d);
      const where = { compradorId: u.id, ...(d.status ? { status: d.status as StatusPedido } : {}) };
      const [total, pedidos] = await Promise.all([
        repo.pedidos.contar(where),
        repo.pedidos.listar(where, { ordem: [['id', 'desc']], limite: porPagina, deslocamento }),
      ]);
      return { itens: await enriquecerPedidos(repo, pedidos), total, pagina, porPagina };
    },

    /** Detalhe com linha do tempo, avaliações já feitas e o que o usuário pode fazer agora. */
    async detalhe(ator: Ator | null, entrada: { id: number }) {
      const { id } = validar(z.object({ id: z.number().int() }), entrada);
      const { u, p } = await carregarComAcesso(ator, id);
      const [completo] = await enriquecerPedidos(repo, [p]);
      const [avProdutos, avVendedor] = await Promise.all([
        repo.avaliacoesProduto.listar({ pedidoId: id }),
        repo.avaliacoesVendedor.listar({ pedidoId: id }),
      ]);
      const ehComprador = u.id === p.compradorId;
      const reclamacao = completo!.reclamacao;
      return {
        pedido: completo!,
        avaliacoes: { produtos: avProdutos as AvaliacaoProduto[], vendedor: (avVendedor[0] ?? null) as AvaliacaoVendedor | null },
        acoes: {
          podeMarcarRecebido: ehComprador && p.status === 'enviado',
          podeReclamar: ehComprador && podeReclamar(p, reclamacao),
          podeCancelar: (ehComprador || u.id === p.vendedorId || u.papel === 'admin') && p.status === 'pago',
          podeMarcarEnviado: u.id === p.vendedorId && p.status === 'pago',
          podeAvaliar: ehComprador && p.status === 'entregue',
        },
      };
    },

    /** O vendedor informa o rastreio: a partir daí começa a contar o prazo de entrega. */
    async marcarEnviado(ator: Ator | null, entrada: { id: number; codigoRastreio: string }) {
      const d = validar(z.object({ id: z.number().int(), codigoRastreio: z.string().trim().min(5).max(60) }), entrada);
      const { u, p } = await carregarComAcesso(ator, d.id);
      if (u.papel !== 'vendedor' || p.vendedorId !== u.id) throw new ErroNegocio('PROIBIDO', 'Só o vendedor do pedido pode marcá-lo como enviado.', 403);
      if (p.status !== 'pago') throw new ErroNegocio('STATUS_INVALIDO', 'Este pedido não está aguardando envio.', 409);
      const agora = iso();
      return repo.pedidos.atualizar(p.id, { status: 'enviado', codigoRastreio: d.codigoRastreio, enviadoEm: agora, prazoEntregaEm: somarDias(agora, PRAZO_ENTREGA_DIAS) });
    },

    /** O comprador confirma o recebimento: libera o valor para o vendedor e habilita as avaliações. */
    async marcarRecebido(ator: Ator | null, entrada: { id: number }) {
      const { id } = validar(z.object({ id: z.number().int() }), entrada);
      const { u, p } = await carregarComAcesso(ator, id);
      if (u.id !== p.compradorId) throw new ErroNegocio('PROIBIDO', 'Só o comprador pode confirmar o recebimento.', 403);
      if (p.status !== 'enviado') throw new ErroNegocio('STATUS_INVALIDO', p.status === 'reclamacao' ? 'Este pedido está em reclamação.' : 'Este pedido ainda não foi enviado.', 409);
      return repo.pedidos.atualizar(p.id, { status: 'entregue', entregueEm: iso() });
    },

    /** Cancelamento só enquanto o pedido ainda não foi enviado. O estoque volta para a loja. */
    async cancelar(ator: Ator | null, entrada: { id: number }) {
      const { id } = validar(z.object({ id: z.number().int() }), entrada);
      const { p } = await carregarComAcesso(ator, id);
      if (p.status !== 'pago') throw new ErroNegocio('STATUS_INVALIDO', 'Só é possível cancelar pedidos que ainda não foram enviados.', 409);
      return repo.transacao(async (tx) => {
        for (const i of await tx.pedidoItens.listar({ pedidoId: p.id })) await tx.produtos.devolverEstoque(i.produtoId, i.quantidade);
        return tx.pedidos.atualizar(p.id, { status: 'cancelado' });
      });
    },
  };
}
