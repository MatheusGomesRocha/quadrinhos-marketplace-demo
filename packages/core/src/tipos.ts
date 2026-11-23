// Tipos de domínio do marketplace. Datas são sempre ISO 8601 (UTC); dinheiro é sempre em CENTAVOS (inteiro).

export type Papel = 'comprador' | 'vendedor' | 'admin';
export type StatusUsuario = 'ativo' | 'pendente' | 'rejeitado' | 'bloqueado';
export type TipoProduto = 'hq' | 'manga' | 'livro' | 'gibi' | 'outro';
export type EstadoProduto = 'novo' | 'usado';
export type StatusProduto = 'ativo' | 'inativo';
export type MetodoPagamento = 'pix' | 'cartao' | 'boleto';
export type StatusPedido = 'pago' | 'enviado' | 'entregue' | 'cancelado' | 'reclamacao';
export type StatusReclamacao = 'aberta' | 'reembolsada' | 'rejeitada';

export const TIPOS_PRODUTO: TipoProduto[] = ['hq', 'manga', 'livro', 'gibi', 'outro'];
export const STATUS_PEDIDO: StatusPedido[] = ['pago', 'enviado', 'entregue', 'reclamacao', 'cancelado'];

export interface Usuario {
  id: number;
  nome: string;
  email: string;
  senhaHash: string;
  papel: Papel;
  status: StatusUsuario;
  nomeLoja: string | null;
  documento: string | null; // só dígitos (CPF ou CNPJ)
  telefone: string | null; // só dígitos, com DDD
  descricaoLoja: string | null;
  motivoRejeicao: string | null;
  criadoEm: string;
}
export type UsuarioPublico = Omit<Usuario, 'senhaHash'>;

export interface Produto {
  id: number;
  vendedorId: number;
  titulo: string;
  descricao: string;
  tipo: TipoProduto;
  autor: string;
  editora: string;
  estado: EstadoProduto;
  precoCentavos: number;
  estoque: number;
  vendidos: number;
  cor: string; // cor da capa gerada (nada de imagens protegidas por direitos autorais)
  status: StatusProduto;
  criadoEm: string;
}

export interface CarrinhoItem {
  id: number;
  compradorId: number;
  produtoId: number;
  quantidade: number;
  criadoEm: string;
}

export interface Pedido {
  id: number;
  codigo: string; // um checkout gera um pedido por vendedor; todos compartilham o código
  compradorId: number;
  vendedorId: number;
  status: StatusPedido;
  subtotalCentavos: number;
  freteCentavos: number;
  totalCentavos: number;
  comissaoCentavos: number; // fatia da plataforma sobre o subtotal
  liquidoVendedorCentavos: number; // subtotal - comissão + frete
  metodoPagamento: MetodoPagamento;
  enderecoNome: string;
  enderecoCep: string;
  enderecoRua: string;
  enderecoNumero: string;
  enderecoComplemento: string | null;
  enderecoBairro: string;
  enderecoCidade: string;
  enderecoUf: string;
  enderecoTelefone: string | null;
  codigoRastreio: string | null;
  criadoEm: string;
  pagoEm: string | null;
  enviadoEm: string | null;
  prazoEntregaEm: string | null;
  entregueEm: string | null;
}

export interface PedidoItem {
  id: number;
  pedidoId: number;
  produtoId: number;
  titulo: string; // foto do título no momento da compra
  precoUnitarioCentavos: number;
  quantidade: number;
}

export interface Conversa {
  id: number;
  compradorId: number;
  vendedorId: number;
  produtoId: number | null;
  criadoEm: string;
  atualizadoEm: string;
}

export interface Mensagem {
  id: number;
  conversaId: number;
  autorId: number;
  texto: string;
  lida: 0 | 1;
  criadoEm: string;
}

export interface AvaliacaoProduto {
  id: number;
  produtoId: number;
  pedidoId: number;
  compradorId: number;
  nota: number; // 1 a 5, de meio em meio
  comentario: string | null;
  fotos: string[]; // imagens (data URL) enviadas junto com a avaliação
  criadoEm: string;
}

export interface AvaliacaoVendedor {
  id: number;
  vendedorId: number;
  pedidoId: number;
  compradorId: number;
  nota: number;
  comentario: string | null;
  criadoEm: string;
}

export interface Reclamacao {
  id: number;
  pedidoId: number;
  compradorId: number;
  motivo: string;
  status: StatusReclamacao;
  respostaAdmin: string | null;
  criadoEm: string;
  resolvidaEm: string | null;
}

export interface RegistroLogin {
  id: number;
  usuarioId: number | null;
  email: string;
  sucesso: 0 | 1;
  motivo: string | null;
  ip: string | null;
  criadoEm: string;
}

/** Quem está chamando a operação (vem do token JWT na API, ou da sessão local na demo). */
export interface Ator {
  id: number;
  papel: Papel;
}

export interface Pagina<T> {
  itens: T[];
  total: number;
  pagina: number;
  porPagina: number;
}

export interface Endereco {
  nome: string;
  cep: string;
  rua: string;
  numero: string;
  complemento?: string | null;
  bairro: string;
  cidade: string;
  uf: string;
}

export interface Nota {
  media: number; // 0 quando não há avaliações
  total: number;
}
