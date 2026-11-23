import { z } from 'zod';
import { ErroNegocio } from '../erros';
import { JANELA_TENTATIVAS_LOGIN_MIN, LIMITE_TENTATIVAS_LOGIN, somenteDigitos } from '../regras';
import type { Ator } from '../tipos';
import { criarBase, publico, telefoneObrigatorio, telefoneOpcional, validar, type Contexto } from './base';

const email = z.string().trim().toLowerCase().email().max(190);
const senha = z.string().min(6).max(72);

export function criarAuth(ctx: Contexto) {
  const { repo } = ctx;
  const { iso, autenticar } = criarBase(ctx);

  async function garantirEmailLivre(e: string) {
    if ((await repo.usuarios.contar({ email: e })) > 0) throw new ErroNegocio('EMAIL_EM_USO', 'Já existe uma conta com este e-mail.', 409);
  }

  return {
    async cadastrarComprador(_ator: Ator | null, entrada: { nome: string; email: string; senha: string; telefone?: string | null }) {
      const d = validar(z.object({ nome: z.string().trim().min(2).max(120), email, senha, telefone: telefoneOpcional }), entrada);
      await garantirEmailLivre(d.email);
      const u = await repo.usuarios.inserir({
        nome: d.nome, email: d.email, senhaHash: await ctx.cripto.hash(d.senha), papel: 'comprador', status: 'ativo',
        nomeLoja: null, documento: null, telefone: d.telefone ?? null, descricaoLoja: null, motivoRejeicao: null, criadoEm: iso(),
      });
      return publico(u);
    },

    /** O vendedor se cadastra como "pendente" e só consegue entrar depois que um admin aprovar. */
    async solicitarCadastroVendedor(
      _ator: Ator | null,
      entrada: { nome: string; email: string; senha: string; telefone: string; nomeLoja: string; documento: string; descricaoLoja: string },
    ) {
      const d = validar(
        z.object({
          nome: z.string().trim().min(2).max(120), email, senha,
          nomeLoja: z.string().trim().min(2).max(120),
          documento: z.string().trim().transform(somenteDigitos).refine((v) => v.length === 11 || v.length === 14, 'Informe um CPF (11 dígitos) ou CNPJ (14 dígitos) válido.'),
          telefone: telefoneObrigatorio,
          descricaoLoja: z.string().trim().min(10).max(1000),
        }),
        entrada,
      );
      await garantirEmailLivre(d.email);
      const u = await repo.usuarios.inserir({
        nome: d.nome, email: d.email, senhaHash: await ctx.cripto.hash(d.senha), papel: 'vendedor', status: 'pendente',
        nomeLoja: d.nomeLoja, documento: d.documento, telefone: d.telefone, descricaoLoja: d.descricaoLoja, motivoRejeicao: null, criadoEm: iso(),
      });
      return publico(u);
    },

    async login(_ator: Ator | null, entrada: { email: string; senha: string; ip?: string | null }) {
      const d = validar(z.object({ email: z.string().trim().toLowerCase().min(1), senha: z.string().min(1), ip: z.string().max(60).nullish() }), entrada);
      const registrar = (usuarioId: number | null, sucesso: 0 | 1, motivo: string | null) =>
        repo.registrosLogin.inserir({ usuarioId, email: d.email, sucesso, motivo, ip: d.ip ?? null, criadoEm: iso() });

      // Freio simples contra força bruta: muitas falhas recentes para o mesmo e-mail.
      const janela = new Date(ctx.agora().getTime() - JANELA_TENTATIVAS_LOGIN_MIN * 60_000).toISOString();
      const falhas = await repo.registrosLogin.contar({ email: d.email, sucesso: 0, criadoEm: { gte: janela } });
      if (falhas >= LIMITE_TENTATIVAS_LOGIN) {
        await registrar(null, 0, 'muitas tentativas');
        throw new ErroNegocio('MUITAS_TENTATIVAS', `Muitas tentativas. Tente novamente em ${JANELA_TENTATIVAS_LOGIN_MIN} minutos.`, 429);
      }

      const [u] = await repo.usuarios.listar({ email: d.email });
      if (!u || !(await ctx.cripto.compara(d.senha, u.senhaHash))) {
        await registrar(u?.id ?? null, 0, 'credenciais inválidas');
        throw new ErroNegocio('CREDENCIAIS', 'E-mail ou senha incorretos.', 401);
      }
      if (u.status === 'pendente') {
        await registrar(u.id, 0, 'cadastro pendente');
        throw new ErroNegocio('CADASTRO_PENDENTE', 'Seu cadastro de vendedor ainda está em análise pelo administrador.', 403);
      }
      if (u.status === 'rejeitado') {
        await registrar(u.id, 0, 'cadastro rejeitado');
        throw new ErroNegocio('CADASTRO_REJEITADO', `Seu cadastro de vendedor não foi aprovado.${u.motivoRejeicao ? ` Motivo: ${u.motivoRejeicao}` : ''}`, 403);
      }
      if (u.status === 'bloqueado') {
        await registrar(u.id, 0, 'conta bloqueada');
        throw new ErroNegocio('CONTA_BLOQUEADA', 'Esta conta está bloqueada. Fale com o suporte.', 403);
      }
      await registrar(u.id, 1, null);
      return { usuario: publico(u) };
    },

    async eu(ator: Ator | null, _entrada?: undefined) {
      return publico(await autenticar(ator));
    },
  };
}
