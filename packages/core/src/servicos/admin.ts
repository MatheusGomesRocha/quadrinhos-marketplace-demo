import { z } from 'zod';
import { ErroNegocio } from '../erros';
import { ESTOQUE_BAIXO } from '../regras';
import type { Where } from '../repo';
import type { Ator, Pagina, Papel, Produto, RegistroLogin, StatusPedido, StatusUsuario, Usuario, UsuarioPublico } from '../tipos';
import { STATUS_PEDIDO } from '../tipos';
import { criarBase, esquemaPaginacao, mapaPorId, publico, unicos, validar, type Contexto } from './base';
import { pedidosPorStatus, porTipo, resumoFinanceiro, serieDiaria } from './financeiro';
import { notasDeVendedores } from './notas';
import { enriquecerPedidos, type PedidoCompleto } from './pedidos';

export function criarAdmin(ctx: Contexto) {
  const { repo } = ctx;
  const { autenticar, paginacao } = criarBase(ctx);
  const id = z.object({ id: z.number().int() });

  async function alvo(entradaId: number): Promise<Usuario> {
    const u = await repo.usuarios.obter(entradaId);
    if (!u) throw new ErroNegocio('NAO_ENCONTRADO', 'Usuário não encontrado.', 404);
    return u;
  }

  return {
    /** Financeiro geral + pendências + gráficos. */
    async resumo(ator: Ator | null, _entrada?: undefined) {
      await autenticar(ator, 'admin');
      const [pedidos, produtos, usuarios] = await Promise.all([repo.pedidos.listar(), repo.produtos.listar(), repo.usuarios.listar()]);
      const itens = pedidos.length ? await repo.pedidoItens.listar() : [];
      const conta = (papel: Papel, status?: StatusUsuario) => usuarios.filter((u) => u.papel === papel && (!status || u.status === status)).length;
      return {
        financeiro: resumoFinanceiro(pedidos),
        usuarios: {
          compradores: conta('comprador'), vendedores: conta('vendedor', 'ativo'),
          vendedoresPendentes: conta('vendedor', 'pendente'), bloqueados: usuarios.filter((u) => u.status === 'bloqueado').length,
        },
        catalogo: {
          produtosAtivos: produtos.filter((p) => p.status === 'ativo').length,
          unidadesEmEstoque: produtos.reduce((s, p) => s + p.estoque, 0),
          estoqueBaixo: produtos.filter((p) => p.status === 'ativo' && p.estoque <= ESTOQUE_BAIXO).length,
        },
        reclamacoesAbertas: await repo.reclamacoes.contar({ status: 'aberta' }),
        graficos: {
          vendasPorDia: serieDiaria(pedidos, ctx.agora(), 30),
          porTipo: porTipo(pedidos, itens, mapaPorId(produtos)),
          pedidosPorStatus: pedidosPorStatus(pedidos),
        },
      };
    },

    // ---- Aprovação de vendedores ----
    async vendedores(ator: Ator | null, entrada: { status?: StatusUsuario; pagina?: number; porPagina?: number } = {}): Promise<Pagina<UsuarioPublico>> {
      await autenticar(ator, 'admin');
      const d = validar(z.object({ status: z.enum(['ativo', 'pendente', 'rejeitado', 'bloqueado']).default('pendente'), ...esquemaPaginacao }), entrada);
      const { pagina, porPagina, deslocamento } = paginacao(d);
      const where: Where<Usuario> = { papel: 'vendedor', status: d.status };
      const [total, linhas] = await Promise.all([repo.usuarios.contar(where), repo.usuarios.listar(where, { ordem: [['id', 'desc']], limite: porPagina, deslocamento })]);
      return { itens: linhas.map(publico), total, pagina, porPagina };
    },

    async aprovarVendedor(ator: Ator | null, entrada: { id: number }) {
      await autenticar(ator, 'admin');
      const u = await alvo(validar(id, entrada).id);
      if (u.papel !== 'vendedor' || u.status !== 'pendente') throw new ErroNegocio('STATUS_INVALIDO', 'Este cadastro não está pendente.', 409);
      return publico(await repo.usuarios.atualizar(u.id, { status: 'ativo', motivoRejeicao: null }));
    },

    async rejeitarVendedor(ator: Ator | null, entrada: { id: number; motivo: string }) {
      await autenticar(ator, 'admin');
      const d = validar(id.extend({ motivo: z.string().trim().min(5).max(255) }), entrada);
      const u = await alvo(d.id);
      if (u.papel !== 'vendedor' || u.status !== 'pendente') throw new ErroNegocio('STATUS_INVALIDO', 'Este cadastro não está pendente.', 409);
      return publico(await repo.usuarios.atualizar(u.id, { status: 'rejeitado', motivoRejeicao: d.motivo }));
    },

    // ---- Usuários ----
    async usuarios(ator: Ator | null, entrada: { papel?: Papel; status?: StatusUsuario; q?: string; pagina?: number; porPagina?: number } = {}): Promise<Pagina<UsuarioPublico>> {
      await autenticar(ator, 'admin');
      const d = validar(
        z.object({
          papel: z.enum(['comprador', 'vendedor', 'admin']).optional(),
          status: z.enum(['ativo', 'pendente', 'rejeitado', 'bloqueado']).optional(),
          q: z.string().trim().max(100).optional(), ...esquemaPaginacao,
        }),
        entrada,
      );
      const { pagina, porPagina, deslocamento } = paginacao(d);
      const where: Where<Usuario> = {};
      if (d.papel) where.papel = d.papel;
      if (d.status) where.status = d.status;
      if (d.q) where.$ou = [{ nome: { like: `%${d.q}%` } }, { email: { like: `%${d.q}%` } }, { nomeLoja: { like: `%${d.q}%` } }];
      const [total, linhas] = await Promise.all([repo.usuarios.contar(where), repo.usuarios.listar(where, { ordem: [['id', 'desc']], limite: porPagina, deslocamento })]);
      return { itens: linhas.map(publico), total, pagina, porPagina };
    },

    async bloquear(ator: Ator | null, entrada: { id: number }) {
      const admin = await autenticar(ator, 'admin');
      const u = await alvo(validar(id, entrada).id);
      if (u.id === admin.id || u.papel === 'admin') throw new ErroNegocio('PROIBIDO', 'Não é possível bloquear um administrador.', 403);
      if (u.status !== 'ativo') throw new ErroNegocio('STATUS_INVALIDO', 'Só é possível bloquear contas ativas.', 409);
      return publico(await repo.usuarios.atualizar(u.id, { status: 'bloqueado' }));
    },

    async desbloquear(ator: Ator | null, entrada: { id: number }) {
      await autenticar(ator, 'admin');
      const u = await alvo(validar(id, entrada).id);
      if (u.status !== 'bloqueado') throw new ErroNegocio('STATUS_INVALIDO', 'Esta conta não está bloqueada.', 409);
      return publico(await repo.usuarios.atualizar(u.id, { status: 'ativo' }));
    },

    // ---- Rankings ----
    async rankingVendedores(ator: Ator | null, entrada: { limite?: number } = {}) {
      await autenticar(ator, 'admin');
      const { limite } = validar(z.object({ limite: z.number().int().min(1).max(50).default(10) }), entrada);
      const pedidos = (await repo.pedidos.listar({ status: { ne: 'cancelado' } }));
      const por = new Map<number, { vendedorId: number; vendidoCentavos: number; pedidos: number; unidades: number }>();
      for (const p of pedidos) {
        const a = por.get(p.vendedorId) ?? { vendedorId: p.vendedorId, vendidoCentavos: 0, pedidos: 0, unidades: 0 };
        a.vendidoCentavos += p.subtotalCentavos;
        a.pedidos += 1;
        por.set(p.vendedorId, a);
      }
      const top = [...por.values()].sort((a, b) => b.vendidoCentavos - a.vendidoCentavos).slice(0, limite);
      const [us, notas] = await Promise.all([
        repo.usuarios.listar({ id: { in: top.map((t) => t.vendedorId) } }),
        notasDeVendedores(repo, top.map((t) => t.vendedorId)),
      ]);
      const m = mapaPorId(us);
      return top.map((t, i) => ({ posicao: i + 1, ...t, nomeLoja: m.get(t.vendedorId)?.nomeLoja ?? m.get(t.vendedorId)?.nome ?? '—', nota: notas.get(t.vendedorId)! }));
    },

    async rankingCompradores(ator: Ator | null, entrada: { limite?: number } = {}) {
      await autenticar(ator, 'admin');
      const { limite } = validar(z.object({ limite: z.number().int().min(1).max(50).default(10) }), entrada);
      const pedidos = await repo.pedidos.listar({ status: { ne: 'cancelado' } });
      const por = new Map<number, { compradorId: number; gastoCentavos: number; pedidos: number }>();
      for (const p of pedidos) {
        const a = por.get(p.compradorId) ?? { compradorId: p.compradorId, gastoCentavos: 0, pedidos: 0 };
        a.gastoCentavos += p.totalCentavos;
        a.pedidos += 1;
        por.set(p.compradorId, a);
      }
      const top = [...por.values()].sort((a, b) => b.gastoCentavos - a.gastoCentavos).slice(0, limite);
      const m = mapaPorId(await repo.usuarios.listar({ id: { in: top.map((t) => t.compradorId) } }));
      return top.map((t, i) => ({ posicao: i + 1, ...t, nome: m.get(t.compradorId)?.nome ?? '—' }));
    },

    // ---- Histórico, estoque e logins ----
    async historicoPedidos(ator: Ator | null, entrada: { status?: StatusPedido; q?: string; pagina?: number; porPagina?: number } = {}): Promise<Pagina<PedidoCompleto>> {
      await autenticar(ator, 'admin');
      const d = validar(z.object({ status: z.enum(STATUS_PEDIDO as [string, ...string[]]).optional(), q: z.string().trim().max(60).optional(), ...esquemaPaginacao }), entrada);
      const { pagina, porPagina, deslocamento } = paginacao(d);
      const where: Where<import('../tipos').Pedido> = {};
      if (d.status) where.status = d.status as StatusPedido;
      if (d.q) where.$ou = [{ codigo: { like: `%${d.q}%` } }, { enderecoNome: { like: `%${d.q}%` } }];
      const [total, linhas] = await Promise.all([repo.pedidos.contar(where), repo.pedidos.listar(where, { ordem: [['id', 'desc']], limite: porPagina, deslocamento })]);
      return { itens: await enriquecerPedidos(repo, linhas), total, pagina, porPagina };
    },

    async estoque(ator: Ator | null, entrada: { q?: string; baixo?: boolean; pagina?: number; porPagina?: number } = {}): Promise<Pagina<Produto & { vendedorNome: string }>> {
      await autenticar(ator, 'admin');
      const d = validar(z.object({ q: z.string().trim().max(100).optional(), baixo: z.boolean().optional(), ...esquemaPaginacao }), entrada);
      const { pagina, porPagina, deslocamento } = paginacao(d);
      const where: Where<Produto> = {};
      if (d.baixo) { where.estoque = { lte: ESTOQUE_BAIXO }; where.status = 'ativo'; }
      if (d.q) where.$ou = [{ titulo: { like: `%${d.q}%` } }, { autor: { like: `%${d.q}%` } }];
      const [total, linhas] = await Promise.all([repo.produtos.contar(where), repo.produtos.listar(where, { ordem: [['estoque', 'asc'], ['id', 'asc']], limite: porPagina, deslocamento })]);
      const us = mapaPorId(await repo.usuarios.listar({ id: { in: unicos(linhas.map((p) => p.vendedorId)) } }));
      return { itens: linhas.map((p) => ({ ...p, vendedorNome: us.get(p.vendedorId)?.nomeLoja ?? '—' })), total, pagina, porPagina };
    },

    async registrosLogin(ator: Ator | null, entrada: { sucesso?: boolean; q?: string; pagina?: number; porPagina?: number } = {}): Promise<Pagina<RegistroLogin & { papel: Papel | null }>> {
      await autenticar(ator, 'admin');
      const d = validar(z.object({ sucesso: z.boolean().optional(), q: z.string().trim().max(100).optional(), ...esquemaPaginacao }), entrada);
      const { pagina, porPagina, deslocamento } = paginacao(d, 20);
      const where: Where<RegistroLogin> = {};
      if (d.sucesso !== undefined) where.sucesso = d.sucesso ? 1 : 0;
      if (d.q) where.email = { like: `%${d.q}%` };
      const [total, linhas] = await Promise.all([repo.registrosLogin.contar(where), repo.registrosLogin.listar(where, { ordem: [['id', 'desc']], limite: porPagina, deslocamento })]);
      const ids = unicos(linhas.map((l) => l.usuarioId).filter((x): x is number => x !== null));
      const us = mapaPorId(ids.length ? await repo.usuarios.listar({ id: { in: ids } }) : []);
      return { itens: linhas.map((l) => ({ ...l, papel: l.usuarioId ? us.get(l.usuarioId)?.papel ?? null : null })), total, pagina, porPagina };
    },
  };
}
