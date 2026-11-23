import { describe, expect, it } from 'vitest';
import { RepoMemoria } from '../memoria';
import { popularExemplo, SENHA_DEMO } from '../seed';
import { criarServicos } from '../servicos';
import { criptoFalsa } from './ambiente';

describe('dados de exemplo', () => {
  it('geram um marketplace coerente e determinístico', async () => {
    const fim = new Date('2026-11-23T15:00:00Z');
    const r1 = new RepoMemoria();
    await popularExemplo(r1, criptoFalsa, fim);
    const r2 = new RepoMemoria();
    await popularExemplo(r2, criptoFalsa, fim);
    expect(JSON.stringify(r1.exportar())).toBe(JSON.stringify(r2.exportar()));

    const s = criarServicos({ repo: r1, cripto: criptoFalsa, agora: () => fim });
    const admin = { id: 1, papel: 'admin' as const };
    const resumo = await s.admin.resumo(admin);
    expect(resumo.financeiro.totalPedidos).toBeGreaterThan(40);
    expect(resumo.usuarios.vendedoresPendentes).toBe(1);
    expect(resumo.usuarios.compradores).toBe(8);
    expect(resumo.reclamacoesAbertas).toBeGreaterThanOrEqual(1);
    expect(resumo.catalogo.estoqueBaixo).toBeGreaterThanOrEqual(3);
    const status = resumo.graficos.pedidosPorStatus;
    expect(status.entregue).toBeGreaterThan(5);
    expect(status.cancelado).toBeGreaterThan(0);
    expect((await s.catalogo.listar(null, {})).total).toBeGreaterThan(20);
    const login = await s.auth.login(null, { email: 'comprador1@mkt.demo', senha: SENHA_DEMO });
    expect(login.usuario.papel).toBe('comprador');
    expect((await s.admin.rankingVendedores(admin, {})).length).toBe(4);
    // a pendente não entra
    await expect(s.auth.login(null, { email: 'vendedor5@mkt.demo', senha: SENHA_DEMO })).rejects.toMatchObject({ codigo: 'CADASTRO_PENDENTE' });
  });
});
