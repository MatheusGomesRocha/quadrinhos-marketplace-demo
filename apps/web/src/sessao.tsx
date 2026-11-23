import { createContext, useCallback, useContext, useEffect, useMemo, useState, type ReactNode } from 'react';
import type { ClienteApi, UsuarioPublico } from '@mkt/core';
import { CHAVE_TOKEN, MODO_DEMO } from './api/cliente';

interface Ctx {
  api: ClienteApi;
  usuario: UsuarioPublico | null;
  carregando: boolean;
  demo: boolean;
  restaurarDemo?: () => Promise<void>;
  entrar: (email: string, senha: string) => Promise<UsuarioPublico>;
  sair: () => void;
  /** Contadores do cabeçalho (carrinho e mensagens), atualizados por `atualizarContadores`. */
  contadores: { carrinho: number; mensagens: number };
  atualizarContadores: () => void;
}

const SessaoCtx = createContext<Ctx | null>(null);
export const useSessao = () => useContext(SessaoCtx)!;
export const useApi = () => useSessao().api;

export function ProvedorSessao({ api, restaurarDemo, children }: { api: ClienteApi; restaurarDemo?: () => Promise<void>; children: ReactNode }) {
  const [usuario, setUsuario] = useState<UsuarioPublico | null>(null);
  const [carregando, setCarregando] = useState(true);
  const [contadores, setContadores] = useState({ carrinho: 0, mensagens: 0 });

  const atualizarContadores = useCallback(() => {
    api.auth.eu().then(async (u) => {
      const [carrinho, mensagens] = await Promise.all([
        u.papel === 'comprador' ? api.carrinho.contar() : Promise.resolve(0),
        u.papel === 'admin' ? Promise.resolve(0) : api.mensagens.naoLidas(),
      ]);
      setContadores({ carrinho: Number(carrinho) || 0, mensagens: Number(mensagens) || 0 });
    }).catch(() => setContadores({ carrinho: 0, mensagens: 0 }));
  }, [api]);

  useEffect(() => {
    api.auth.eu().then(setUsuario).catch(() => setUsuario(null)).finally(() => setCarregando(false));
  }, [api]);
  useEffect(() => { if (usuario) atualizarContadores(); else setContadores({ carrinho: 0, mensagens: 0 }); }, [usuario, atualizarContadores]);

  const valor = useMemo<Ctx>(() => ({
    api, usuario, carregando, demo: MODO_DEMO, restaurarDemo, contadores, atualizarContadores,
    entrar: async (email, senha) => { const r = await api.auth.login({ email, senha }); setUsuario(r.usuario); return r.usuario; },
    sair: () => { localStorage.removeItem(CHAVE_TOKEN); localStorage.removeItem('mkt-demo:ator'); setUsuario(null); },
  }), [api, usuario, carregando, restaurarDemo, contadores, atualizarContadores]);

  return <SessaoCtx.Provider value={valor}>{children}</SessaoCtx.Provider>;
}
