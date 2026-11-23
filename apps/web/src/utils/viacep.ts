import { soDigitos } from './mascaras';

export interface EnderecoCep { rua: string; bairro: string; cidade: string; uf: string; complemento: string }

/**
 * Consulta o ViaCEP (https://viacep.com.br). Devolve `null` quando o CEP não existe;
 * lança erro quando a consulta falha (sem internet, serviço fora do ar), para a tela avisar e deixar preencher à mão.
 */
export async function buscarCep(cep: string, buscar: typeof fetch = fetch): Promise<EnderecoCep | null> {
  const d = soDigitos(cep);
  if (d.length !== 8) return null;
  const controle = new AbortController();
  const timer = setTimeout(() => controle.abort(), 6000);
  try {
    const r = await buscar(`https://viacep.com.br/ws/${d}/json/`, { signal: controle.signal });
    if (!r.ok) throw new Error('Serviço de CEP indisponível.');
    const j = await r.json();
    if (j.erro) return null;
    return { rua: j.logradouro ?? '', bairro: j.bairro ?? '', cidade: j.localidade ?? '', uf: j.uf ?? '', complemento: j.complemento ?? '' };
  } catch (e) {
    throw new Error(e instanceof Error && e.name === 'AbortError' ? 'A consulta do CEP demorou demais.' : 'Não foi possível consultar o CEP agora.');
  } finally {
    clearTimeout(timer);
  }
}
