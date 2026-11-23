import { beforeEach, describe, expect, it } from 'vitest';
import type { Repo } from '../repo';
import type { Usuario } from '../tipos';

const usuario = (extra: Partial<Usuario> = {}): Omit<Usuario, 'id'> => ({
  nome: 'Fulano', email: `f${Math.random()}@x.com`, senhaHash: 'h', papel: 'comprador', status: 'ativo',
  nomeLoja: null, documento: null, telefone: null, descricaoLoja: null, motivoRejeicao: null, criadoEm: '2026-11-01T10:00:00.123Z', ...extra,
});

/** Contrato que TODA implementação de repositório precisa cumprir (memória, SQLite, MySQL). */
export function contratoRepo(nome: string, fabrica: () => Promise<Repo>) {
  describe(`Contrato do repositório (${nome})`, () => {
    let repo: Repo;
    beforeEach(async () => { repo = await fabrica(); });

    it('insere, obtém e preserva tipos (null, datas com milissegundos, acentos)', async () => {
      const u = await repo.usuarios.inserir(usuario({ nome: 'José Ação Ñandú 🙂', nomeLoja: 'Loja Açaí' }));
      expect(u.id).toBeGreaterThan(0);
      const lido = await repo.usuarios.obter(u.id);
      expect(lido).toEqual(u);
      expect(lido!.documento).toBeNull();
      expect(lido!.criadoEm).toBe('2026-11-01T10:00:00.123Z');
      expect(lido!.nome).toBe('José Ação Ñandú 🙂');
      expect(await repo.usuarios.obter(9999)).toBeNull();
    });

    it('filtra por igualdade, null, in, comparações, ne e $ou', async () => {
      const a = await repo.usuarios.inserir(usuario({ nome: 'Ana', email: 'ana@x.com', papel: 'comprador', criadoEm: '2026-11-01T10:00:00.000Z' }));
      const b = await repo.usuarios.inserir(usuario({ nome: 'Bruno', email: 'bruno@x.com', papel: 'vendedor', nomeLoja: 'Loja B', criadoEm: '2026-11-02T10:00:00.000Z' }));
      const c = await repo.usuarios.inserir(usuario({ nome: 'Carla', email: 'carla@x.com', papel: 'vendedor', status: 'pendente', criadoEm: '2026-11-03T10:00:00.000Z' }));
      const ids = async (w: any) => (await repo.usuarios.listar(w)).map((u) => u.id);
      expect(await ids({ papel: 'vendedor' })).toEqual([b.id, c.id]);
      expect(await ids({ papel: 'vendedor', status: 'ativo' })).toEqual([b.id]);
      expect(await ids({ nomeLoja: null })).toEqual([a.id, c.id]);
      expect(await ids({ id: { in: [a.id, c.id] } })).toEqual([a.id, c.id]);
      expect(await ids({ id: { in: [] } })).toEqual([]);
      expect(await ids({ criadoEm: { gte: '2026-11-02T00:00:00.000Z', lte: '2026-11-02T23:59:59.999Z' } })).toEqual([b.id]);
      expect(await ids({ criadoEm: { gt: '2026-11-01T10:00:00.000Z' } })).toEqual([b.id, c.id]);
      expect(await ids({ status: { ne: 'ativo' } })).toEqual([c.id]);
      expect(await ids({ nomeLoja: { ne: 'Loja B' } })).toEqual([a.id, c.id]); // ne também traz os nulos
      expect(await ids({ nomeLoja: { ne: null } })).toEqual([b.id]);
      expect(await ids({ $ou: [{ nome: 'Ana' }, { nome: 'Carla' }] })).toEqual([a.id, c.id]);
      expect(await ids({ $ou: [] })).toEqual([]);
      expect(await ids({ papel: 'comprador', $ou: [{ nome: 'Ana' }, { nome: 'Bruno' }] })).toEqual([a.id]);
      expect(await ids({ nome: undefined })).toEqual([a.id, b.id, c.id]); // filtro não informado é ignorado
    });

    it('busca com like sem diferenciar maiúsculas', async () => {
      const a = await repo.usuarios.inserir(usuario({ nome: 'Saga do Cometa' }));
      await repo.usuarios.inserir(usuario({ nome: 'Outro Livro' }));
      expect((await repo.usuarios.listar({ nome: { like: '%cometa%' } })).map((u) => u.id)).toEqual([a.id]);
      expect((await repo.usuarios.listar({ nome: { like: 'saga%' } })).map((u) => u.id)).toEqual([a.id]);
      expect(await repo.usuarios.contar({ nome: { like: '%zzz%' } })).toBe(0);
    });

    it('ordena por vários campos, pagina e conta', async () => {
      const mk = (nome: string, papel: any) => repo.usuarios.inserir(usuario({ nome, papel }));
      const [u1, u2, u3, u4] = [await mk('B', 'vendedor'), await mk('A', 'vendedor'), await mk('C', 'comprador'), await mk('D', 'comprador')];
      const l = (o: any) => repo.usuarios.listar(undefined, o).then((r) => r.map((u) => u.id));
      expect(await l({ ordem: [['papel', 'asc'], ['nome', 'desc']] })).toEqual([u4.id, u3.id, u1.id, u2.id]);
      expect(await l({ ordem: [['id', 'desc']], limite: 2 })).toEqual([u4.id, u3.id]);
      expect(await l({ ordem: [['id', 'asc']], limite: 2, deslocamento: 2 })).toEqual([u3.id, u4.id]);
      expect(await l({ ordem: [['id', 'asc']], deslocamento: 3 })).toEqual([u4.id]);
      expect(await repo.usuarios.contar()).toBe(4);
      expect(await repo.usuarios.contar({ papel: 'vendedor' })).toBe(2);
    });

    it('atualiza parcialmente e remove', async () => {
      const u = await repo.usuarios.inserir(usuario({ nome: 'Antes' }));
      const novo = await repo.usuarios.atualizar(u.id, { nome: 'Depois', status: 'bloqueado', motivoRejeicao: 'x' });
      expect(novo).toMatchObject({ id: u.id, nome: 'Depois', status: 'bloqueado', motivoRejeicao: 'x', email: u.email });
      expect((await repo.usuarios.atualizar(u.id, { motivoRejeicao: null })).motivoRejeicao).toBeNull();
      await repo.usuarios.remover(u.id);
      expect(await repo.usuarios.obter(u.id)).toBeNull();
    });

    it('guarda notas com meia estrela como número', async () => {
      const dono = await repo.usuarios.inserir(usuario({ papel: 'vendedor' }));
      const comprador = await repo.usuarios.inserir(usuario());
      const produto = await repo.produtos.inserir({ vendedorId: dono.id, titulo: 'T', descricao: 'D', tipo: 'hq', autor: 'A', editora: 'E', estado: 'novo', precoCentavos: 100, estoque: 1, vendidos: 0, cor: '#112233', status: 'ativo', criadoEm: '2026-11-01T00:00:00.000Z' });
      const base = { codigo: 'MK-1', compradorId: comprador.id, vendedorId: dono.id, status: 'pago' as const, subtotalCentavos: 1, freteCentavos: 0, totalCentavos: 1, comissaoCentavos: 0, liquidoVendedorCentavos: 1, metodoPagamento: 'pix' as const, enderecoNome: 'N', enderecoCep: '60000-000', enderecoRua: 'R', enderecoNumero: '1', enderecoComplemento: null, enderecoBairro: 'B', enderecoCidade: 'C', enderecoUf: 'CE', enderecoTelefone: '85999990000', codigoRastreio: null, criadoEm: '2026-11-01T00:00:00.000Z', pagoEm: '2026-11-01T00:00:00.000Z', enviadoEm: null, prazoEntregaEm: null, entregueEm: null };
      const pedido = await repo.pedidos.inserir(base);
      const av = await repo.avaliacoesProduto.inserir({ produtoId: produto.id, pedidoId: pedido.id, compradorId: comprador.id, nota: 4.5, comentario: null, fotos: ['data:image/jpeg;base64,AAAA', 'data:image/svg+xml;utf8,%3Csvg%3E%C3%A7'], criadoEm: '2026-11-02T00:00:00.000Z' });
      expect(av.fotos).toEqual(['data:image/jpeg;base64,AAAA', 'data:image/svg+xml;utf8,%3Csvg%3E%C3%A7']);
      expect((await repo.avaliacoesProduto.obter(av.id))!.fotos).toHaveLength(2);
      expect(av.nota).toBe(4.5);
      expect(typeof av.nota).toBe('number');
      expect(pedido.pagoEm).toBe('2026-11-01T00:00:00.000Z');
      expect(pedido.enviadoEm).toBeNull();
    });

    it('baixa de estoque é atômica: só baixa se houver quantidade suficiente', async () => {
      const dono = await repo.usuarios.inserir(usuario({ papel: 'vendedor' }));
      const p = await repo.produtos.inserir({ vendedorId: dono.id, titulo: 'T', descricao: 'D', tipo: 'hq', autor: 'A', editora: 'E', estado: 'novo', precoCentavos: 100, estoque: 3, vendidos: 0, cor: '#112233', status: 'ativo', criadoEm: '2026-11-01T00:00:00.000Z' });
      expect(await repo.produtos.baixarEstoque(p.id, 2)).toBe(true);
      expect(await repo.produtos.baixarEstoque(p.id, 2)).toBe(false); // só resta 1
      expect(await repo.produtos.obter(p.id)).toMatchObject({ estoque: 1, vendidos: 2 });
      expect(await repo.produtos.baixarEstoque(p.id, 1)).toBe(true);
      expect(await repo.produtos.obter(p.id)).toMatchObject({ estoque: 0, vendidos: 3 });
      await repo.produtos.devolverEstoque(p.id, 2);
      expect(await repo.produtos.obter(p.id)).toMatchObject({ estoque: 2, vendidos: 1 });
      await repo.produtos.devolverEstoque(p.id, 5); // nunca fica com vendidos negativo
      expect((await repo.produtos.obter(p.id))!.vendidos).toBe(0);
    });

    it('transação: confirma tudo no sucesso e desfaz tudo no erro', async () => {
      await repo.transacao(async (tx) => { await tx.usuarios.inserir(usuario({ nome: 'Fica' })); });
      expect(await repo.usuarios.contar()).toBe(1);
      await expect(
        repo.transacao(async (tx) => {
          await tx.usuarios.inserir(usuario({ nome: 'Some 1' }));
          await tx.usuarios.inserir(usuario({ nome: 'Some 2' }));
          throw new Error('falhou no meio');
        }),
      ).rejects.toThrow('falhou no meio');
      expect((await repo.usuarios.listar()).map((u) => u.nome)).toEqual(['Fica']);
    });

    it('e-mail duplicado é recusado pelo próprio banco', async () => {
      await repo.usuarios.inserir(usuario({ email: 'igual@x.com' }));
      await expect(repo.usuarios.inserir(usuario({ email: 'igual@x.com' }))).rejects.toBeTruthy();
    });
  });
}
