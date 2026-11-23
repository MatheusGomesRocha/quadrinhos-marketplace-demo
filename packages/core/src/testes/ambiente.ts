import { RepoMemoria } from '../memoria';
import type { Repo } from '../repo';
import { criarServicos } from '../servicos';
import type { Cripto } from '../servicos/base';
import type { Ator, Usuario } from '../tipos';

/** Cripto de mentirinha (rápida) só para os testes. Em produção: bcrypt. */
export const criptoFalsa: Cripto = {
  hash: async (s) => `h:${s}`,
  compara: async (s, h) => h === `h:${s}`,
};

export const ENDERECO = { nome: 'Maria Souza', cep: '60000-000', rua: 'Rua das Flores', numero: '100', bairro: 'Centro', cidade: 'Fortaleza', uf: 'CE' };

export interface Ambiente {
  repo: Repo;
  s: ReturnType<typeof criarServicos>;
  /** Avança o relógio fake. */
  avancarDias(dias: number): void;
  agora(): Date;
  admin: Ator;
  novoVendedor(nome?: string): Promise<Ator>;
  novoComprador(nome?: string): Promise<Ator>;
  novoProduto(vendedor: Ator, extra?: Partial<{ titulo: string; precoCentavos: number; estoque: number }>): Promise<number>;
  /** Compra uma unidade de cada produto informado e devolve os ids dos pedidos. */
  comprar(comprador: Ator, itens: { produtoId: number; quantidade?: number }[]): Promise<number[]>;
}

export async function criarAmbiente(repo: Repo = new RepoMemoria(), inicio = '2026-11-01T12:00:00.000Z'): Promise<Ambiente> {
  let t = new Date(inicio).getTime();
  const agora = () => new Date(t);
  const s = criarServicos({ repo, cripto: criptoFalsa, agora });
  let n = 0;

  const adminRow = await repo.usuarios.inserir({
    nome: 'Admin', email: 'admin@teste.com', senhaHash: 'h:senha123', papel: 'admin', status: 'ativo',
    nomeLoja: null, documento: null, telefone: null, descricaoLoja: null, motivoRejeicao: null, criadoEm: agora().toISOString(),
  } as Omit<Usuario, 'id'>);
  const admin: Ator = { id: adminRow.id, papel: 'admin' };

  const ambiente: Ambiente = {
    repo, s, admin, agora,
    avancarDias: (d) => { t += d * 86_400_000; },
    async novoVendedor(nome = `Loja ${++n}`) {
      const u = await s.auth.solicitarCadastroVendedor(null, {
        nome: 'Dono ' + nome, email: `v${++n}@teste.com`, senha: 'senha123', nomeLoja: nome, documento: '12345678901', telefone: '85999990000', descricaoLoja: 'Loja de quadrinhos de teste',
      });
      await s.admin.aprovarVendedor(admin, { id: u.id });
      return { id: u.id, papel: 'vendedor' };
    },
    async novoComprador(nome = 'Maria Souza') {
      const u = await s.auth.cadastrarComprador(null, { nome, email: `c${++n}@teste.com`, senha: 'senha123' });
      return { id: u.id, papel: 'comprador' };
    },
    async novoProduto(vendedor, extra = {}) {
      const p = await s.produtos.cadastrar(vendedor, {
        titulo: extra.titulo ?? `Gibi de Teste ${++n}`, descricao: 'Descrição longa o bastante para validar.', tipo: 'hq', autor: 'Autora Fictícia',
        editora: 'Editora Fictícia', estado: 'novo', precoCentavos: extra.precoCentavos ?? 5000, estoque: extra.estoque ?? 10,
      });
      return p.id;
    },
    async comprar(comprador, itens) {
      for (const i of itens) await s.carrinho.adicionar(comprador, { produtoId: i.produtoId, quantidade: i.quantidade ?? 1 });
      const r = await s.pedidos.finalizarCompra(comprador, { endereco: ENDERECO, metodoPagamento: 'pix' });
      return r.pedidos.map((p) => p.id);
    },
  };
  return ambiente;
}
