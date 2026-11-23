import { z } from 'zod';
import { ErroNegocio } from '../erros';
import { corDoTitulo } from '../regras';
import type { Where } from '../repo';
import type { Ator, Pagina, Produto } from '../tipos';
import { TIPOS_PRODUTO } from '../tipos';
import { criarBase, esquemaPaginacao, validar, type Contexto } from './base';

const campos = {
  titulo: z.string().trim().min(2).max(160),
  descricao: z.string().trim().min(10).max(2000),
  tipo: z.enum(TIPOS_PRODUTO as [string, ...string[]]),
  autor: z.string().trim().min(2).max(120),
  editora: z.string().trim().min(2).max(120),
  estado: z.enum(['novo', 'usado']),
  precoCentavos: z.number().int().min(100).max(10_000_000),
  estoque: z.number().int().min(0).max(100000),
};

export type EntradaProduto = {
  titulo: string; descricao: string; tipo: Produto['tipo']; autor: string; editora: string;
  estado: Produto['estado']; precoCentavos: number; estoque: number;
};

/** Cadastro e gestão dos produtos do vendedor logado. */
export function criarProdutos(ctx: Contexto) {
  const { repo } = ctx;
  const { iso, autenticar, paginacao } = criarBase(ctx);

  async function doVendedor(ator: Ator | null, id: number) {
    const u = await autenticar(ator, 'vendedor');
    const p = await repo.produtos.obter(id);
    if (!p || p.vendedorId !== u.id) throw new ErroNegocio('NAO_ENCONTRADO', 'Produto não encontrado.', 404);
    return p;
  }

  return {
    async cadastrar(ator: Ator | null, entrada: EntradaProduto) {
      const u = await autenticar(ator, 'vendedor');
      const d = validar(z.object(campos), entrada);
      return repo.produtos.inserir({
        ...(d as EntradaProduto), vendedorId: u.id, vendidos: 0, cor: corDoTitulo(d.titulo), status: 'ativo', criadoEm: iso(),
      });
    },

    async atualizar(ator: Ator | null, entrada: Partial<EntradaProduto> & { id: number }) {
      const { id, ...resto } = entrada;
      const p = await doVendedor(ator, id);
      const d = validar(z.object(campos).partial(), resto) as Partial<EntradaProduto>;
      return repo.produtos.atualizar(p.id, { ...d, ...(d.titulo ? { cor: corDoTitulo(d.titulo) } : {}) });
    },

    async alterarStatus(ator: Ator | null, entrada: { id: number; status: 'ativo' | 'inativo' }) {
      const d = validar(z.object({ id: z.number().int(), status: z.enum(['ativo', 'inativo']) }), entrada);
      const p = await doVendedor(ator, d.id);
      return repo.produtos.atualizar(p.id, { status: d.status });
    },

    /**
     * Painel "meus produtos".
     *  - aVenda: ativos e com estoque;  - vendidos: já venderam ao menos uma unidade (com a receita gerada).
     */
    async meus(
      ator: Ator | null,
      entrada: { situacao?: 'aVenda' | 'vendidos' | 'todos'; q?: string; pagina?: number; porPagina?: number } = {},
    ): Promise<Pagina<Produto & { receitaCentavos: number }>> {
      const u = await autenticar(ator, 'vendedor');
      const d = validar(z.object({ situacao: z.enum(['aVenda', 'vendidos', 'todos']).default('aVenda'), q: z.string().trim().max(100).optional(), ...esquemaPaginacao }), entrada);
      const { pagina, porPagina, deslocamento } = paginacao(d);
      const where: Where<Produto> = { vendedorId: u.id };
      if (d.situacao === 'aVenda') { where.status = 'ativo'; where.estoque = { gt: 0 }; }
      if (d.situacao === 'vendidos') where.vendidos = { gt: 0 };
      if (d.q) where.titulo = { like: `%${d.q}%` };
      const ordem: [keyof Produto, 'asc' | 'desc'][] = d.situacao === 'vendidos' ? [['vendidos', 'desc'], ['id', 'desc']] : [['id', 'desc']];
      const [total, produtos] = await Promise.all([
        repo.produtos.contar(where),
        repo.produtos.listar(where, { ordem, limite: porPagina, deslocamento }),
      ]);

      // Receita por produto = unidades vendidas em pedidos que não foram cancelados.
      const receita = new Map<number, number>();
      if (produtos.length) {
        const itens = await repo.pedidoItens.listar({ produtoId: { in: produtos.map((p) => p.id) } });
        const pedidos = itens.length ? await repo.pedidos.listar({ id: { in: [...new Set(itens.map((i) => i.pedidoId))] }, status: { ne: 'cancelado' } }) : [];
        const validos = new Set(pedidos.map((p) => p.id));
        for (const i of itens) if (validos.has(i.pedidoId)) receita.set(i.produtoId, (receita.get(i.produtoId) ?? 0) + i.precoUnitarioCentavos * i.quantidade);
      }
      return { itens: produtos.map((p) => ({ ...p, receitaCentavos: receita.get(p.id) ?? 0 })), total, pagina, porPagina };
    },

    async obter(ator: Ator | null, entrada: { id: number }) {
      return doVendedor(ator, validar(z.object({ id: z.number().int() }), entrada).id);
    },
  };
}
