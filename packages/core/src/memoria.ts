import type { OpcoesListagem, Repo, Tabela, TabelaProdutos, Where } from './repo';
import { NOMES_TABELAS } from './repo';
import type {
  AvaliacaoProduto, AvaliacaoVendedor, CarrinhoItem, Conversa, Mensagem, Pedido, PedidoItem, Produto,
  Reclamacao, RegistroLogin, Usuario,
} from './tipos';

const semAcento = (s: string) => s.normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase();

function casaLike(valor: unknown, padrao: string): boolean {
  if (valor == null) return false;
  const re = semAcento(padrao)
    .replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
    .replace(/%/g, '.*')
    .replace(/_/g, '.');
  return new RegExp(`^${re}$`).test(semAcento(String(valor)));
}

const ehOperador = (v: unknown): v is Record<string, unknown> =>
  typeof v === 'object' && v !== null && !Array.isArray(v);

function casa<T>(linha: T, where: Where<T> | undefined): boolean {
  if (!where) return true;
  for (const [chave, esperado] of Object.entries(where)) {
    if (chave === '$ou') {
      if (!(esperado as Where<T>[]).some((w) => casa(linha, w))) return false;
      continue;
    }
    if (esperado === undefined) continue; // filtro opcional não informado
    const valor = (linha as Record<string, unknown>)[chave] as any;
    if (!ehOperador(esperado)) {
      if (esperado === null ? valor != null : valor !== esperado) return false;
      continue;
    }
    const op = esperado as Record<string, any>;
    if (op.in !== undefined && !op.in.includes(valor)) return false;
    if (op.like !== undefined && !casaLike(valor, op.like)) return false;
    if (op.gt !== undefined && !(valor > op.gt)) return false;
    if (op.gte !== undefined && !(valor >= op.gte)) return false;
    if (op.lt !== undefined && !(valor < op.lt)) return false;
    if (op.lte !== undefined && !(valor <= op.lte)) return false;
    if (op.ne !== undefined && (op.ne === null ? valor == null : valor === op.ne)) return false;
  }
  return true;
}

const comparar = (a: unknown, b: unknown): number => {
  if (a === b) return 0;
  if (a == null) return -1;
  if (b == null) return 1;
  return (a as any) < (b as any) ? -1 : 1;
};

class TabelaMemoria<T extends { id: number }> implements Tabela<T> {
  linhas: T[] = [];
  proximoId = 1;
  /** Restrições UNIQUE do banco (listas de campos), reproduzidas aqui para o comportamento ser o mesmo. */
  constructor(private unicos: (keyof T)[][] = []) {}

  private violaUnico(candidata: Partial<T>, ignorarId?: number): boolean {
    return this.unicos.some((campos) =>
      this.linhas.some((l) => l.id !== ignorarId && campos.every((c) => l[c] === candidata[c])),
    );
  }

  async inserir(dados: Omit<T, 'id'>): Promise<T> {
    if (this.violaUnico(dados as Partial<T>)) throw new Error('UNIQUE constraint failed');
    const linha = { ...dados, id: this.proximoId++ } as T;
    this.linhas.push(linha);
    return { ...linha };
  }
  async obter(id: number): Promise<T | null> {
    const l = this.linhas.find((x) => x.id === id);
    return l ? { ...l } : null;
  }
  async listar(where?: Where<T>, opcoes: OpcoesListagem<T> = {}): Promise<T[]> {
    let r = this.linhas.filter((l) => casa(l, where));
    const ordem = opcoes.ordem ?? [['id' as keyof T, 'asc']];
    r = [...r].sort((a, b) => {
      for (const [campo, dir] of ordem) {
        const c = comparar(a[campo], b[campo]);
        if (c !== 0) return dir === 'asc' ? c : -c;
      }
      return 0;
    });
    const ini = opcoes.deslocamento ?? 0;
    r = opcoes.limite !== undefined ? r.slice(ini, ini + opcoes.limite) : r.slice(ini);
    return r.map((l) => ({ ...l }));
  }
  async contar(where?: Where<T>): Promise<number> {
    return this.linhas.filter((l) => casa(l, where)).length;
  }
  async atualizar(id: number, parcial: Partial<Omit<T, 'id'>>): Promise<T> {
    const l = this.linhas.find((x) => x.id === id);
    if (!l) throw new Error(`Registro ${id} não encontrado`);
    if (this.violaUnico({ ...l, ...parcial } as Partial<T>, id)) throw new Error('UNIQUE constraint failed');
    Object.assign(l, parcial);
    return { ...l };
  }
  async remover(id: number): Promise<void> {
    this.linhas = this.linhas.filter((l) => l.id !== id);
  }
}

class TabelaProdutosMemoria extends TabelaMemoria<Produto> implements TabelaProdutos {
  async baixarEstoque(id: number, quantidade: number): Promise<boolean> {
    const p = this.linhas.find((x) => x.id === id);
    if (!p || p.estoque < quantidade) return false;
    p.estoque -= quantidade;
    p.vendidos += quantidade;
    return true;
  }
  async devolverEstoque(id: number, quantidade: number): Promise<void> {
    const p = this.linhas.find((x) => x.id === id);
    if (!p) return;
    p.estoque += quantidade;
    p.vendidos = Math.max(0, p.vendidos - quantidade);
  }
}

export type EstadoMemoria = Record<string, { linhas: unknown[]; proximoId: number }>;

export class RepoMemoria implements Repo {
  usuarios = new TabelaMemoria<Usuario>([['email']]);
  produtos = new TabelaProdutosMemoria();
  carrinhoItens = new TabelaMemoria<CarrinhoItem>([['compradorId', 'produtoId']]);
  pedidos = new TabelaMemoria<Pedido>();
  pedidoItens = new TabelaMemoria<PedidoItem>();
  conversas = new TabelaMemoria<Conversa>([['compradorId', 'vendedorId']]);
  mensagens = new TabelaMemoria<Mensagem>();
  avaliacoesProduto = new TabelaMemoria<AvaliacaoProduto>([['pedidoId', 'produtoId']]);
  avaliacoesVendedor = new TabelaMemoria<AvaliacaoVendedor>([['pedidoId']]);
  reclamacoes = new TabelaMemoria<Reclamacao>();
  registrosLogin = new TabelaMemoria<RegistroLogin>();

  /** Tudo ou nada: tira uma foto do estado e a restaura se `fn` falhar. */
  async transacao<R>(fn: (repo: Repo) => Promise<R>): Promise<R> {
    const foto = this.exportar();
    try {
      return await fn(this);
    } catch (e) {
      this.importar(foto);
      throw e;
    }
  }

  exportar(): EstadoMemoria {
    const out: EstadoMemoria = {};
    for (const nome of NOMES_TABELAS) {
      const t = this[nome] as unknown as TabelaMemoria<{ id: number }>;
      out[nome] = { linhas: JSON.parse(JSON.stringify(t.linhas)), proximoId: t.proximoId };
    }
    return out;
  }

  importar(estado: EstadoMemoria): void {
    for (const nome of NOMES_TABELAS) {
      const t = this[nome] as unknown as TabelaMemoria<{ id: number }>;
      const e = estado[nome];
      t.linhas = e ? JSON.parse(JSON.stringify(e.linhas)) : [];
      t.proximoId = e ? e.proximoId : 1;
    }
  }
}
