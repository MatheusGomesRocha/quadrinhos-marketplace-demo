import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { HashRouter } from 'react-router-dom';
import type { ClienteApi } from '@mkt/core';
import { App } from './App';
import { criarClienteHttp, MODO_DEMO } from './api/cliente';
import { criarClienteDemo } from './api/demo';
import { ProvedorSessao } from './sessao';
import './index.css';

const raiz = createRoot(document.getElementById('raiz')!);
raiz.render(<p className="p-8 text-stone-500">Carregando…</p>);

async function iniciar() {
  let api: ClienteApi;
  let restaurar: (() => Promise<void>) | undefined;
  if (MODO_DEMO) ({ api, restaurar } = await criarClienteDemo());
  else api = criarClienteHttp();
  raiz.render(
    <StrictMode>
      <HashRouter>
        <ProvedorSessao api={api} restaurarDemo={restaurar}>
          <App />
        </ProvedorSessao>
      </HashRouter>
    </StrictMode>,
  );
}
void iniciar();
