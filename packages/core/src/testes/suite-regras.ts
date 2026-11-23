import { describe, expect, it, beforeEach } from 'vitest';
import { ErroNegocio } from '../erros';
import type { Repo } from '../repo';
import { criarAmbiente, ENDERECO, type Ambiente } from './ambiente';

/** Falha se a promessa NÃO rejeitar com o código de erro esperado. */
async function erro(p: Promise<unknown>, codigo: string) {
  try {
    await p;
  } catch (e) {
    expect(e).toBeInstanceOf(ErroNegocio);
    expect((e as ErroNegocio).codigo).toBe(codigo);
    return e as ErroNegocio;
  }
  throw new Error(`Esperava o erro ${codigo}, mas a operação foi concluída.`);
}

/**
 * Suíte das regras de negócio. Roda contra QUALQUER implementação de repositório:
 * memória (core), SQLite (api, valida o SQL) e MySQL (quando houver banco de teste).
 */
export function suiteRegras(nome: string, fabricaRepo: () => Promise<Repo>) {
  describe(`Regras de negócio (${nome})`, () => {
    let a: Ambiente;
    beforeEach(async () => { a = await criarAmbiente(await fabricaRepo()); });

    describe('cadastro, login e aprovação de vendedor', () => {
      it('comprador se cadastra e consegue entrar; e-mail repetido é recusado', async () => {
        await a.s.auth.cadastrarComprador(null, { nome: 'Ana Lima', email: 'ana@teste.com', senha: 'senha123' });
        const r = await a.s.auth.login(null, { email: 'ANA@teste.com', senha: 'senha123' });
        expect(r.usuario.papel).toBe('comprador');
        expect(r.usuario).not.toHaveProperty('senhaHash');
        await erro(a.s.auth.cadastrarComprador(null, { nome: 'Outra Ana', email: 'ana@teste.com', senha: 'senha123' }), 'EMAIL_EM_USO');
      });

      it('valida os dados do cadastro em português', async () => {
        const e = await erro(a.s.auth.cadastrarComprador(null, { nome: 'A', email: 'invalido', senha: '123' }), 'VALIDACAO');
        expect(e.message).toMatch(/nome: Mínimo de 2 caracteres/);
      });

      it('telefone e documento aceitam máscara e são guardados só com dígitos; valores inválidos são recusados', async () => {
        const v = await a.s.auth.solicitarCadastroVendedor(null, { nome: 'Rita', email: 'rita@loja.com', senha: 'senha123', nomeLoja: 'Loja da Rita', documento: '123.456.789-01', telefone: '(85) 99999-0000', descricaoLoja: 'Vendo mangás novos' });
        expect(v.documento).toBe('12345678901');
        expect(v.telefone).toBe('85999990000');
        const base = { nome: 'Rita', senha: 'senha123', nomeLoja: 'Loja', descricaoLoja: 'Vendo mangás novos' };
        await erro(a.s.auth.solicitarCadastroVendedor(null, { ...base, email: 'a@a.com', documento: '123', telefone: '85999990000' }), 'VALIDACAO');
        await erro(a.s.auth.solicitarCadastroVendedor(null, { ...base, email: 'b@a.com', documento: '12345678901', telefone: '999' }), 'VALIDACAO');
        const c = await a.s.auth.cadastrarComprador(null, { nome: 'Caio', email: 'caio@x.com', senha: 'senha123', telefone: '(11) 98888-7777' });
        expect(c.telefone).toBe('11988887777');
        expect((await a.s.auth.cadastrarComprador(null, { nome: 'Sem Fone', email: 'sf@x.com', senha: 'senha123' })).telefone).toBeNull();
      });

      it('vendedor fica pendente: não entra até o admin aprovar', async () => {
        const v = await a.s.auth.solicitarCadastroVendedor(null, { nome: 'João', email: 'joao@loja.com', senha: 'senha123', nomeLoja: 'Gibis do João', documento: '12345678901', telefone: '85999990000', descricaoLoja: 'Vendo gibis usados' });
        expect(v.status).toBe('pendente');
        await erro(a.s.auth.login(null, { email: 'joao@loja.com', senha: 'senha123' }), 'CADASTRO_PENDENTE');
        await a.s.admin.aprovarVendedor(a.admin, { id: v.id });
        const r = await a.s.auth.login(null, { email: 'joao@loja.com', senha: 'senha123' });
        expect(r.usuario.status).toBe('ativo');
      });

      it('vendedor rejeitado vê o motivo e não consegue entrar', async () => {
        const v = await a.s.auth.solicitarCadastroVendedor(null, { nome: 'Zé', email: 'ze@loja.com', senha: 'senha123', nomeLoja: 'Loja do Zé', documento: '12345678901', telefone: '85999990000', descricaoLoja: 'Vendo coisas variadas' });
        await a.s.admin.rejeitarVendedor(a.admin, { id: v.id, motivo: 'Documento ilegível' });
        const e = await erro(a.s.auth.login(null, { email: 'ze@loja.com', senha: 'senha123' }), 'CADASTRO_REJEITADO');
        expect(e.message).toContain('Documento ilegível');
      });

      it('só o admin acessa a fila de aprovação', async () => {
        const c = await a.novoComprador();
        await erro(a.s.admin.vendedores(c, {}), 'PROIBIDO');
        await erro(a.s.admin.vendedores(null, {}), 'NAO_AUTENTICADO');
      });

      it('registra todos os logins (sucesso e falha) e freia força bruta', async () => {
        await a.s.auth.cadastrarComprador(null, { nome: 'Bia', email: 'bia@teste.com', senha: 'senha123' });
        for (let i = 0; i < 5; i++) await erro(a.s.auth.login(null, { email: 'bia@teste.com', senha: 'errada', ip: '1.2.3.4' }), 'CREDENCIAIS');
        await erro(a.s.auth.login(null, { email: 'bia@teste.com', senha: 'senha123' }), 'MUITAS_TENTATIVAS');
        const logs = await a.s.admin.registrosLogin(a.admin, { q: 'bia@' });
        expect(logs.total).toBe(6);
        expect(logs.itens.every((l) => l.sucesso === 0)).toBe(true);
        expect(logs.itens.some((l) => l.ip === '1.2.3.4')).toBe(true);
        // depois da janela de espera, volta a funcionar
        a.avancarDias(1);
        const ok = await a.s.auth.login(null, { email: 'bia@teste.com', senha: 'senha123' });
        expect(ok.usuario.email).toBe('bia@teste.com');
      });

      it('bloquear um usuário derruba a sessão dele na hora', async () => {
        const c = await a.novoComprador();
        await a.s.carrinho.ver(c);
        await a.s.admin.bloquear(a.admin, { id: c.id });
        await erro(a.s.carrinho.ver(c), 'NAO_AUTENTICADO');
        await erro(a.s.auth.login(null, { email: (await a.repo.usuarios.obter(c.id))!.email, senha: 'senha123' }), 'CONTA_BLOQUEADA');
        await a.s.admin.desbloquear(a.admin, { id: c.id });
        await a.s.carrinho.ver(c);
      });

      it('não permite bloquear administrador', async () => {
        await erro(a.s.admin.bloquear(a.admin, { id: a.admin.id }), 'PROIBIDO');
      });
    });

    describe('catálogo e cadastro de produtos', () => {
      it('só aparecem produtos ativos, com estoque, de vendedores aprovados', async () => {
        const v = await a.novoVendedor();
        const visivel = await a.novoProduto(v, { titulo: 'Visível' });
        await a.novoProduto(v, { titulo: 'Esgotado', estoque: 0 });
        const inativo = await a.novoProduto(v, { titulo: 'Inativo' });
        await a.s.produtos.alterarStatus(v, { id: inativo, status: 'inativo' });
        const pendente = await a.s.auth.solicitarCadastroVendedor(null, { nome: 'Pedro', email: 'p@x.com', senha: 'senha123', nomeLoja: 'Pendente', documento: '12345678901', telefone: '85999990000', descricaoLoja: 'Loja em análise ainda' });
        expect(pendente.status).toBe('pendente');

        const r = await a.s.catalogo.listar(null, {});
        expect(r.itens.map((p) => p.titulo)).toEqual(['Visível']);
        await erro(a.s.catalogo.detalhe(null, { id: inativo }), 'NAO_ENCONTRADO');
        expect((await a.s.catalogo.detalhe(null, { id: visivel })).produto.titulo).toBe('Visível');
        // o dono ainda enxerga o próprio produto inativo
        expect((await a.s.catalogo.detalhe(v, { id: inativo })).produto.id).toBe(inativo);
      });

      it('filtra por tipo, estado, faixa de preço, busca e ordena', async () => {
        const v = await a.novoVendedor();
        const mk = (titulo: string, tipo: any, estado: any, preco: number) =>
          a.s.produtos.cadastrar(v, { titulo, descricao: 'Descrição longa o bastante.', tipo, autor: 'Autor Um', editora: 'Editora Um', estado, precoCentavos: preco, estoque: 5 });
        await mk('Saga do Cometa', 'hq', 'novo', 3000);
        await mk('Guerreiros de Aço', 'manga', 'usado', 1500);
        await mk('Livro das Marés', 'livro', 'novo', 8000);
        expect((await a.s.catalogo.listar(null, { tipo: 'manga' })).itens.map((p) => p.titulo)).toEqual(['Guerreiros de Aço']);
        expect((await a.s.catalogo.listar(null, { estado: 'novo', ordem: 'menor_preco' })).itens.map((p) => p.titulo)).toEqual(['Saga do Cometa', 'Livro das Marés']);
        expect((await a.s.catalogo.listar(null, { precoMinCentavos: 2000, precoMaxCentavos: 5000 })).itens.map((p) => p.titulo)).toEqual(['Saga do Cometa']);
        expect((await a.s.catalogo.listar(null, { q: 'cometa' })).total).toBe(1);
        expect((await a.s.catalogo.listar(null, { q: 'Autor Um' })).total).toBe(3);
        const pag = await a.s.catalogo.listar(null, { porPagina: 2, pagina: 2 });
        expect(pag.itens).toHaveLength(1);
        expect(pag.total).toBe(3);
      });

      it('só vendedor aprovado cadastra produto, e só edita os próprios', async () => {
        const v1 = await a.novoVendedor();
        const v2 = await a.novoVendedor();
        const c = await a.novoComprador();
        const entrada = { titulo: 'Novo Gibi', descricao: 'Descrição longa o bastante.', tipo: 'gibi' as const, autor: 'Autor', editora: 'Editora', estado: 'novo' as const, precoCentavos: 2500, estoque: 3 };
        await erro(a.s.produtos.cadastrar(c, entrada), 'PROIBIDO');
        const p = await a.s.produtos.cadastrar(v1, entrada);
        await erro(a.s.produtos.atualizar(v2, { id: p.id, precoCentavos: 100 }), 'NAO_ENCONTRADO');
        const atualizado = await a.s.produtos.atualizar(v1, { id: p.id, precoCentavos: 2700, estoque: 8 });
        expect(atualizado.precoCentavos).toBe(2700);
        await erro(a.s.produtos.cadastrar(v1, { ...entrada, precoCentavos: 5 }), 'VALIDACAO');
      });
    });

    describe('carrinho', () => {
      it('soma as quantidades e nunca passa do estoque disponível', async () => {
        const v = await a.novoVendedor();
        const c = await a.novoComprador();
        const p = await a.novoProduto(v, { estoque: 3 });
        await a.s.carrinho.adicionar(c, { produtoId: p, quantidade: 2 });
        const e = await erro(a.s.carrinho.adicionar(c, { produtoId: p, quantidade: 2 }), 'ESTOQUE_INSUFICIENTE');
        expect(e.message).toMatch(/mais 1 unidade/);
        const ver = await a.s.carrinho.adicionar(c, { produtoId: p, quantidade: 1 });
        expect(ver.quantidadeTotal).toBe(3);
        await erro(a.s.carrinho.adicionar(c, { produtoId: p, quantidade: 1 }), 'ESTOQUE_INSUFICIENTE');
        await erro(a.s.carrinho.atualizar(c, { produtoId: p, quantidade: 4 }), 'ESTOQUE_INSUFICIENTE');
        expect((await a.s.carrinho.atualizar(c, { produtoId: p, quantidade: 0 })).quantidadeTotal).toBe(0);
      });

      it('agrupa por vendedor e calcula o frete (grátis acima de R$ 150)', async () => {
        const v1 = await a.novoVendedor('Loja A');
        const v2 = await a.novoVendedor('Loja B');
        const c = await a.novoComprador();
        const barato = await a.novoProduto(v1, { precoCentavos: 4000 });
        const caro = await a.novoProduto(v2, { precoCentavos: 16000 });
        await a.s.carrinho.adicionar(c, { produtoId: barato, quantidade: 2 });
        const ver = await a.s.carrinho.adicionar(c, { produtoId: caro, quantidade: 1 });
        expect(ver.grupos).toHaveLength(2);
        const ga = ver.grupos.find((g) => g.vendedor.nomeLoja === 'Loja A')!;
        const gb = ver.grupos.find((g) => g.vendedor.nomeLoja === 'Loja B')!;
        expect([ga.subtotalCentavos, ga.freteCentavos, ga.totalCentavos]).toEqual([8000, 1500, 9500]);
        expect([gb.subtotalCentavos, gb.freteCentavos, gb.totalCentavos]).toEqual([16000, 0, 16000]);
        expect(ver.totalCentavos).toBe(25500);
      });

      it('vendedor e admin não têm carrinho', async () => {
        const v = await a.novoVendedor();
        await erro(a.s.carrinho.ver(v), 'PROIBIDO');
        await erro(a.s.carrinho.ver(a.admin), 'PROIBIDO');
      });
    });

    describe('checkout', () => {
      it('normaliza CEP e telefone do endereço e guarda no pedido', async () => {
        const v = await a.novoVendedor();
        const c = await a.novoComprador();
        const p = await a.novoProduto(v);
        await a.s.carrinho.adicionar(c, { produtoId: p, quantidade: 1 });
        const r = await a.s.pedidos.finalizarCompra(c, { endereco: { ...ENDERECO, cep: '60165121', telefone: '(85) 98888-7777' }, metodoPagamento: 'pix' });
        const ped = (await a.s.pedidos.detalhe(c, { id: r.pedidos[0]!.id })).pedido;
        expect([ped.enderecoCep, ped.enderecoTelefone]).toEqual(['60165-121', '85988887777']);
      });

      it('gera um pedido por vendedor, baixa o estoque, calcula comissão e limpa o carrinho', async () => {
        const v1 = await a.novoVendedor('Loja A');
        const v2 = await a.novoVendedor('Loja B');
        const c = await a.novoComprador();
        const p1 = await a.novoProduto(v1, { precoCentavos: 4000, estoque: 5 });
        const p2 = await a.novoProduto(v2, { precoCentavos: 2000, estoque: 1 });
        await a.s.carrinho.adicionar(c, { produtoId: p1, quantidade: 2 });
        await a.s.carrinho.adicionar(c, { produtoId: p2, quantidade: 1 });
        const r = await a.s.pedidos.finalizarCompra(c, { endereco: ENDERECO, metodoPagamento: 'cartao' });
        expect(r.pedidos).toHaveLength(2);
        expect(r.totalCentavos).toBe(8000 + 1500 + 2000 + 1500);

        const pa = (await a.s.pedidos.detalhe(c, { id: r.pedidos.find((p) => p.vendedorId === v1.id)!.id })).pedido;
        expect(pa.status).toBe('pago');
        expect([pa.subtotalCentavos, pa.freteCentavos, pa.totalCentavos]).toEqual([8000, 1500, 9500]);
        expect(pa.comissaoCentavos).toBe(800); // 10% do subtotal
        expect(pa.liquidoVendedorCentavos).toBe(8000 - 800 + 1500);
        expect(pa.itens[0]!.titulo).toBeTruthy();
        expect(pa.enderecoCidade).toBe('Fortaleza');

        expect((await a.repo.produtos.obter(p1))!).toMatchObject({ estoque: 3, vendidos: 2 });
        expect((await a.repo.produtos.obter(p2))!).toMatchObject({ estoque: 0, vendidos: 1 });
        expect((await a.s.carrinho.ver(c)).quantidadeTotal).toBe(0);
        expect((await a.s.catalogo.listar(null, {})).itens.map((p) => p.id)).toEqual([p1]); // p2 esgotou
      });

      it('carrinho vazio e endereço inválido são recusados', async () => {
        const c = await a.novoComprador();
        await erro(a.s.pedidos.finalizarCompra(c, { endereco: ENDERECO, metodoPagamento: 'pix' }), 'CARRINHO_VAZIO');
        const v = await a.novoVendedor();
        await a.s.carrinho.adicionar(c, { produtoId: await a.novoProduto(v), quantidade: 1 });
        await erro(a.s.pedidos.finalizarCompra(c, { endereco: { ...ENDERECO, cep: '123' }, metodoPagamento: 'pix' }), 'VALIDACAO');
      });

      it('o último exemplar só vai para um comprador e a compra do outro é desfeita por inteiro', async () => {
        const v1 = await a.novoVendedor('Loja A');
        const v2 = await a.novoVendedor('Loja B');
        const ultimo = await a.novoProduto(v1, { estoque: 1, precoCentavos: 3000 });
        const outro = await a.novoProduto(v2, { estoque: 5, precoCentavos: 3000 });
        const c1 = await a.novoComprador('Comprador Um');
        const c2 = await a.novoComprador('Comprador Dois');
        // os dois colocam o último exemplar no carrinho (o estoque ainda permite)
        await a.s.carrinho.adicionar(c1, { produtoId: ultimo, quantidade: 1 });
        await a.s.carrinho.adicionar(c2, { produtoId: ultimo, quantidade: 1 });
        await a.s.carrinho.adicionar(c2, { produtoId: outro, quantidade: 1 });

        await a.s.pedidos.finalizarCompra(c1, { endereco: ENDERECO, metodoPagamento: 'pix' });
        await erro(a.s.pedidos.finalizarCompra(c2, { endereco: ENDERECO, metodoPagamento: 'pix' }), 'ESTOQUE_INSUFICIENTE');

        // nada do segundo checkout ficou para trás: sem pedidos, estoque do outro intacto, carrinho preservado
        expect((await a.s.pedidos.meus(c2, {})).total).toBe(0);
        expect((await a.repo.produtos.obter(outro))!).toMatchObject({ estoque: 5, vendidos: 0 });
        expect((await a.s.carrinho.ver(c2)).quantidadeTotal).toBe(2);
        expect((await a.repo.produtos.obter(ultimo))!.estoque).toBe(0);
      });

      it('produto de vendedor bloqueado não pode ser comprado', async () => {
        const v = await a.novoVendedor();
        const c = await a.novoComprador();
        const p = await a.novoProduto(v);
        await a.s.carrinho.adicionar(c, { produtoId: p, quantidade: 1 });
        await a.s.admin.bloquear(a.admin, { id: v.id });
        await erro(a.s.pedidos.finalizarCompra(c, { endereco: ENDERECO, metodoPagamento: 'pix' }), 'PRODUTO_INDISPONIVEL');
        expect((await a.s.carrinho.ver(c)).grupos[0]!.itens[0]!.indisponivel).toBe(true);
      });
    });

    describe('acompanhamento do pedido', () => {
      it('pago → enviado (com rastreio e prazo) → recebido', async () => {
        const v = await a.novoVendedor();
        const c = await a.novoComprador();
        const [id] = await a.comprar(c, [{ produtoId: await a.novoProduto(v) }]);
        expect((await a.s.pedidos.detalhe(c, { id: id! })).acoes).toMatchObject({ podeMarcarEnviado: false, podeMarcarRecebido: false, podeCancelar: true });
        await erro(a.s.pedidos.marcarRecebido(c, { id: id! }), 'STATUS_INVALIDO');
        await erro(a.s.pedidos.marcarEnviado(c, { id: id!, codigoRastreio: 'BR123456789' }), 'PROIBIDO');

        const enviado = await a.s.pedidos.marcarEnviado(v, { id: id!, codigoRastreio: 'BR123456789' });
        expect(enviado.status).toBe('enviado');
        expect(enviado.codigoRastreio).toBe('BR123456789');
        const dias = (new Date(enviado.prazoEntregaEm!).getTime() - new Date(enviado.enviadoEm!).getTime()) / 86_400_000;
        expect(dias).toBe(15);
        expect((await a.s.pedidos.detalhe(c, { id: id! })).acoes.podeMarcarRecebido).toBe(true);
        await erro(a.s.pedidos.cancelar(c, { id: id! }), 'STATUS_INVALIDO');

        const recebido = await a.s.pedidos.marcarRecebido(c, { id: id! });
        expect(recebido.status).toBe('entregue');
        expect(recebido.entregueEm).not.toBeNull();
        const hist = await a.s.pedidos.meus(c, { status: 'entregue' });
        expect(hist.total).toBe(1);
      });

      it('cancelar antes do envio devolve o estoque', async () => {
        const v = await a.novoVendedor();
        const c = await a.novoComprador();
        const p = await a.novoProduto(v, { estoque: 4 });
        const [id] = await a.comprar(c, [{ produtoId: p, quantidade: 3 }]);
        expect((await a.repo.produtos.obter(p))!).toMatchObject({ estoque: 1, vendidos: 3 });
        await a.s.pedidos.cancelar(c, { id: id! });
        expect((await a.repo.produtos.obter(p))!).toMatchObject({ estoque: 4, vendidos: 0 });
        expect((await a.s.pedidos.detalhe(c, { id: id! })).pedido.status).toBe('cancelado');
      });

      it('um usuário não enxerga pedidos de outras pessoas, mas o admin enxerga', async () => {
        const v = await a.novoVendedor();
        const outroVendedor = await a.novoVendedor();
        const c = await a.novoComprador();
        const intruso = await a.novoComprador('Intruso');
        const [id] = await a.comprar(c, [{ produtoId: await a.novoProduto(v) }]);
        await erro(a.s.pedidos.detalhe(intruso, { id: id! }), 'NAO_ENCONTRADO');
        await erro(a.s.pedidos.detalhe(outroVendedor, { id: id! }), 'NAO_ENCONTRADO');
        expect((await a.s.pedidos.detalhe(v, { id: id! })).pedido.id).toBe(id);
        expect((await a.s.pedidos.detalhe(a.admin, { id: id! })).pedido.id).toBe(id);
      });
    });

    describe('reclamação por atraso', () => {
      async function pedidoEnviado() {
        const v = await a.novoVendedor();
        const c = await a.novoComprador();
        const [id] = await a.comprar(c, [{ produtoId: await a.novoProduto(v) }]);
        await a.s.pedidos.marcarEnviado(v, { id: id!, codigoRastreio: 'BR123456789' });
        return { v, c, id: id! };
      }

      it('só é possível reclamar depois que o prazo de entrega vence', async () => {
        const { c, id } = await pedidoEnviado();
        await erro(a.s.reclamacoes.abrir(c, { pedidoId: id, motivo: 'Meu pedido não chegou ainda' }), 'PRAZO_NAO_VENCIDO');
        expect((await a.s.pedidos.detalhe(c, { id })).acoes.podeReclamar).toBe(false);
        a.avancarDias(16);
        expect((await a.s.pedidos.detalhe(c, { id })).acoes.podeReclamar).toBe(true);
        const r = await a.s.reclamacoes.abrir(c, { pedidoId: id, motivo: 'Meu pedido não chegou ainda' });
        expect(r.status).toBe('aberta');
        expect((await a.s.pedidos.detalhe(c, { id })).pedido.status).toBe('reclamacao');
        await erro(a.s.reclamacoes.abrir(c, { pedidoId: id, motivo: 'Segunda tentativa de reclamar' }), 'STATUS_INVALIDO');
      });

      it('admin reembolsa: o pedido é cancelado e nada é liberado ao vendedor', async () => {
        const { v, c, id } = await pedidoEnviado();
        a.avancarDias(20);
        const r = await a.s.reclamacoes.abrir(c, { pedidoId: id, motivo: 'Meu pedido não chegou ainda' });
        expect((await a.s.reclamacoes.listar(a.admin, { status: 'aberta' })).total).toBe(1);
        await erro(a.s.reclamacoes.resolver(c, { id: r.id, decisao: 'reembolsar', resposta: 'tentando me aprovar' }), 'PROIBIDO');
        const res = await a.s.reclamacoes.resolver(a.admin, { id: r.id, decisao: 'reembolsar', resposta: 'Reembolso aprovado ao comprador.' });
        expect(res.status).toBe('reembolsada');
        expect((await a.s.pedidos.detalhe(c, { id })).pedido.status).toBe('cancelado');
        const painel = await a.s.painelVendedor.resumo(v);
        expect(painel.financeiro.liberadoVendedorCentavos).toBe(0);
        expect(painel.financeiro.aReceberVendedorCentavos).toBe(0);
        await erro(a.s.reclamacoes.resolver(a.admin, { id: r.id, decisao: 'rejeitar', resposta: 'já resolvida' }), 'STATUS_INVALIDO');
      });

      it('admin rejeita: o pedido volta a "enviado" com mais prazo', async () => {
        const { c, id } = await pedidoEnviado();
        a.avancarDias(20);
        const r = await a.s.reclamacoes.abrir(c, { pedidoId: id, motivo: 'Meu pedido não chegou ainda' });
        await a.s.reclamacoes.resolver(a.admin, { id: r.id, decisao: 'rejeitar', resposta: 'Rastreio mostra entrega em andamento.' });
        const { pedido } = await a.s.pedidos.detalhe(c, { id });
        expect(pedido.status).toBe('enviado');
        expect(new Date(pedido.prazoEntregaEm!).getTime()).toBeGreaterThan(a.agora().getTime());
        expect(pedido.reclamacao?.status).toBe('rejeitada');
      });
    });

    describe('avaliações (1 a 5 estrelas, com meia estrela)', () => {
      async function pedidoEntregue() {
        const v = await a.novoVendedor();
        const c = await a.novoComprador();
        const p = await a.novoProduto(v);
        const [id] = await a.comprar(c, [{ produtoId: p }]);
        return { v, c, p, id: id! };
      }
      const entregar = async (v: any, c: any, id: number) => {
        await a.s.pedidos.marcarEnviado(v, { id, codigoRastreio: 'BR123456789' });
        await a.s.pedidos.marcarRecebido(c, { id });
      };

      it('avaliação aceita até 3 fotos e recusa arquivos que não são imagem', async () => {
        const { v, c, p, id } = await pedidoEntregue();
        await entregar(v, c, id);
        const foto = 'data:image/jpeg;base64,/9j/4AAQSkZJRg==';
        await erro(a.s.avaliacoes.avaliarProduto(c, { pedidoId: id, produtoId: p, nota: 5, fotos: [foto, foto, foto, foto] }), 'VALIDACAO');
        await erro(a.s.avaliacoes.avaliarProduto(c, { pedidoId: id, produtoId: p, nota: 5, fotos: ['data:text/html;base64,PHNjcmlwdD4='] }), 'VALIDACAO');
        await erro(a.s.avaliacoes.avaliarProduto(c, { pedidoId: id, produtoId: p, nota: 5, fotos: ['https://exemplo.com/a.jpg'] }), 'VALIDACAO');
        await erro(a.s.avaliacoes.avaliarProduto(c, { pedidoId: id, produtoId: p, nota: 5, fotos: [`data:image/png;base64,${'A'.repeat(460_000)}`] }), 'VALIDACAO');
        await a.s.avaliacoes.avaliarProduto(c, { pedidoId: id, produtoId: p, nota: 5, comentario: 'Olha como ficou', fotos: [foto, foto] });
        const det = await a.s.catalogo.detalhe(null, { id: p });
        expect(det.avaliacoes[0]!.fotos).toEqual([foto, foto]);
        const sem = await a.s.avaliacoes.doProduto(null, { produtoId: p });
        expect(sem.avaliacoes[0]!.fotos).toHaveLength(2);
      });

      it('só avalia depois de marcar como recebido', async () => {
        const { v, c, p, id } = await pedidoEntregue();
        await erro(a.s.avaliacoes.avaliarProduto(c, { pedidoId: id, produtoId: p, nota: 5 }), 'STATUS_INVALIDO');
        await erro(a.s.avaliacoes.avaliarVendedor(c, { pedidoId: id, nota: 5 }), 'STATUS_INVALIDO');
        await entregar(v, c, id);
        await a.s.avaliacoes.avaliarProduto(c, { pedidoId: id, produtoId: p, nota: 5, comentario: 'Chegou perfeito' });
      });

      it('aceita notas de meio em meio e recusa as demais', async () => {
        const { v, c, p, id } = await pedidoEntregue();
        await entregar(v, c, id);
        for (const nota of [0, 0.5, 4.3, 5.5, 6, -1]) {
          await erro(a.s.avaliacoes.avaliarProduto(c, { pedidoId: id, produtoId: p, nota }), 'VALIDACAO');
        }
        const ok = await a.s.avaliacoes.avaliarProduto(c, { pedidoId: id, produtoId: p, nota: 4.5 });
        expect(ok.nota).toBe(4.5);
        await a.s.avaliacoes.avaliarVendedor(c, { pedidoId: id, nota: 1 });
      });

      it('cada produto e cada vendedor só podem ser avaliados uma vez por pedido', async () => {
        const { v, c, p, id } = await pedidoEntregue();
        await entregar(v, c, id);
        await a.s.avaliacoes.avaliarProduto(c, { pedidoId: id, produtoId: p, nota: 4 });
        await erro(a.s.avaliacoes.avaliarProduto(c, { pedidoId: id, produtoId: p, nota: 5 }), 'JA_AVALIADO');
        await a.s.avaliacoes.avaliarVendedor(c, { pedidoId: id, nota: 3.5 });
        await erro(a.s.avaliacoes.avaliarVendedor(c, { pedidoId: id, nota: 5 }), 'JA_AVALIADO');
      });

      it('não avalia produto de fora do pedido nem pedido de outra pessoa', async () => {
        const { v, c, id } = await pedidoEntregue();
        const fora = await a.novoProduto(v);
        const outro = await a.novoComprador('Outro');
        await entregar(v, c, id);
        await erro(a.s.avaliacoes.avaliarProduto(c, { pedidoId: id, produtoId: fora, nota: 5 }), 'NAO_ENCONTRADO');
        await erro(a.s.avaliacoes.avaliarVendedor(outro, { pedidoId: id, nota: 5 }), 'NAO_ENCONTRADO');
      });

      it('calcula a média do produto e do vendedor e mostra na vitrine', async () => {
        const v = await a.novoVendedor();
        const p = await a.novoProduto(v, { estoque: 20 });
        for (const nota of [5, 4]) {
          const c = await a.novoComprador();
          const [id] = await a.comprar(c, [{ produtoId: p }]);
          await a.s.pedidos.marcarEnviado(v, { id: id!, codigoRastreio: 'BR123456789' });
          await a.s.pedidos.marcarRecebido(c, { id: id! });
          await a.s.avaliacoes.avaliarProduto(c, { pedidoId: id!, produtoId: p, nota });
          await a.s.avaliacoes.avaliarVendedor(c, { pedidoId: id!, nota: nota - 0.5 });
        }
        const lista = await a.s.catalogo.listar(null, {});
        expect(lista.itens[0]!.nota).toEqual({ media: 4.5, total: 2 });
        const det = await a.s.catalogo.detalhe(null, { id: p });
        expect(det.vendedor.nota).toEqual({ media: 4, total: 2 });
        expect(det.avaliacoes).toHaveLength(2);
        expect(det.vendedor.vendasConcluidas).toBe(2);
      });
    });

    describe('mensagens com o vendedor', () => {
      it('comprador inicia a conversa, vendedor responde e as não lidas são contadas', async () => {
        const v = await a.novoVendedor('Loja A');
        const c = await a.novoComprador();
        const p = await a.novoProduto(v);
        const { conversaId } = await a.s.mensagens.iniciar(c, { vendedorId: v.id, produtoId: p, texto: 'Esse gibi está em bom estado?' });
        expect(await a.s.mensagens.naoLidas(v)).toBe(1);
        expect(await a.s.mensagens.naoLidas(c)).toBe(0);

        const abertaPeloVendedor = await a.s.mensagens.conversa(v, { id: conversaId });
        expect(abertaPeloVendedor.mensagens).toHaveLength(1);
        expect(await a.s.mensagens.naoLidas(v)).toBe(0); // abrir marca como lida
        await a.s.mensagens.enviar(v, { conversaId, texto: 'Está ótimo, sem rasuras.' });
        expect(await a.s.mensagens.naoLidas(c)).toBe(1);

        const lista = await a.s.mensagens.conversas(c);
        expect(lista).toHaveLength(1);
        expect(lista[0]).toMatchObject({ naoLidas: 1, outro: { nome: 'Loja A' }, produto: { id: p } });
        // iniciar de novo reaproveita a mesma conversa
        const de_novo = await a.s.mensagens.iniciar(c, { vendedorId: v.id, texto: 'Obrigado!' });
        expect(de_novo.conversaId).toBe(conversaId);
        expect((await a.s.mensagens.conversa(c, { id: conversaId })).mensagens).toHaveLength(3);
      });

      it('terceiros não leem nem escrevem na conversa', async () => {
        const v = await a.novoVendedor();
        const c = await a.novoComprador();
        const intruso = await a.novoComprador('Intruso');
        const { conversaId } = await a.s.mensagens.iniciar(c, { vendedorId: v.id, texto: 'Olá!' });
        await erro(a.s.mensagens.conversa(intruso, { id: conversaId }), 'NAO_ENCONTRADO');
        await erro(a.s.mensagens.enviar(intruso, { conversaId, texto: 'Oi' }), 'NAO_ENCONTRADO');
        await erro(a.s.mensagens.iniciar(c, { vendedorId: c.id, texto: 'Oi' }), 'NAO_ENCONTRADO');
      });
    });

    describe('painel do vendedor', () => {
      it('separa a venda a receber do valor liberado e mostra produtos à venda e vendidos', async () => {
        const v = await a.novoVendedor();
        const c = await a.novoComprador();
        const p1 = await a.novoProduto(v, { precoCentavos: 10000, estoque: 2 });
        const p2 = await a.novoProduto(v, { precoCentavos: 5000, estoque: 10 });
        const [pedido1] = await a.comprar(c, [{ produtoId: p1, quantidade: 2 }]); // esgota p1
        await a.comprar(c, [{ produtoId: p2 }]);

        let painel = await a.s.painelVendedor.resumo(v);
        expect(painel.financeiro.liberadoVendedorCentavos).toBe(0);
        expect(painel.financeiro.aReceberVendedorCentavos).toBe(20000 - 2000 + (5000 - 500 + 1500)); // pedido de R$ 200 tem frete grátis
        expect(painel.pedidosParaEnviar).toBe(2);

        await a.s.pedidos.marcarEnviado(v, { id: pedido1!, codigoRastreio: 'BR123456789' });
        await a.s.pedidos.marcarRecebido(c, { id: pedido1! });
        painel = await a.s.painelVendedor.resumo(v);
        expect(painel.financeiro.liberadoVendedorCentavos).toBe(20000 - 2000);
        expect(painel.financeiro.comissaoPagaCentavos).toBe(2000 + 500);
        expect(painel.produtos).toMatchObject({ aVenda: 1, esgotados: 1, unidadesVendidas: 3 });
        expect(painel.graficos.vendasPorDia).toHaveLength(30);
        expect(painel.graficos.topProdutos[0]).toMatchObject({ produtoId: p1, unidades: 2 });

        const aVenda = await a.s.produtos.meus(v, { situacao: 'aVenda' });
        expect(aVenda.itens.map((p) => p.id)).toEqual([p2]);
        const vendidos = await a.s.produtos.meus(v, { situacao: 'vendidos' });
        expect(vendidos.itens.map((p) => [p.id, p.receitaCentavos])).toEqual([[p1, 20000], [p2, 5000]]);
      });

      it('lista os pedidos recebidos com comprador, endereço e valor', async () => {
        const v = await a.novoVendedor();
        const c = await a.novoComprador('Carla Dias');
        await a.comprar(c, [{ produtoId: await a.novoProduto(v, { precoCentavos: 7000 }) }]);
        const r = await a.s.painelVendedor.pedidos(v, {});
        expect(r.total).toBe(1);
        expect(r.itens[0]).toMatchObject({ comprador: { nome: 'Carla Dias' }, enderecoRua: 'Rua das Flores', totalCentavos: 8500, status: 'pago' });
        await erro(a.s.painelVendedor.pedidos(c, {}), 'PROIBIDO');
      });

      it('um vendedor não enxerga o painel de outro', async () => {
        const v1 = await a.novoVendedor();
        const v2 = await a.novoVendedor();
        const c = await a.novoComprador();
        await a.comprar(c, [{ produtoId: await a.novoProduto(v1) }]);
        expect((await a.s.painelVendedor.resumo(v2)).financeiro.totalPedidos).toBe(0);
        expect((await a.s.painelVendedor.pedidos(v2, {})).total).toBe(0);
      });
    });

    describe('painel do admin', () => {
      it('financeiro geral: bruto, comissão realizada x prevista, cancelados', async () => {
        const v = await a.novoVendedor();
        const c = await a.novoComprador();
        const p = await a.novoProduto(v, { precoCentavos: 10000, estoque: 10 });
        const [a1] = await a.comprar(c, [{ produtoId: p }]);
        const [a2] = await a.comprar(c, [{ produtoId: p }]);
        const [a3] = await a.comprar(c, [{ produtoId: p }]);
        await a.s.pedidos.cancelar(c, { id: a3! });
        await a.s.pedidos.marcarEnviado(v, { id: a1!, codigoRastreio: 'BR123456789' });
        await a.s.pedidos.marcarRecebido(c, { id: a1! });
        void a2;

        const r = await a.s.admin.resumo(a.admin);
        expect(r.financeiro).toMatchObject({
          totalPedidos: 3, pedidosAtivos: 2, brutoCentavos: 2 * 11500,
          comissaoRealizadaCentavos: 1000, comissaoPrevistaCentavos: 1000, canceladosCentavos: 11500,
        });
        expect(r.graficos.pedidosPorStatus).toMatchObject({ entregue: 1, pago: 1, cancelado: 1 });
        expect(r.usuarios).toMatchObject({ compradores: 1, vendedores: 1, vendedoresPendentes: 0 });
        await erro(a.s.admin.resumo(c), 'PROIBIDO');
      });

      it('ranking de quem mais vendeu e de quem mais comprou', async () => {
        const v1 = await a.novoVendedor('Loja Grande');
        const v2 = await a.novoVendedor('Loja Pequena');
        const c1 = await a.novoComprador('Cliente Fiel');
        const c2 = await a.novoComprador('Cliente Eventual');
        const g = await a.novoProduto(v1, { precoCentavos: 20000 });
        const pq = await a.novoProduto(v2, { precoCentavos: 3000 });
        await a.comprar(c1, [{ produtoId: g }]);
        await a.comprar(c1, [{ produtoId: pq }]);
        await a.comprar(c2, [{ produtoId: pq }]);
        const vend = await a.s.admin.rankingVendedores(a.admin, {});
        expect(vend.map((r) => [r.nomeLoja, r.vendidoCentavos, r.pedidos])).toEqual([['Loja Grande', 20000, 1], ['Loja Pequena', 6000, 2]]);
        expect(vend[0]!.posicao).toBe(1);
        const comp = await a.s.admin.rankingCompradores(a.admin, { limite: 1 });
        expect(comp).toHaveLength(1);
        expect(comp[0]).toMatchObject({ nome: 'Cliente Fiel', pedidos: 2 });
      });

      it('histórico de pedidos, estoque baixo e lista de usuários', async () => {
        const v = await a.novoVendedor('Loja Teste');
        const c = await a.novoComprador('Cliente Teste');
        const pouco = await a.novoProduto(v, { titulo: 'Quase Acabando', estoque: 2 });
        await a.novoProduto(v, { titulo: 'Muito Estoque', estoque: 50 });
        await a.comprar(c, [{ produtoId: pouco }]);

        const hist = await a.s.admin.historicoPedidos(a.admin, { status: 'pago' });
        expect(hist.total).toBe(1);
        expect(hist.itens[0]).toMatchObject({ comprador: { nome: 'Cliente Teste' }, vendedor: { nomeLoja: 'Loja Teste' } });

        const baixo = await a.s.admin.estoque(a.admin, { baixo: true });
        expect(baixo.itens.map((p) => [p.titulo, p.estoque, p.vendedorNome])).toEqual([['Quase Acabando', 1, 'Loja Teste']]);
        expect((await a.s.admin.estoque(a.admin, {})).total).toBe(2);

        expect((await a.s.admin.usuarios(a.admin, { papel: 'vendedor' })).total).toBe(1);
        expect((await a.s.admin.usuarios(a.admin, { q: 'cliente' })).itens[0]!.nome).toBe('Cliente Teste');
      });

      it('fila de vendedores pendentes', async () => {
        await a.s.auth.solicitarCadastroVendedor(null, { nome: 'Novo', email: 'novo@loja.com', senha: 'senha123', nomeLoja: 'Loja Nova', documento: '12345678901', telefone: '85999990000', descricaoLoja: 'Quero vender mangás' });
        const fila = await a.s.admin.vendedores(a.admin, {});
        expect(fila.total).toBe(1);
        expect(fila.itens[0]).toMatchObject({ nomeLoja: 'Loja Nova', status: 'pendente' });
        expect((await a.s.admin.resumo(a.admin)).usuarios.vendedoresPendentes).toBe(1);
      });
    });
  });
}
