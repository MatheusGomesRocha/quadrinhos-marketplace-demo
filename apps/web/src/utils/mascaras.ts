/** Máscaras de digitação. Cada função recebe o texto como está no campo e devolve o texto formatado. */
export const soDigitos = (s: string) => s.replace(/\D/g, '');

/** (85) 3222-1234 (fixo, 10 dígitos) ou (85) 99999-1234 (celular, 11 dígitos). */
export function mascaraTelefone(v: string): string {
  const d = soDigitos(v).slice(0, 11);
  if (!d) return '';
  if (d.length <= 2) return `(${d}`;
  if (d.length <= 6) return `(${d.slice(0, 2)}) ${d.slice(2)}`;
  if (d.length <= 10) return `(${d.slice(0, 2)}) ${d.slice(2, 6)}-${d.slice(6)}`;
  return `(${d.slice(0, 2)}) ${d.slice(2, 7)}-${d.slice(7)}`;
}

/** 60165-121 */
export function mascaraCep(v: string): string {
  const d = soDigitos(v).slice(0, 8);
  return d.length > 5 ? `${d.slice(0, 5)}-${d.slice(5)}` : d;
}

/** CPF (000.000.000-00) até 11 dígitos; passando disso vira CNPJ (00.000.000/0000-00). */
export function mascaraDocumento(v: string): string {
  const d = soDigitos(v).slice(0, 14);
  if (d.length <= 11) {
    return d.replace(/^(\d{3})(\d)/, '$1.$2').replace(/^(\d{3})\.(\d{3})(\d)/, '$1.$2.$3').replace(/\.(\d{3})(\d)/, '.$1-$2');
  }
  return d.replace(/^(\d{2})(\d)/, '$1.$2').replace(/^(\d{2})\.(\d{3})(\d)/, '$1.$2.$3').replace(/\.(\d{3})(\d)/, '.$1/$2').replace(/(\d{4})(\d)/, '$1-$2');
}

/** Valores em reais digitados "da direita para a esquerda": 1 → 0,01 · 1299 → 12,99 · 123456 → 1.234,56 */
export function mascaraMoeda(v: string): string {
  const d = soDigitos(v).replace(/^0+/, '');
  if (!d) return '';
  const cheio = d.padStart(3, '0');
  const inteiro = cheio.slice(0, -2).replace(/\B(?=(\d{3})+(?!\d))/g, '.');
  return `${inteiro},${cheio.slice(-2)}`;
}

export const cpfOuCnpjCompleto = (v: string) => [11, 14].includes(soDigitos(v).length);
export const telefoneCompleto = (v: string) => [10, 11].includes(soDigitos(v).length);
export const cepCompleto = (v: string) => soDigitos(v).length === 8;
