export const brl = (centavos: number) => (centavos / 100).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
export const data = (iso: string | null | undefined) => (iso ? new Date(iso).toLocaleDateString('pt-BR') : '—');
export const dataHora = (iso: string | null | undefined) => (iso ? new Date(iso).toLocaleString('pt-BR', { dateStyle: 'short', timeStyle: 'short' }) : '—');
export const diaCurto = (iso: string) => `${iso.slice(8, 10)}/${iso.slice(5, 7)}`;
export const reaisParaCentavos = (txt: string) => Math.round(Number(txt.replace(/\./g, '').replace(',', '.')) * 100);
export const centavosParaReais = (c: number) => (c / 100).toFixed(2).replace('.', ',');

export const ROTULO_TIPO: Record<string, string> = { hq: 'HQ', manga: 'Mangá', livro: 'Livro', gibi: 'Gibi', outro: 'Outro' };
export const ROTULO_STATUS: Record<string, string> = { pago: 'Pago', enviado: 'Enviado', entregue: 'Entregue', reclamacao: 'Em reclamação', cancelado: 'Cancelado' };
export const COR_STATUS: Record<string, string> = {
  pago: 'bg-sky-100 text-sky-800', enviado: 'bg-amber-100 text-amber-800', entregue: 'bg-emerald-100 text-emerald-800',
  reclamacao: 'bg-red-100 text-red-800', cancelado: 'bg-stone-200 text-stone-600',
  ativo: 'bg-emerald-100 text-emerald-800', pendente: 'bg-amber-100 text-amber-800', rejeitado: 'bg-red-100 text-red-800', bloqueado: 'bg-stone-300 text-stone-700',
  aberta: 'bg-red-100 text-red-800', reembolsada: 'bg-emerald-100 text-emerald-800', rejeitada: 'bg-stone-200 text-stone-600', inativo: 'bg-stone-200 text-stone-600',
};
