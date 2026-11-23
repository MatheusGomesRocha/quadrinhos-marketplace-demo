import bcrypt from 'bcryptjs';
import { criarServicos, ErroNegocio, popularExemplo, RepoMemoria, type Ator, type ClienteApi, type Cripto } from '@mkt/core';
import { ErroApi } from './cliente';

const CHAVE_DADOS = 'mkt-demo:v2';
const CHAVE_ATOR = 'mkt-demo:ator';

// Custo baixo: na demo o hash roda no navegador e o seed cria ~20 contas.
const cripto: Cripto = { hash: (s) => bcrypt.hash(s, 4), compara: (s, h) => bcrypt.compare(s, h) };

/**
 * Cliente da DEMO: chama os MESMOS serviços da API, mas dentro do navegador, com os dados em memória
 * (persistidos no localStorage). Não existe servidor, nem banco.
 */
export async function criarClienteDemo(): Promise<{ api: ClienteApi; restaurar: () => Promise<void> }> {
  const repo = new RepoMemoria();
  const salvo = localStorage.getItem(CHAVE_DADOS);
  let carregou = false;
  if (salvo) {
    try { repo.importar(JSON.parse(salvo)); carregou = true; } catch { /* dados corrompidos: recria abaixo */ }
  }
  const semear = async () => { await popularExemplo(repo, cripto); localStorage.setItem(CHAVE_DADOS, JSON.stringify(repo.exportar())); };
  if (!carregou) await semear();

  const servicos = criarServicos({ repo, cripto, agora: () => new Date() });
  const atorAtual = (): Ator | null => { try { return JSON.parse(localStorage.getItem(CHAVE_ATOR) ?? 'null'); } catch { return null; } };

  const chamar = async (servico: string, metodo: string, entrada: unknown) => {
    const fn = (servicos as any)[servico]?.[metodo] as (a: Ator | null, e: unknown) => Promise<any>;
    try {
      const r = await fn(atorAtual(), entrada ?? {});
      if (servico === 'auth' && metodo === 'login') localStorage.setItem(CHAVE_ATOR, JSON.stringify({ id: r.usuario.id, papel: r.usuario.papel }));
      localStorage.setItem(CHAVE_DADOS, JSON.stringify(repo.exportar()));
      return structuredClone(r);
    } catch (e) {
      if (e instanceof ErroNegocio) throw new ErroApi(e.codigo, e.message, e.status, e.detalhes);
      throw e;
    }
  };
  const api = new Proxy({}, { get: (_, s: string) => new Proxy({}, { get: (_2, m: string) => (e?: unknown) => chamar(s, m, e) }) }) as ClienteApi;
  const restaurar = async () => {
    localStorage.removeItem(CHAVE_DADOS); localStorage.removeItem(CHAVE_ATOR); localStorage.removeItem('mkt:usuario');
    location.reload();
  };
  return { api, restaurar };
}
