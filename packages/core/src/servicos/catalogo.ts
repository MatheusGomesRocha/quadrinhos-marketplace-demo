import { z } from 'zod';
import { ErroNegocio } from '../erros';
import type { Where } from '../repo';
import type { Ator, Nota, Pagina, Produto } from '../tipos';
import { TIPOS_PRODUTO } from '../tipos';
import { criarBase, esquemaPaginacao, validar, type Contexto } from './base';
import { notasDeProdutos, notasDeVendedores } from './notas';

export interface ProdutoVitrine extends Produto {
  vendedor: { id: number; nomeLoja: string };
  nota: Nota;
}

export function criarCatalogo(ctx: Contexto) {
  const { repo } = ctx;
  const { paginacao } = criarBase(ctx);

  return {
    /** Vitrine pública: só produtos ativos, com estoque, de vendedores aprovados. */
    async listar(
      _ator: Ator | null,
      entrada: {
        q?: string; tipo?: Produto['tipo']; estado?: Produto['estado']; precoMinCentavos?: number; precoMaxCentavos?: number;
        ordem?: 'recentes' | 'menor_preco' | 'maior_preco' | 'mais_vendidos'; pagina?: number; porPagina?: number;
      } = {},
    ): Promise<Pagina<ProdutoVitrine>> {
      const d = validar(
        z.object({
          q: z.string().trim().max(100).optional(),
          tipo: z.enum(TIPOS_PRODUTO as [string, ...string[]]).optional(),
          estado: z.enum(['novo', 'usado']).optional(),
          precoMinCentavos: z.number().int().min(0).optional(),
          precoMaxCentavos: z.number().int().min(0).optional(),
          ordem: z.enum(['recentes', 'menor_preco', 'maior_preco', 'mais_vendidos']).default('recentes'),
          ...esquemaPaginacao,
        }),
        entrada,
      );
      const { pagina, porPagina, deslocamento } = paginacao(d, 12);
      const vendedores = await repo.usuarios.listar({ papel: 'vendedor', status: 'ativo' });
      const where: Where<Produto> = { status: 'ativo', estoque: { gt: 0 }, vendedorId: { in: vendedores.map((v) => v.id) } };
      if (d.tipo) where.tipo = d.tipo as Produto['tipo'];
      if (d.estado) where.estado = d.estado;
      if (d.precoMinCentavos !== undefined || d.precoMaxCentavos !== undefined) {
        where.precoCentavos = {
          ...(d.precoMinCentavos !== undefined ? { gte: d.precoMinCentavos } : {}),
          ...(d.precoMaxCentavos !== undefined ? { lte: d.precoMaxCentavos } : {}),
        };
      }
      if (d.q) {
        const like = `%${d.q}%`;
        where.$ou = [{ titulo: { like } }, { autor: { like } }, { editora: { like } }];
      }
      const ordem: [keyof Produto, 'asc' | 'desc'][] =
        d.ordem === 'menor_preco' ? [['precoCentavos', 'asc'], ['id', 'desc']]
        : d.ordem === 'maior_preco' ? [['precoCentavos', 'desc'], ['id', 'desc']]
        : d.ordem === 'mais_vendidos' ? [['vendidos', 'desc'], ['id', 'desc']]
        : [['id', 'desc']];

      const [total, produtos] = await Promise.all([
        repo.produtos.contar(where),
        repo.produtos.listar(where, { ordem, limite: porPagina, deslocamento }),
      ]);
      const notas = await notasDeProdutos(repo, produtos.map((p) => p.id));
      const lojas = new Map(vendedores.map((v) => [v.id, v.nomeLoja ?? v.nome]));
      const itens = produtos.map((p) => ({
        ...p,
        vendedor: { id: p.vendedorId, nomeLoja: lojas.get(p.vendedorId) ?? 'Loja' },
        nota: notas.get(p.id) ?? { media: 0, total: 0 },
      }));
      return { itens, total, pagina, porPagina };
    },

    async detalhe(ator: Ator | null, entrada: { id: number }) {
      const { id } = validar(z.object({ id: z.number().int() }), entrada);
      const produto = await repo.produtos.obter(id);
      const vendedor = produto ? await repo.usuarios.obter(produto.vendedorId) : null;
      if (!produto || !vendedor) throw new ErroNegocio('NAO_ENCONTRADO', 'Produto não encontrado.', 404);
      const dono = ator && (ator.id === produto.vendedorId || ator.papel === 'admin');
      if (!dono && (produto.status !== 'ativo' || vendedor.status !== 'ativo')) {
        throw new ErroNegocio('NAO_ENCONTRADO', 'Produto não encontrado.', 404);
      }
      const avaliacoes = await repo.avaliacoesProduto.listar({ produtoId: id }, { ordem: [['id', 'desc']] });
      const compradores = avaliacoes.length ? await repo.usuarios.listar({ id: { in: avaliacoes.map((a) => a.compradorId) } }) : [];
      const nomes = new Map(compradores.map((c) => [c.id, c.nome.split(' ')[0] ?? 'Cliente']));
      const [notaProduto] = [...(await notasDeProdutos(repo, [id])).values()];
      const [notaVendedor] = [...(await notasDeVendedores(repo, [vendedor.id])).values()];
      const vendasConcluidas = await repo.pedidos.contar({ vendedorId: vendedor.id, status: 'entregue' });
      return {
        produto,
        vendedor: { id: vendedor.id, nomeLoja: vendedor.nomeLoja ?? vendedor.nome, descricaoLoja: vendedor.descricaoLoja, nota: notaVendedor!, vendasConcluidas },
        nota: notaProduto!,
        avaliacoes: avaliacoes.map((a) => ({ id: a.id, nota: a.nota, comentario: a.comentario, criadoEm: a.criadoEm, compradorNome: nomes.get(a.compradorId) ?? 'Cliente' })),
      };
    },
  };
}
