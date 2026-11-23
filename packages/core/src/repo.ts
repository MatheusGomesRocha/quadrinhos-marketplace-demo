import type {
  AvaliacaoProduto, AvaliacaoVendedor, CarrinhoItem, Conversa, Mensagem, Pedido, PedidoItem, Produto,
  Reclamacao, RegistroLogin, Usuario,
} from './tipos';

/**
 * Contrato de persistência. Há duas implementações com o MESMO comportamento:
 *  - RepoMemoria (aqui no core): usada pela demo (localStorage) e pelos testes rápidos;
 *  - RepoSql (apps/api): MySQL de verdade.
 * Os testes de contrato (testes/contrato.ts) garantem que as duas se comportam igual.
 */

export type Operadores<V> = { in?: V[]; like?: string; gt?: V; gte?: V; lt?: V; lte?: V; ne?: V | null };
export type Where<T> = { [K in keyof T]?: T[K] | null | Operadores<T[K]> } & { $ou?: Where<T>[] };

export interface OpcoesListagem<T> {
  ordem?: [keyof T, 'asc' | 'desc'][];
  limite?: number;
  deslocamento?: number;
}

export interface Tabela<T extends { id: number }> {
  inserir(dados: Omit<T, 'id'>): Promise<T>;
  obter(id: number): Promise<T | null>;
  listar(where?: Where<T>, opcoes?: OpcoesListagem<T>): Promise<T[]>;
  contar(where?: Where<T>): Promise<number>;
  atualizar(id: number, parcial: Partial<Omit<T, 'id'>>): Promise<T>;
  remover(id: number): Promise<void>;
}

export interface TabelaProdutos extends Tabela<Produto> {
  /** Baixa o estoque de forma ATÔMICA (só se houver quantidade suficiente) e soma em `vendidos`. */
  baixarEstoque(id: number, quantidade: number): Promise<boolean>;
  /** Devolve o estoque (cancelamento) e desconta de `vendidos`. */
  devolverEstoque(id: number, quantidade: number): Promise<void>;
}

export interface Repo {
  usuarios: Tabela<Usuario>;
  produtos: TabelaProdutos;
  carrinhoItens: Tabela<CarrinhoItem>;
  pedidos: Tabela<Pedido>;
  pedidoItens: Tabela<PedidoItem>;
  conversas: Tabela<Conversa>;
  mensagens: Tabela<Mensagem>;
  avaliacoesProduto: Tabela<AvaliacaoProduto>;
  avaliacoesVendedor: Tabela<AvaliacaoVendedor>;
  reclamacoes: Tabela<Reclamacao>;
  registrosLogin: Tabela<RegistroLogin>;
  /** Executa tudo ou nada. Se `fn` lançar erro, nada do que foi feito dentro dela persiste. */
  transacao<R>(fn: (repo: Repo) => Promise<R>): Promise<R>;
}

export const NOMES_TABELAS = [
  'usuarios', 'produtos', 'carrinhoItens', 'pedidos', 'pedidoItens', 'conversas', 'mensagens',
  'avaliacoesProduto', 'avaliacoesVendedor', 'reclamacoes', 'registrosLogin',
] as const;
