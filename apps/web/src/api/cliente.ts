import type { ClienteApi } from '@mkt/core';

export class ErroApi extends Error {
  constructor(public codigo: string, mensagem: string, public status: number, public detalhes?: unknown) { super(mensagem); }
}

export const MODO_DEMO = import.meta.env.MODE === 'demo';
export const CHAVE_TOKEN = 'mkt:token';

/** Cliente HTTP: `api.servico.metodo(entrada)` vira `POST /api/rpc/servico/metodo`. */
export function criarClienteHttp(base = import.meta.env.VITE_API_URL ?? ''): ClienteApi {
  const chamar = async (servico: string, metodo: string, entrada: unknown) => {
    const token = localStorage.getItem(CHAVE_TOKEN);
    let r: Response;
    try {
      r = await fetch(`${base}/api/rpc/${servico}/${metodo}`, {
        method: 'POST',
        headers: { 'content-type': 'application/json', ...(token ? { authorization: `Bearer ${token}` } : {}) },
        body: JSON.stringify(entrada ?? {}),
      });
    } catch {
      throw new ErroApi('SEM_CONEXAO', 'Não foi possível falar com o servidor.', 0);
    }
    const json = await r.json().catch(() => ({}));
    if (!r.ok) throw new ErroApi(json?.erro?.codigo ?? 'ERRO', json?.erro?.mensagem ?? 'Erro inesperado.', r.status, json?.erro?.detalhes);
    if (servico === 'auth' && metodo === 'login') localStorage.setItem(CHAVE_TOKEN, json.dados.token);
    return json.dados;
  };
  return new Proxy({}, { get: (_, servico: string) => new Proxy({}, { get: (_2, metodo: string) => (entrada?: unknown) => chamar(servico, metodo, entrada) }) }) as ClienteApi;
}
