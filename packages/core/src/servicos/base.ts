import { z, type ZodTypeAny } from 'zod';
import { ErroNegocio } from '../erros';
import { somenteDigitos } from '../regras';
import type { Repo } from '../repo';
import type { Ator, Papel, Usuario, UsuarioPublico } from '../tipos';

export interface Cripto {
  hash(senha: string): Promise<string>;
  compara(senha: string, hash: string): Promise<boolean>;
}

/** Tudo que os serviços precisam de fora. O relógio é injetável para os testes e para gerar dados de exemplo no passado. */
export interface Contexto {
  repo: Repo;
  cripto: Cripto;
  agora: () => Date;
}

// Mensagens de validação em português (valem para todo o sistema).
z.setErrorMap((issue, ctx) => {
  switch (issue.code) {
    case 'invalid_type':
      return { message: ctx.data === undefined || ctx.data === null ? 'Campo obrigatório.' : 'Valor inválido.' };
    case 'too_small':
      if (issue.type === 'string') return { message: issue.minimum === 1 ? 'Campo obrigatório.' : `Mínimo de ${issue.minimum} caracteres.` };
      if (issue.type === 'array') return { message: 'Informe ao menos um item.' };
      return { message: `Valor mínimo: ${issue.minimum}.` };
    case 'too_big':
      if (issue.type === 'string') return { message: `Máximo de ${issue.maximum} caracteres.` };
      return { message: `Valor máximo: ${issue.maximum}.` };
    case 'invalid_string':
      return { message: issue.validation === 'email' ? 'E-mail inválido.' : 'Formato inválido.' };
    case 'invalid_enum_value':
      return { message: 'Opção inválida.' };
    default:
      return { message: ctx.defaultError };
  }
});

export function validar<S extends ZodTypeAny>(esquema: S, entrada: unknown): z.infer<S> {
  const r = esquema.safeParse(entrada ?? {});
  if (r.success) return r.data;
  const detalhes = r.error.issues.map((i) => ({ campo: i.path.join('.'), mensagem: i.message }));
  const primeiro = detalhes[0];
  const msg = primeiro ? (primeiro.campo ? `${primeiro.campo}: ${primeiro.mensagem}` : primeiro.mensagem) : 'Dados inválidos.';
  throw new ErroNegocio('VALIDACAO', msg, 400, detalhes);
}

export const publico = (u: Usuario): UsuarioPublico => {
  const { senhaHash: _omitido, ...resto } = u;
  return resto;
};

export function criarBase(ctx: Contexto) {
  const iso = () => ctx.agora().toISOString();

  /** Confere a sessão contra o banco a cada chamada: bloquear um usuário vale na hora. */
  async function autenticar(ator: Ator | null, ...papeis: Papel[]): Promise<Usuario> {
    if (!ator) throw new ErroNegocio('NAO_AUTENTICADO', 'Faça login para continuar.', 401);
    const u = await ctx.repo.usuarios.obter(ator.id);
    if (!u || u.status !== 'ativo') throw new ErroNegocio('NAO_AUTENTICADO', 'Sessão inválida ou conta indisponível.', 401);
    if (papeis.length && !papeis.includes(u.papel)) throw new ErroNegocio('PROIBIDO', 'Você não tem permissão para esta ação.', 403);
    return u;
  }

  const paginacao = (entrada: { pagina?: number; porPagina?: number } | undefined, padrao = 10) => {
    const porPagina = Math.min(Math.max(entrada?.porPagina ?? padrao, 1), 100);
    const pagina = Math.max(entrada?.pagina ?? 1, 1);
    return { pagina, porPagina, deslocamento: (pagina - 1) * porPagina };
  };

  return { iso, autenticar, paginacao };
}

export const esquemaPaginacao = {
  pagina: z.number().int().min(1).optional(),
  porPagina: z.number().int().min(1).max(100).optional(),
};

export const mapaPorId = <T extends { id: number }>(linhas: T[]): Map<number, T> => new Map(linhas.map((l) => [l.id, l]));

export const unicos = <T>(valores: T[]): T[] => [...new Set(valores)];

const MSG_TEL = 'Informe o telefone com DDD (10 ou 11 dígitos).';
const telefoneValido = (v: string) => /^\d{10,11}$/.test(v);
/** Telefone brasileiro com DDD; aceita com ou sem máscara e guarda só os dígitos. */
export const telefoneObrigatorio = z.string().trim().transform(somenteDigitos).refine(telefoneValido, MSG_TEL);
export const telefoneOpcional = z.string().trim().nullish().transform((v) => (v ? somenteDigitos(v) : null)).refine((v) => v === null || telefoneValido(v), MSG_TEL);
/** CEP "00000-000" (aceita sem hífen). */
export const cepEsquema = z.string().trim().regex(/^\d{5}-?\d{3}$/, 'CEP inválido.').transform((v) => `${somenteDigitos(v).slice(0, 5)}-${somenteDigitos(v).slice(5)}`);
