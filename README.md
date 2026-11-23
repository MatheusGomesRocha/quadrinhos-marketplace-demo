# Estante Viva — marketplace de quadrinhos, mangás e livros (versão demo)

Demonstração de um marketplace com **comprador, vendedor e administrador**, feita em **TypeScript + React**. Esta versão **roda inteira no navegador**: não há servidor nem banco. Os dados ficam no `localStorage` e podem ser restaurados pelo botão "Restaurar dados" no topo da página.

A **versão real** (API Node + MySQL, com os mesmos serviços e as mesmas regras) está em: https://github.com/MatheusGomesRocha/quadrinhos-marketplace

## Como testar

Entre com qualquer conta abaixo. Senha de todas: `demo123`.

| Perfil | E-mail | O que ver |
| --- | --- | --- |
| Comprador | `comprador1@mkt.demo` | Catálogo, carrinho, pedidos, chat, avaliações, reclamação |
| Vendedor | `vendedor1@mkt.demo` | Painel financeiro, produtos, pedidos recebidos, envio |
| Administrador | `admin@mkt.demo` | Financeiro geral, aprovação de vendedores, rankings, estoque, logins |
| Vendedor pendente | `vendedor5@mkt.demo` | Tela de cadastro em análise (o admin aprova na aba Vendedores) |

Sugestão de roteiro: compre um livro como comprador → entre como o vendedor da loja e informe o envio → volte como comprador, marque como recebido e avalie → veja o efeito no painel do vendedor e do admin.

## Como foi construído (para quem avalia o código)

```
packages/core   Regras de negócio em TypeScript puro (serviços, validação com zod, repositório em memória, seed)
apps/web        React + Vite + Tailwind + Chart.js
```

- **Regras isoladas da interface.** Cada operação é uma função `(ator, entrada) => resultado` em `packages/core/src/servicos`. A tela só chama essas funções; na demo, elas rodam no navegador, na versão real rodam no servidor Node, sem mudar uma linha.
- **Persistência atrás de uma interface** (`Tabela<T>`): aqui, um repositório em memória salvo no `localStorage`; na versão real, o mesmo contrato implementado em MySQL.
- **Dinheiro em centavos**, estoque com baixa atômica, transação no checkout (um pedido por vendedor), frete e comissão calculados por regras testadas.
- **Testes automatizados** (`npm test`, vitest): regras de cadastro/aprovação, carrinho limitado ao estoque, checkout, prazos, reclamação, avaliações com meia estrela, financeiro, bloqueio de usuário e freio de login.
- **CI e publicação:** GitHub Actions roda tipos, testes e build, e publica no GitHub Pages.

Regras detalhadas e arquitetura: [CLAUDE.md](./CLAUDE.md).

## Rodar localmente

```bash
npm install
npm test
npm run dev:demo
```

Projeto de portfólio: pagamento simulado, títulos e lojas fictícios.

## Recursos de interface

- **Máscaras** de telefone, CEP, CPF/CNPJ e moeda (`apps/web/src/utils/mascaras.ts`); o core guarda só dígitos e valida.
- **CEP automático**: ao completar 8 dígitos, consulta a [ViaCEP](https://viacep.com.br) e preenche rua, bairro, cidade e UF (precisa de internet; se falhar, o formulário continua manual).
- **Fotos fictícias** dos produtos geradas em código (`packages/core/src/arte.ts`, SVG determinístico pelo título, sem imagens protegidas).
- **Avaliações com fotos** (até 3, redimensionadas no navegador); o seed já traz exemplos.
- **Scroll infinito** nas listas (`useInfinita` + `Sentinela`, IntersectionObserver).
