import { z } from 'zod';
import { ErroNegocio } from '../erros';
import { calcularFrete } from '../regras';
import type { Ator, Produto } from '../tipos';
import { criarBase, mapaPorId, validar, type Contexto } from './base';

export interface ItemCarrinho {
  produto: Produto;
  quantidade: number;
  subtotalCentavos: number;
  /** Produto inativo, esgotado ou de vendedor bloqueado: não entra nos totais. */
  indisponivel: boolean;
  /** A quantidade pedida passou do estoque atual. */
  acimaDoEstoque: boolean;
}

export interface GrupoCarrinho {
  vendedor: { id: number; nomeLoja: string };
  itens: ItemCarrinho[];
  subtotalCentavos: number;
  freteCentavos: number;
  totalCentavos: number;
}

export function criarCarrinho(ctx: Contexto) {
  const { repo } = ctx;
  const { iso, autenticar } = criarBase(ctx);
  const esquemaItem = z.object({ produtoId: z.number().int(), quantidade: z.number().int().min(0).max(1000) });

  async function ver(ator: Ator | null) {
    const u = await autenticar(ator, 'comprador');
    const itens = await repo.carrinhoItens.listar({ compradorId: u.id }, { ordem: [['id', 'asc']] });
    const produtos = mapaPorId(itens.length ? await repo.produtos.listar({ id: { in: itens.map((i) => i.produtoId) } }) : []);
    const vendedores = mapaPorId(produtos.size ? await repo.usuarios.listar({ id: { in: [...new Set([...produtos.values()].map((p) => p.vendedorId))] } }) : []);
    const grupos = new Map<number, GrupoCarrinho>();
    for (const i of itens) {
      const p = produtos.get(i.produtoId);
      if (!p) continue;
      const v = vendedores.get(p.vendedorId);
      const indisponivel = p.status !== 'ativo' || p.estoque <= 0 || v?.status !== 'ativo';
      const item: ItemCarrinho = {
        produto: p, quantidade: i.quantidade, indisponivel,
        acimaDoEstoque: !indisponivel && i.quantidade > p.estoque,
        subtotalCentavos: indisponivel ? 0 : p.precoCentavos * i.quantidade,
      };
      const g = grupos.get(p.vendedorId) ?? { vendedor: { id: p.vendedorId, nomeLoja: v?.nomeLoja ?? 'Loja' }, itens: [], subtotalCentavos: 0, freteCentavos: 0, totalCentavos: 0 };
      g.itens.push(item);
      g.subtotalCentavos += item.subtotalCentavos;
      grupos.set(p.vendedorId, g);
    }
    const lista = [...grupos.values()].map((g) => {
      const frete = g.subtotalCentavos > 0 ? calcularFrete(g.subtotalCentavos) : 0;
      return { ...g, freteCentavos: frete, totalCentavos: g.subtotalCentavos + frete };
    });
    return {
      grupos: lista,
      quantidadeTotal: itens.reduce((s, i) => s + i.quantidade, 0),
      totalCentavos: lista.reduce((s, g) => s + g.totalCentavos, 0),
    };
  }

  return {
    ver,

    /** Quantidade de itens no carrinho (para o selo do cabeçalho). */
    async contar(ator: Ator | null, _entrada?: undefined) {
      const u = await autenticar(ator, 'comprador');
      const itens = await repo.carrinhoItens.listar({ compradorId: u.id });
      return itens.reduce((s, i) => s + i.quantidade, 0);
    },

    /** Soma ao que já está no carrinho, sem passar do estoque disponível. */
    async adicionar(ator: Ator | null, entrada: { produtoId: number; quantidade: number }) {
      const u = await autenticar(ator, 'comprador');
      const d = validar(esquemaItem.extend({ quantidade: z.number().int().min(1).max(1000) }), entrada);
      const p = await repo.produtos.obter(d.produtoId);
      const v = p ? await repo.usuarios.obter(p.vendedorId) : null;
      if (!p || p.status !== 'ativo' || v?.status !== 'ativo') throw new ErroNegocio('NAO_ENCONTRADO', 'Produto indisponível.', 404);
      const [existente] = await repo.carrinhoItens.listar({ compradorId: u.id, produtoId: p.id });
      const total = (existente?.quantidade ?? 0) + d.quantidade;
      if (total > p.estoque) {
        const restam = Math.max(p.estoque - (existente?.quantidade ?? 0), 0);
        throw new ErroNegocio('ESTOQUE_INSUFICIENTE', restam ? `Só há mais ${restam} unidade(s) disponível(is) deste produto.` : 'Você já tem no carrinho todas as unidades disponíveis.', 409);
      }
      if (existente) await repo.carrinhoItens.atualizar(existente.id, { quantidade: total });
      else await repo.carrinhoItens.inserir({ compradorId: u.id, produtoId: p.id, quantidade: d.quantidade, criadoEm: iso() });
      return ver(ator);
    },

    /** Define a quantidade exata (0 remove). */
    async atualizar(ator: Ator | null, entrada: { produtoId: number; quantidade: number }) {
      const u = await autenticar(ator, 'comprador');
      const d = validar(esquemaItem, entrada);
      const [item] = await repo.carrinhoItens.listar({ compradorId: u.id, produtoId: d.produtoId });
      if (!item) throw new ErroNegocio('NAO_ENCONTRADO', 'Item não está no carrinho.', 404);
      if (d.quantidade === 0) await repo.carrinhoItens.remover(item.id);
      else {
        const p = await repo.produtos.obter(d.produtoId);
        if (!p || d.quantidade > p.estoque) throw new ErroNegocio('ESTOQUE_INSUFICIENTE', `Só há ${p?.estoque ?? 0} unidade(s) disponível(is).`, 409);
        await repo.carrinhoItens.atualizar(item.id, { quantidade: d.quantidade });
      }
      return ver(ator);
    },

    async remover(ator: Ator | null, entrada: { produtoId: number }) {
      const u = await autenticar(ator, 'comprador');
      const { produtoId } = validar(z.object({ produtoId: z.number().int() }), entrada);
      const [item] = await repo.carrinhoItens.listar({ compradorId: u.id, produtoId });
      if (item) await repo.carrinhoItens.remover(item.id);
      return ver(ator);
    },
  };
}
