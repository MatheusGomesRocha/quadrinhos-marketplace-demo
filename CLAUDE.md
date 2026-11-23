# CLAUDE.md — Estante Viva · VERSÃO DEMO

> Este repositório contém só a **demo** (sem backend). A versão real (API Node + MySQL) está em https://github.com/MatheusGomesRocha/quadrinhos-marketplace. As seções sobre API/MySQL abaixo valem para aquele repositório.

Projeto de portfólio. Duas versões do MESMO sistema:

- **Demo**: roda 100% no navegador (sem servidor), dados de exemplo no `localStorage`. É o que o contratante testa (GitHub Pages).
- **Real**: API Node + MySQL + o mesmo front React, salvando tudo no banco.

Responda sempre em **português do Brasil**. Trabalhe em etapas pequenas, mostrando só os trechos alterados (não reescreva arquivos inteiros sem pedido). Nada de co-autor/atribuição de Claude em commits e PRs: o dono do repositório é o único contribuidor.

## Stack

Node 22+, TypeScript, MySQL 8, React 18 + Vite + Tailwind 3, Chart.js, Express 4, zod, vitest. Monorepo com npm workspaces.

```
packages/core   @mkt/core  Regras de negócio puras (serviços, tipos, repo em memória, seed, testes de regras)
apps/api        @mkt/api   Express + MySQL (repo SQL, migrações, JWT, seed). HTTP fino.
apps/web        @mkt/web   React. Modo real (HTTP) ou modo demo (serviços no navegador)
```

## Arquitetura (o que precisa estar na cabeça)

1. **Toda regra de negócio mora em `packages/core/src/servicos`.** Cada operação é `(ator, entrada) => resultado`. `ator` = `{id, papel}` ou `null` (visitante). Validação com zod, erros com `ErroNegocio(codigo, mensagem, status)`.
2. **Persistência atrás de uma interface** (`repo.ts`, `Tabela<T>`): `RepoMemoria` (demo e testes) e `RepoSql` (`apps/api/src/db/repo-sql.ts`, MySQL). Os serviços nunca sabem qual está embaixo. Transações via `repo.transacao`.
3. **API**: `POST /api/rpc/:servico/:metodo` chama `servicos[servico][metodo](ator, corpo)`. O `ator` vem do JWT (`Authorization: Bearer`). `auth.login` assina o token.
4. **Front**: `useApi()` devolve um `ClienteApi` tipado. Modo real = Proxy HTTP; modo demo (`vite --mode demo`) = serviços locais + `RepoMemoria` persistido. As telas não sabem a diferença.
5. **Dinheiro em centavos (inteiro)**. Datas ISO UTC (campos terminados em `Em` viram `DATETIME(3)`). Notas de 1 a 5 em passos de 0,5.
6. Banco usa snake_case, código usa camelCase (conversão automática no repo SQL).

## Regras de negócio

- **Papéis**: comprador, vendedor, admin. Bloquear um usuário derruba a sessão na hora (`autenticar` relê o banco).
- **Vendedor** se cadastra como `pendente`; só entra após o admin **aprovar** (ou vê o motivo se for **rejeitado**).
- **Carrinho** limitado ao estoque. Checkout gera **um pedido por vendedor** (código compartilhado), baixa estoque de forma **atômica** (`UPDATE ... WHERE estoque >= ?`) numa transação. Pagamento **simulado** (nasce `pago`).
- **Frete** R$ 15,00 por loja, grátis com subtotal ≥ R$ 150,00. **Comissão** 10% do subtotal. Líquido do vendedor = subtotal − comissão + frete. Constantes em `regras.ts`.
- **Status**: `pago → enviado → entregue`; `cancelado` (devolve estoque); `reclamacao`. Vendedor informa rastreio → começa prazo de **15 dias**.
- **Comprador** marca recebido; só pode **reclamar** com o prazo vencido. Admin resolve: `reembolsar` (cancela) ou `rejeitar` (volta a `enviado` +7 dias).
- **Avaliações** (produto e vendedor) só depois de `entregue`, uma por pedido/produto, nota 1–5 com meia estrela.
- **Financeiro**: dinheiro só é "liberado" ao vendedor quando o pedido é `entregue`; em andamento fica "a receber".
- **Admin**: financeiro geral, aprovação de vendedores, rankings (quem mais vendeu/comprou), histórico, usuários, estoque (baixo ≤ 3), registros de login, reclamações. Login tem freio (5 falhas / 10 min por e-mail).

## Comandos

```bash
npm install
npm test                 # todos os testes (vitest)
npm run typecheck
npm run dev:demo         # demo no navegador (sem backend)
npm run build:demo       # gera apps/web/dist (publicável)

# versão real (precisa de MySQL 8)
cp apps/api/.env.example apps/api/.env   # ajuste DB_* e JWT_SECRET
# crie o banco: CREATE DATABASE marketplace_quadrinhos CHARACTER SET utf8mb4;
npm run migrar           # aplica apps/api/src/db/migracoes/*.sql
npm run seed             # dados de exemplo (só em banco vazio)
npm run dev:api          # http://localhost:3333
npm run dev:web          # http://localhost:5173 (proxy /api -> 3333)
```

Contas do seed (senha `demo123`): `admin@mkt.demo`, `vendedor1..4@mkt.demo` (aprovados), `vendedor5@mkt.demo` (pendente), `comprador1..8@mkt.demo`.

## Testes (como estender)

- `packages/core/src/testes/suite-regras.ts`: `suiteRegras(nome, fabricaRepo)` — as regras de negócio rodam contra QUALQUER repositório. Rodam em memória e em SQL.
- `packages/core/src/testes/contrato-repo.ts`: contrato que toda implementação de repo precisa cumprir.
- `apps/api/src/testes/`: SQL sobre **SQLite em memória** (`node:sqlite`, mesmas migrações traduzidas), API HTTP ponta a ponta, e MySQL real **opcional**: `TEST_MYSQL=1 DB_NAME=banco_de_teste npm test` (⚠ o banco é limpo a cada teste: use um descartável).
- Ao pedir uma regra nova: escreva primeiro o teste em `suite-regras.ts` (usa `criarAmbiente` com relógio falso), depois implemente no serviço.
- O CI (`.github/workflows/ci.yml`) roda typecheck, testes e build da demo.

## Convenções

- Nomes de domínio em português. Serviços finos em HTTP, grossos no core.
- Mudou o schema? Nova migração `NNN_nome.sql` (nunca edite uma já aplicada), no subconjunto de SQL comum a MySQL e SQLite (a tradução de teste está em `testes/sqlite.ts`).
- Capas dos produtos são geradas por cor (sem imagens/títulos protegidos). Títulos e lojas do seed são fictícios.
- Armadilha: filtros `undefined` em `where` são ignorados (de propósito).

## Limitações conhecidas / próximos passos

- Pagamento simulado; sem upload de imagem; sem e-mail de notificação; sem recuperação de senha.
- A camada MySQL é validada via SQLite + contrato; rode os testes com `TEST_MYSQL=1` no seu ambiente para validar no MySQL de verdade.

- Campos `telefone`/`enderecoTelefone` guardam só dígitos; `fotos` das avaliações é JSON em TEXT (migração 002 na versão real; limite de body 2mb). Listas usam scroll infinito (`useInfinita`).
