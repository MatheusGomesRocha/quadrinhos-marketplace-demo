import { criarServicos } from './servicos';
import { arteDataUri } from './arte';
import type { Cripto } from './servicos/base';
import type { Repo } from './repo';
import type { Ator, EstadoProduto, TipoProduto } from './tipos';

/**
 * Dados de exemplo FICTÍCIOS (títulos, autores e lojas inventados; capas geradas por código).
 * Tudo é criado pelos próprios serviços, com um relógio que anda 45 dias, para que as regras sejam as reais:
 * estoque, comissão, prazos, avaliações, reclamações... Mesma semente = mesmos dados.
 *
 * Logins (senha de todos: demo123): admin@mkt.demo, vendedor1..4@mkt.demo, comprador1..8@mkt.demo.
 * vendedor5@mkt.demo está PENDENTE (para testar a aprovação).
 */
export const SENHA_DEMO = 'demo123';

type Item = [titulo: string, tipo: TipoProduto, autor: string, editora: string, estado: EstadoProduto, precoCentavos: number, estoque: number];

const LOJAS: { nome: string; descricao: string; itens: Item[] }[] = [
  { nome: 'Estante do Cometa', descricao: 'Quadrinhos nacionais e importados, novos e seminovos.', itens: [
    ['Capitã Aurora Vol. 1', 'hq', 'Helena Brandão', 'Quadro Azul', 'novo', 4990, 12],
    ['Capitã Aurora Vol. 2', 'hq', 'Helena Brandão', 'Quadro Azul', 'novo', 4990, 9],
    ['Os Guardiões de Vidro', 'hq', 'Rui Tavares', 'Editora Vitral', 'novo', 6990, 6],
    ['Noite em Neon City', 'hq', 'Paula Meirelles', 'Quadro Azul', 'usado', 3500, 3],
    ['Detetive Sombra e o Relógio Quebrado', 'hq', 'Caio Barreto', 'Papel Noir', 'novo', 5490, 8],
    ['Reino das Marés Vol. 1', 'hq', 'Lia Campos', 'Editora Vitral', 'novo', 5990, 10],
    ['Reino das Marés Vol. 2', 'hq', 'Lia Campos', 'Editora Vitral', 'novo', 5990, 2],
    ['Lobo de Ferro: Origens', 'hq', 'Rui Tavares', 'Papel Noir', 'usado', 4200, 4],
    ['A Última Estação (edição de luxo)', 'hq', 'Helena Brandão', 'Quadro Azul', 'novo', 12990, 5],
  ] },
  { nome: 'Mangá Mirante', descricao: 'Mangás e light novels, com foco em coleções completas.', itens: [
    ['Lâminas do Crepúsculo 1', 'manga', 'Kenji Arakawa', 'Mirante Press', 'novo', 3290, 20],
    ['Lâminas do Crepúsculo 2', 'manga', 'Kenji Arakawa', 'Mirante Press', 'novo', 3290, 15],
    ['Lâminas do Crepúsculo 3', 'manga', 'Kenji Arakawa', 'Mirante Press', 'novo', 3290, 1],
    ['Academia dos Ventos 1', 'manga', 'Yuki Morimoto', 'Sakura Nacional', 'novo', 3490, 14],
    ['Academia dos Ventos 2', 'manga', 'Yuki Morimoto', 'Sakura Nacional', 'novo', 3490, 11],
    ['Chef Estelar 1', 'manga', 'Mari Takeda', 'Mirante Press', 'usado', 2200, 6],
    ['Garoto do Farol 1', 'manga', 'Daichi Ono', 'Sakura Nacional', 'novo', 3190, 9],
    ['Garoto do Farol 2', 'manga', 'Daichi Ono', 'Sakura Nacional', 'novo', 3190, 7],
    ['Samurai de Papel (volume único)', 'manga', 'Akira Shimizu', 'Mirante Press', 'novo', 4590, 4],
  ] },
  { nome: 'Sebo Papel & Tinta', descricao: 'Livros usados e raros, escolhidos a dedo.', itens: [
    ['O Mapa das Constelações Perdidas', 'livro', 'Marta Quintela', 'Folha Dourada', 'usado', 2800, 3],
    ['A Biblioteca do Rio Seco', 'livro', 'Otávio Prado', 'Editora Lume', 'usado', 3200, 2],
    ['Crônicas do Vale Sombrio', 'livro', 'Beatriz Falcão', 'Folha Dourada', 'novo', 5490, 10],
    ['O Relojoeiro de Fortaleza', 'livro', 'Davi Nogueira', 'Editora Lume', 'novo', 4890, 8],
    ['Manual do Colecionador de Gibis', 'livro', 'Sérgio Matos', 'Papel Noir', 'novo', 6990, 6],
    ['Aventuras no Planalto Verde', 'livro', 'Marta Quintela', 'Folha Dourada', 'usado', 1900, 5],
    ['Ensaios sobre Tinta e Memória', 'livro', 'Beatriz Falcão', 'Editora Lume', 'novo', 5190, 3],
    ['Atlas Ilustrado de Mundos Imaginários', 'livro', 'Otávio Prado', 'Folha Dourada', 'novo', 18990, 4],
  ] },
  { nome: 'Gibiteca do Zeca', descricao: 'Gibis infantis, almanaques e colecionáveis.', itens: [
    ['Turma do Beco da Fantasia nº 1', 'gibi', 'Zeca Almeida', 'Gibiteca Press', 'novo', 1290, 30],
    ['Turma do Beco da Fantasia nº 2', 'gibi', 'Zeca Almeida', 'Gibiteca Press', 'novo', 1290, 25],
    ['Almanaque do Robô Teco', 'gibi', 'Nina Salgado', 'Gibiteca Press', 'novo', 2490, 12],
    ['Gatinho Astronauta nº 3', 'gibi', 'Nina Salgado', 'Gibiteca Press', 'usado', 900, 7],
    ['Super Vovó em Ação', 'gibi', 'Zeca Almeida', 'Gibiteca Press', 'novo', 1490, 16],
    ['Box Piratas do Quintal (5 volumes)', 'outro', 'Nina Salgado', 'Gibiteca Press', 'novo', 8990, 4],
    ['Pôster Gigante Capitã Aurora', 'outro', 'Helena Brandão', 'Quadro Azul', 'novo', 2990, 18],
    ['Cards Colecionáveis Heróis do Bairro', 'outro', 'Zeca Almeida', 'Gibiteca Press', 'novo', 1990, 0],
  ] },
];

const COMPRADORES = ['Ana Lima', 'Bruno Costa', 'Carla Dias', 'Diego Alves', 'Elisa Nunes', 'Felipe Rocha', 'Gabriela Melo', 'Heitor Pires'];
const ENDERECOS = [
  { rua: 'Av. Beira Mar', numero: '1200', bairro: 'Meireles', cidade: 'Fortaleza', uf: 'CE', cep: '60165-121' },
  { rua: 'Rua Padre Valdevino', numero: '350', bairro: 'Aldeota', cidade: 'Fortaleza', uf: 'CE', cep: '60135-040' },
  { rua: 'Rua da Harmonia', numero: '88', bairro: 'Vila Madalena', cidade: 'São Paulo', uf: 'SP', cep: '05435-000' },
  { rua: 'Av. Afonso Pena', numero: '2400', bairro: 'Funcionários', cidade: 'Belo Horizonte', uf: 'MG', cep: '30130-009' },
  { rua: 'Rua dos Andradas', numero: '15', bairro: 'Centro Histórico', cidade: 'Porto Alegre', uf: 'RS', cep: '90020-007' },
];
const COMENTARIOS_PRODUTO = ['Chegou perfeito, bem embalado.', 'Ótimo estado, igual à descrição.', 'Edição linda, recomendo!', 'Bom, mas a capa veio com um pequeno amassado.', 'Entrega rápida e produto conforme anunciado.', 'Superou as expectativas.'];
const COMENTARIOS_VENDEDOR = ['Vendedor atencioso e rápido.', 'Tudo certo, comprarei de novo.', 'Respondeu todas as dúvidas.', 'Demorou um pouco para postar, mas deu tudo certo.', 'Excelente embalagem.'];

export async function popularExemplo(repo: Repo, cripto: Cripto, fim: Date = new Date(), dias = 45): Promise<void> {
  let t = fim.getTime() - dias * 86_400_000;
  const agora = () => new Date(t);
  const s = criarServicos({ repo, cripto, agora });

  // gerador pseudoaleatório determinístico
  let sem = 20261123;
  const rnd = () => ((sem = (sem * 1664525 + 1013904223) % 4294967296) / 4294967296);
  const inteiro = (a: number, b: number) => a + Math.floor(rnd() * (b - a + 1));
  const escolher = <T>(l: T[]): T => l[Math.floor(rnd() * l.length)]!;
  const nota = (): number => escolher([5, 5, 5, 4.5, 4.5, 4, 4, 3.5, 3, 5, 4.5]);

  // ---- usuários ----
  const adm = await repo.usuarios.inserir({
    nome: 'Administração', email: 'admin@mkt.demo', senhaHash: await cripto.hash(SENHA_DEMO), papel: 'admin', status: 'ativo',
    nomeLoja: null, documento: null, telefone: null, descricaoLoja: null, motivoRejeicao: null, criadoEm: agora().toISOString(),
  });
  const admin: Ator = { id: adm.id, papel: 'admin' };

  const vendedores: { ator: Ator; produtos: number[] }[] = [];
  for (const [i, loja] of LOJAS.entries()) {
    const u = await s.auth.solicitarCadastroVendedor(null, {
      nome: `Responsável ${loja.nome}`, email: `vendedor${i + 1}@mkt.demo`, senha: SENHA_DEMO, nomeLoja: loja.nome, documento: `1234567890${i}`, telefone: `8532${String(10000 + i * 1111).slice(0, 4)}000${i}`.slice(0, 11), descricaoLoja: loja.descricao,
    });
    await s.admin.aprovarVendedor(admin, { id: u.id });
    const ator: Ator = { id: u.id, papel: 'vendedor' };
    const produtos: number[] = [];
    for (const [titulo, tipo, autor, editora, estado, preco, estoque] of loja.itens) {
      const p = await s.produtos.cadastrar(ator, {
        titulo, tipo, autor, editora, estado, precoCentavos: preco, estoque: estoque + 6, // folga: o estoque final é ajustado abaixo
        descricao: `${titulo}. Edição ${estado === 'novo' ? 'nova, lacrada' : 'usada, em ótimo estado de conservação'}. Ideal para colecionadores.`,
      });
      produtos.push(p.id);
    }
    vendedores.push({ ator, produtos });
    t += 3_600_000;
  }
  await s.auth.solicitarCadastroVendedor(null, {
    nome: 'Responsável Quadrinhos do Norte', email: 'vendedor5@mkt.demo', senha: SENHA_DEMO, nomeLoja: 'Quadrinhos do Norte', documento: '12345678905', telefone: '85988887777',
    descricaoLoja: 'Estamos começando e queremos vender HQs independentes.',
  });

  const compradores: Ator[] = [];
  for (const [i, nome] of COMPRADORES.entries()) {
    const u = await s.auth.cadastrarComprador(null, { nome, email: `comprador${i + 1}@mkt.demo`, senha: SENHA_DEMO, telefone: `85999${String(10000 + i * 7311).padStart(5, '0').slice(0, 5)}${i}`.slice(0, 11) });
    compradores.push({ id: u.id, papel: 'comprador' });
  }

  // ---- simulação dia a dia ----
  const pedidos: { id: number; comprador: Ator; vendedor: Ator; dia: number; destino: 'entregar' | 'deixar_enviado' | 'reclamar' | 'cancelar' | 'pago'; produtoIds: number[] }[] = [];
  let reclamacoesAbertas = 0;
  const idsReclamar = new Set<number>();

  for (let dia = 0; dia <= dias; dia++) {
    t = fim.getTime() - (dias - dia) * 86_400_000 + 10 * 3_600_000;
    const idade = dias - dia;

    // logins do dia (alguns falham)
    for (let k = 0; k < inteiro(1, 3); k++) {
      const c = escolher(compradores);
      const u = await repo.usuarios.obter(c.id);
      const ip = `177.${inteiro(10, 99)}.${inteiro(1, 250)}.${inteiro(1, 250)}`;
      await s.auth.login(null, { email: u!.email, senha: SENHA_DEMO, ip });
    }
    if (rnd() < 0.18) await s.auth.login(null, { email: `comprador${inteiro(1, 8)}@mkt.demo`, senha: 'senha-errada' }).catch(() => undefined);
    if (dia % 7 === 0) await s.auth.login(null, { email: 'admin@mkt.demo', senha: SENHA_DEMO, ip: '10.0.0.1' });
    if (dia % 5 === 0) await s.auth.login(null, { email: `vendedor${inteiro(1, 4)}@mkt.demo`, senha: SENHA_DEMO, ip: '186.20.4.9' });

    // novas compras (menos movimento no começo, mais perto de hoje)
    const nCompras = inteiro(0, 2) + (dia > dias * 0.6 ? 1 : 0);
    for (let k = 0; k < nCompras; k++) {
      const comprador = escolher(compradores);
      const lojas = rnd() < 0.3 ? [escolher(vendedores), escolher(vendedores)] : [escolher(vendedores)];
      const escolhidos = new Set<number>();
      try {
        for (const l of lojas) {
          for (let q = 0; q < inteiro(1, 2); q++) {
            const pid = escolher(l.produtos);
            if (escolhidos.has(pid)) continue;
            escolhidos.add(pid);
            await s.carrinho.adicionar(comprador, { produtoId: pid, quantidade: inteiro(1, 2) }).catch(() => undefined);
          }
        }
        const e = escolher(ENDERECOS);
        const r = await s.pedidos.finalizarCompra(comprador, {
          endereco: { ...e, nome: (await repo.usuarios.obter(comprador.id))!.nome, telefone: (await repo.usuarios.obter(comprador.id))!.telefone }, metodoPagamento: escolher(['pix', 'pix', 'cartao', 'boleto'] as const),
        });
        for (const p of r.pedidos) {
          const vend = vendedores.find((v) => v.ator.id === p.vendedorId)!.ator;
          const sorte = rnd();
          let destino: (typeof pedidos)[number]['destino'] = 'entregar';
          if (sorte < 0.07) destino = 'cancelar';
          else if (sorte < 0.17) destino = 'deixar_enviado';
          if (idade > 36 && idsReclamar.size < 2 && destino !== 'cancelar') { destino = 'reclamar'; idsReclamar.add(p.id); }
          pedidos.push({ id: p.id, comprador: comprador, vendedor: vend, dia, destino, produtoIds: [] });
        }
      } catch {
        // estoque acabou para esse carrinho: o comprador desiste (a transação já foi desfeita)
        for (const i of (await s.carrinho.ver(comprador)).grupos.flatMap((g) => g.itens)) await s.carrinho.remover(comprador, { produtoId: i.produto.id });
      }
    }

    // andamento dos pedidos existentes
    for (const p of pedidos) {
      const idadePedido = dia - p.dia;
      const atual = (await repo.pedidos.obter(p.id))!;
      if (atual.status === 'pago' && p.destino === 'cancelar' && idadePedido >= 1) await s.pedidos.cancelar(p.comprador, { id: p.id });
      else if (atual.status === 'pago' && p.destino !== 'cancelar' && idadePedido >= 2) {
        await s.pedidos.marcarEnviado(p.vendedor, { id: p.id, codigoRastreio: `BR${String(100000000 + p.id * 7919).slice(0, 9)}BR` });
      } else if (atual.status === 'enviado' && p.destino === 'entregar' && idadePedido >= inteiro(6, 12)) {
        await s.pedidos.marcarRecebido(p.comprador, { id: p.id });
        if (rnd() < 0.7) {
          for (const i of (await repo.pedidoItens.listar({ pedidoId: p.id }))) {
            // ~40% das avaliações trazem fotos fictícias (o exemplar em cenários diferentes)
            const prod = (await repo.produtos.obter(i.produtoId))!;
            const fotos = rnd() < 0.4 ? Array.from({ length: inteiro(1, 2) }, (_, k) => arteDataUri({ titulo: prod.titulo, autor: prod.autor, tipo: prod.tipo, cor: prod.cor }, 'foto', inteiro(0, 30) + k)) : [];
            await s.avaliacoes.avaliarProduto(p.comprador, { pedidoId: p.id, produtoId: i.produtoId, nota: nota(), comentario: rnd() < 0.7 || fotos.length ? escolher(COMENTARIOS_PRODUTO) : null, fotos });
          }
          await s.avaliacoes.avaliarVendedor(p.comprador, { pedidoId: p.id, nota: nota(), comentario: rnd() < 0.6 ? escolher(COMENTARIOS_VENDEDOR) : null });
        }
      } else if (atual.status === 'enviado' && p.destino === 'reclamar' && atual.prazoEntregaEm && agora().toISOString() > atual.prazoEntregaEm) {
        const r = await s.reclamacoes.abrir(p.comprador, { pedidoId: p.id, motivo: 'O prazo de entrega venceu e o pedido ainda não chegou. Rastreio sem atualização.' });
        reclamacoesAbertas++;
        if (reclamacoesAbertas === 1) {
          t += 2 * 3_600_000;
          await s.reclamacoes.resolver(admin, { id: r.id, decisao: 'reembolsar', resposta: 'Reembolso aprovado: a transportadora confirmou o extravio.' });
        }
      }
    }

    // conversas com vendedores
    if (dia === Math.floor(dias * 0.5) || dia === Math.floor(dias * 0.8) || dia === dias - 1) {
      const c = escolher(compradores);
      const v = escolher(vendedores);
      const { conversaId } = await s.mensagens.iniciar(c, { vendedorId: v.ator.id, produtoId: escolher(v.produtos), texto: 'Olá! Esse item está disponível para envio imediato?' });
      t += 1_800_000;
      await s.mensagens.conversa(v.ator, { id: conversaId });
      await s.mensagens.enviar(v.ator, { conversaId, texto: 'Olá! Sim, postamos em até 2 dias úteis.' });
      if (dia === dias - 1) await s.mensagens.enviar(c, { conversaId, texto: 'Perfeito, vou finalizar a compra agora!' });
    }
  }

  // Ajuste final de estoque: alguns produtos com estoque baixo e um esgotado, para a demo mostrar os alertas.
  const todos = vendedores.flatMap((v) => v.produtos);
  for (const [i, id] of todos.entries()) {
    const p = (await repo.produtos.obter(id))!;
    if (p.estoque > 14) await repo.produtos.atualizar(id, { estoque: 6 + (i % 7) });
  }
  const ultimo = vendedores[3]!.produtos[vendedores[3]!.produtos.length - 1]!;
  await repo.produtos.atualizar(ultimo, { estoque: 0 });
  for (const id of [todos[6]!, todos[11]!, todos[20]!]) await repo.produtos.atualizar(id, { estoque: inteiro(1, 3) });
}
