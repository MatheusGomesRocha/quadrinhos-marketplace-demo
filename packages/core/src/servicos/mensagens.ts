import { z } from 'zod';
import { ErroNegocio } from '../erros';
import type { Ator, Conversa } from '../tipos';
import { criarBase, mapaPorId, unicos, validar, type Contexto } from './base';

const texto = z.string().trim().min(1).max(2000);

/** Chat entre comprador e vendedor (uma conversa por par, opcionalmente ligada a um produto). */
export function criarMensagens(ctx: Contexto) {
  const { repo } = ctx;
  const { iso, autenticar } = criarBase(ctx);

  async function conversaDoUsuario(ator: Ator | null, id: number) {
    const u = await autenticar(ator, 'comprador', 'vendedor');
    const c = await repo.conversas.obter(id);
    if (!c || (c.compradorId !== u.id && c.vendedorId !== u.id)) throw new ErroNegocio('NAO_ENCONTRADO', 'Conversa não encontrada.', 404);
    return { u, c };
  }

  return {
    /** O comprador abre (ou retoma) a conversa com um vendedor e já envia a primeira mensagem. */
    async iniciar(ator: Ator | null, entrada: { vendedorId: number; produtoId?: number | null; texto: string }) {
      const u = await autenticar(ator, 'comprador');
      const d = validar(z.object({ vendedorId: z.number().int(), produtoId: z.number().int().nullish(), texto }), entrada);
      const v = await repo.usuarios.obter(d.vendedorId);
      if (!v || v.papel !== 'vendedor' || v.status !== 'ativo') throw new ErroNegocio('NAO_ENCONTRADO', 'Vendedor não encontrado.', 404);
      const agora = iso();
      let [c] = await repo.conversas.listar({ compradorId: u.id, vendedorId: v.id });
      if (!c) c = await repo.conversas.inserir({ compradorId: u.id, vendedorId: v.id, produtoId: d.produtoId ?? null, criadoEm: agora, atualizadoEm: agora });
      await repo.mensagens.inserir({ conversaId: c.id, autorId: u.id, texto: d.texto, lida: 0, criadoEm: agora });
      await repo.conversas.atualizar(c.id, { atualizadoEm: agora });
      return { conversaId: c.id };
    },

    async enviar(ator: Ator | null, entrada: { conversaId: number; texto: string }) {
      const d = validar(z.object({ conversaId: z.number().int(), texto }), entrada);
      const { u, c } = await conversaDoUsuario(ator, d.conversaId);
      const agora = iso();
      const m = await repo.mensagens.inserir({ conversaId: c.id, autorId: u.id, texto: d.texto, lida: 0, criadoEm: agora });
      await repo.conversas.atualizar(c.id, { atualizadoEm: agora });
      return m;
    },

    async conversas(ator: Ator | null, _entrada?: undefined) {
      const u = await autenticar(ator, 'comprador', 'vendedor');
      const campo = u.papel === 'comprador' ? 'compradorId' : 'vendedorId';
      const lista: Conversa[] = await repo.conversas.listar({ [campo]: u.id }, { ordem: [['atualizadoEm', 'desc']] });
      if (!lista.length) return [];
      const [msgs, pessoas, produtos] = await Promise.all([
        repo.mensagens.listar({ conversaId: { in: lista.map((c) => c.id) } }, { ordem: [['id', 'asc']] }),
        repo.usuarios.listar({ id: { in: unicos(lista.flatMap((c) => [c.compradorId, c.vendedorId])) } }),
        repo.produtos.listar({ id: { in: unicos(lista.map((c) => c.produtoId).filter((x): x is number => x !== null)) } }),
      ]);
      const us = mapaPorId(pessoas);
      const ps = mapaPorId(produtos);
      return lista.map((c) => {
        const dela = msgs.filter((m) => m.conversaId === c.id);
        const outro = us.get(u.papel === 'comprador' ? c.vendedorId : c.compradorId);
        return {
          id: c.id,
          outro: { id: outro?.id ?? 0, nome: u.papel === 'comprador' ? outro?.nomeLoja ?? outro?.nome ?? '—' : outro?.nome ?? '—' },
          produto: c.produtoId ? { id: c.produtoId, titulo: ps.get(c.produtoId)?.titulo ?? '' } : null,
          ultimaMensagem: dela[dela.length - 1] ?? null,
          naoLidas: dela.filter((m) => m.autorId !== u.id && m.lida === 0).length,
          atualizadoEm: c.atualizadoEm,
        };
      });
    },

    /** Abre a conversa e marca como lidas as mensagens da outra pessoa. */
    async conversa(ator: Ator | null, entrada: { id: number }) {
      const { id } = validar(z.object({ id: z.number().int() }), entrada);
      const { u, c } = await conversaDoUsuario(ator, id);
      const msgs = await repo.mensagens.listar({ conversaId: c.id }, { ordem: [['id', 'asc']] });
      for (const m of msgs) if (m.autorId !== u.id && m.lida === 0) await repo.mensagens.atualizar(m.id, { lida: 1 });
      const outroId = u.papel === 'comprador' ? c.vendedorId : c.compradorId;
      const outro = await repo.usuarios.obter(outroId);
      const produto = c.produtoId ? await repo.produtos.obter(c.produtoId) : null;
      return {
        id: c.id,
        outro: { id: outroId, nome: u.papel === 'comprador' ? outro?.nomeLoja ?? outro?.nome ?? '—' : outro?.nome ?? '—' },
        produto: produto ? { id: produto.id, titulo: produto.titulo } : null,
        mensagens: msgs.map((m) => ({ ...m, lida: m.autorId === u.id ? m.lida : 1 })),
      };
    },

    /** Total de mensagens não lidas (selo do cabeçalho). */
    async naoLidas(ator: Ator | null, _entrada?: undefined) {
      const u = await autenticar(ator, 'comprador', 'vendedor');
      const campo = u.papel === 'comprador' ? 'compradorId' : 'vendedorId';
      const cs = await repo.conversas.listar({ [campo]: u.id });
      if (!cs.length) return 0;
      const msgs = await repo.mensagens.listar({ conversaId: { in: cs.map((c) => c.id) }, lida: 0 });
      return msgs.filter((m) => m.autorId !== u.id).length;
    },
  };
}
