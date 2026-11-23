import { criarAdmin } from './admin';
import { criarAuth } from './auth';
import { criarAvaliacoes } from './avaliacoes';
import { criarCarrinho } from './carrinho';
import { criarCatalogo } from './catalogo';
import { criarMensagens } from './mensagens';
import { criarPainelVendedor } from './painel';
import { criarPedidos } from './pedidos';
import { criarProdutos } from './produtos';
import { criarReclamacoes } from './reclamacoes';
import type { Contexto } from './base';

/**
 * Todas as operações do sistema. Cada uma recebe (ator, entrada): quem chama e os dados.
 * A API HTTP e a demo (navegador) chamam exatamente estas funções: por isso as regras são as mesmas nas duas versões.
 */
export function criarServicos(ctx: Contexto) {
  return {
    auth: criarAuth(ctx),
    catalogo: criarCatalogo(ctx),
    produtos: criarProdutos(ctx),
    carrinho: criarCarrinho(ctx),
    pedidos: criarPedidos(ctx),
    reclamacoes: criarReclamacoes(ctx),
    avaliacoes: criarAvaliacoes(ctx),
    mensagens: criarMensagens(ctx),
    painelVendedor: criarPainelVendedor(ctx),
    admin: criarAdmin(ctx),
  };
}

export type Servicos = ReturnType<typeof criarServicos>;

/** Versão "do ponto de vista do cliente": sem o parâmetro `ator` (a sessão cuida disso). */
type SemAtor<F> = F extends (ator: any, entrada: infer E) => infer R
  ? undefined extends E ? (entrada?: E) => R : (entrada: E) => R
  : never;
export type ClienteApi = { [S in keyof Servicos]: { [M in keyof Servicos[S]]: SemAtor<Servicos[S][M]> } };
