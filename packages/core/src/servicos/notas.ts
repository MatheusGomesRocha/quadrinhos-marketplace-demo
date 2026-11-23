import type { Repo } from '../repo';
import { media } from '../regras';
import type { Nota } from '../tipos';

export async function notasDeProdutos(repo: Repo, ids: number[]): Promise<Map<number, Nota>> {
  const mapa = new Map<number, Nota>();
  if (!ids.length) return mapa;
  const avs = await repo.avaliacoesProduto.listar({ produtoId: { in: ids } });
  const porProduto = new Map<number, number[]>();
  for (const a of avs) porProduto.set(a.produtoId, [...(porProduto.get(a.produtoId) ?? []), a.nota]);
  for (const id of ids) {
    const n = porProduto.get(id) ?? [];
    mapa.set(id, { media: media(n), total: n.length });
  }
  return mapa;
}

export async function notasDeVendedores(repo: Repo, ids: number[]): Promise<Map<number, Nota>> {
  const mapa = new Map<number, Nota>();
  if (!ids.length) return mapa;
  const avs = await repo.avaliacoesVendedor.listar({ vendedorId: { in: ids } });
  const porVendedor = new Map<number, number[]>();
  for (const a of avs) porVendedor.set(a.vendedorId, [...(porVendedor.get(a.vendedorId) ?? []), a.nota]);
  for (const id of ids) {
    const n = porVendedor.get(id) ?? [];
    mapa.set(id, { media: media(n), total: n.length });
  }
  return mapa;
}
