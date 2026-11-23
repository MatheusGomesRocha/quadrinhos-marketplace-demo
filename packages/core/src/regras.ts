// Constantes e cálculos de negócio em um só lugar. Mudou uma regra? Mude aqui.

export const TAXA_COMISSAO = 0.1; // 10% do subtotal fica com a plataforma
export const FRETE_FIXO_CENTAVOS = 1500; // por vendedor no pedido
export const FRETE_GRATIS_ACIMA_CENTAVOS = 15000; // subtotal a partir do qual o frete é grátis
export const PRAZO_ENTREGA_DIAS = 15; // prazo contado a partir do envio
export const PRAZO_APOS_RECLAMACAO_REJEITADA_DIAS = 7;
export const ESTOQUE_BAIXO = 3; // alerta de estoque baixo no painel do admin
export const LIMITE_TENTATIVAS_LOGIN = 5; // falhas por e-mail dentro da janela
export const JANELA_TENTATIVAS_LOGIN_MIN = 10;

export const calcularFrete = (subtotalCentavos: number): number =>
  subtotalCentavos >= FRETE_GRATIS_ACIMA_CENTAVOS ? 0 : FRETE_FIXO_CENTAVOS;

export const calcularComissao = (subtotalCentavos: number): number => Math.round(subtotalCentavos * TAXA_COMISSAO);

/** Notas de 1 a 5, de meia em meia estrela (1, 1.5, 2 ... 5). */
export const notaValida = (n: number): boolean => Number.isFinite(n) && n >= 1 && n <= 5 && Number.isInteger(n * 2);

export const somarDias = (iso: string, dias: number): string => {
  const d = new Date(iso);
  d.setUTCDate(d.getUTCDate() + dias);
  return d.toISOString();
};

export const diaDe = (iso: string): string => iso.slice(0, 10);

export const arredondar = (n: number, casas = 1): number => {
  const f = 10 ** casas;
  return Math.round(n * f) / f;
};

export const media = (valores: number[]): number => (valores.length ? arredondar(valores.reduce((a, b) => a + b, 0) / valores.length, 2) : 0);

/** Cor estável (hex) para a capa gerada de um título: mesmo título, mesma cor. */
export function corDoTitulo(titulo: string): string {
  let h = 0;
  for (const c of titulo) h = (h * 31 + c.charCodeAt(0)) % 360;
  const s = 0.55, l = 0.42;
  const a = s * Math.min(l, 1 - l);
  const f = (n: number) => {
    const k = (n + h / 30) % 12;
    const v = l - a * Math.max(-1, Math.min(k - 3, 9 - k, 1));
    return Math.round(255 * v).toString(16).padStart(2, '0');
  };
  return `#${f(0)}${f(8)}${f(4)}`;
}
