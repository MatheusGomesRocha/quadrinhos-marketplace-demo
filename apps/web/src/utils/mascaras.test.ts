import { describe, expect, it, vi } from 'vitest';
import { cepCompleto, cpfOuCnpjCompleto, mascaraCep, mascaraDocumento, mascaraMoeda, mascaraTelefone, telefoneCompleto } from './mascaras';
import { buscarCep } from './viacep';

describe('máscaras de digitação', () => {
  it('telefone: celular, fixo e digitação parcial', () => {
    expect(mascaraTelefone('85999991234')).toBe('(85) 99999-1234');
    expect(mascaraTelefone('8532221234')).toBe('(85) 3222-1234');
    expect(mascaraTelefone('8')).toBe('(8');
    expect(mascaraTelefone('85')).toBe('(85');
    expect(mascaraTelefone('85999')).toBe('(85) 999');
    expect(mascaraTelefone('(85) 99999-1234567')).toBe('(85) 99999-1234');
    expect(mascaraTelefone('abc')).toBe('');
    expect(telefoneCompleto('(85) 99999-1234')).toBe(true);
    expect(telefoneCompleto('(85) 9999')).toBe(false);
  });
  it('CEP', () => {
    expect(mascaraCep('60165121')).toBe('60165-121');
    expect(mascaraCep('6016')).toBe('6016');
    expect(mascaraCep('60165-1219999')).toBe('60165-121');
    expect(cepCompleto('60165-121')).toBe(true);
  });
  it('CPF e CNPJ (troca sozinha conforme os dígitos)', () => {
    expect(mascaraDocumento('12345678901')).toBe('123.456.789-01');
    expect(mascaraDocumento('1234')).toBe('123.4');
    expect(mascaraDocumento('123456')).toBe('123.456');
    expect(mascaraDocumento('1234567')).toBe('123.456.7');
    expect(mascaraDocumento('12345678000195')).toBe('12.345.678/0001-95');
    expect(mascaraDocumento('123456780001')).toBe('12.345.678/0001');
    expect(cpfOuCnpjCompleto('123.456.789-01')).toBe(true);
    expect(cpfOuCnpjCompleto('123.456')).toBe(false);
  });
  it('moeda digitada da direita para a esquerda', () => {
    expect(mascaraMoeda('1')).toBe('0,01');
    expect(mascaraMoeda('1299')).toBe('12,99');
    expect(mascaraMoeda('123456')).toBe('1.234,56');
    expect(mascaraMoeda('12.345,67')).toBe('12.345,67');
    expect(mascaraMoeda('')).toBe('');
    expect(mascaraMoeda('000')).toBe('');
  });
});

describe('consulta de CEP (ViaCEP)', () => {
  const resposta = (corpo: unknown, ok = true) => vi.fn().mockResolvedValue({ ok, json: async () => corpo }) as unknown as typeof fetch;
  it('traduz a resposta para o endereço', async () => {
    const f = resposta({ logradouro: 'Avenida Beira Mar', bairro: 'Meireles', localidade: 'Fortaleza', uf: 'CE', complemento: '' });
    expect(await buscarCep('60165-121', f)).toEqual({ rua: 'Avenida Beira Mar', bairro: 'Meireles', cidade: 'Fortaleza', uf: 'CE', complemento: '' });
    expect((f as unknown as ReturnType<typeof vi.fn>).mock.calls[0]![0]).toBe('https://viacep.com.br/ws/60165121/json/');
  });
  it('CEP inexistente devolve null; CEP incompleto nem consulta', async () => {
    expect(await buscarCep('99999-999', resposta({ erro: true }))).toBeNull();
    const f = resposta({});
    expect(await buscarCep('6016', f)).toBeNull();
    expect(f).not.toHaveBeenCalled();
  });
  it('falha de rede vira erro com mensagem amigável', async () => {
    await expect(buscarCep('60165-121', vi.fn().mockRejectedValue(new Error('offline')) as unknown as typeof fetch)).rejects.toThrow(/Não foi possível consultar/);
    await expect(buscarCep('60165-121', resposta({}, false))).rejects.toThrow(/Não foi possível consultar/);
  });
});
