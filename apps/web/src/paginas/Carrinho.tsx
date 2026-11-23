import { useState } from 'react';
import { Minus, Plus, ShoppingBag, Trash2 } from 'lucide-react';
import { Link } from 'react-router-dom';
import { brl } from '../api/formato';
import { Arte, Cartao, Erro, Estado, Titulo, useCarregar, Vazio } from '../componentes/ui';
import { useSessao } from '../sessao';

export function Carrinho() {
  const { api, atualizarContadores } = useSessao();
  const r = useCarregar(() => api.carrinho.ver(), []);
  const [erro, setErro] = useState<string | null>(null);

  async function acao(fn: () => Promise<unknown>) {
    setErro(null);
    try { await fn(); await r.recarregar(); atualizarContadores(); } catch (x) { setErro((x as Error).message); }
  }

  return (
    <div className="animate-subir">
      <Titulo sub="Cada loja envia separado, então você recebe um pedido por loja.">Carrinho</Titulo>
      <Estado r={r}>
        {(c) => c.grupos.length === 0 ? (
          <Vazio icone={<ShoppingBag size={28} />} texto="Seu carrinho está vazio." acao={<Link to="/" className="btn-primario">Explorar o catálogo</Link>} />
        ) : (
          <div className="grid gap-6 lg:grid-cols-[1fr_340px]">
            <div className="space-y-4">
              <Erro texto={erro} />
              {c.grupos.map((g) => (
                <Cartao key={g.vendedor.id} titulo={`Vendido por ${g.vendedor.nomeLoja}`}>
                  <ul className="divide-y divide-stone-100">
                    {g.itens.map((i) => (
                      <li key={i.produto.id} className="flex gap-4 py-4">
                        <Link to={`/produto/${i.produto.id}`}><Arte p={i.produto} className="aspect-[5/7] w-20 rounded-lg object-cover shadow-sm" /></Link>
                        <div className="flex-1">
                          <Link to={`/produto/${i.produto.id}`} className="font-bold leading-snug hover:text-marca-600">{i.produto.titulo}</Link>
                          <p className="text-sm text-stone-500">{brl(i.produto.precoCentavos)} cada · {i.produto.estoque} em estoque</p>
                          {i.indisponivel && <p className="text-sm font-semibold text-red-600">Produto indisponível: remova para continuar.</p>}
                          {i.acimaDoEstoque && <p className="text-sm font-semibold text-red-600">Quantidade acima do estoque: ajuste para até {i.produto.estoque}.</p>}
                          <div className="mt-3 flex items-center gap-2">
                            <div className="inline-flex items-center rounded-full border border-stone-200">
                              <button className="p-2 text-stone-600 hover:text-stone-900 disabled:opacity-30" aria-label="Diminuir" disabled={i.quantidade <= 1} onClick={() => acao(() => api.carrinho.atualizar({ produtoId: i.produto.id, quantidade: i.quantidade - 1 }))}><Minus size={14} /></button>
                              <span className="w-8 text-center text-sm font-bold">{i.quantidade}</span>
                              <button className="p-2 text-stone-600 hover:text-stone-900 disabled:opacity-30" aria-label="Aumentar" disabled={i.quantidade >= i.produto.estoque} onClick={() => acao(() => api.carrinho.atualizar({ produtoId: i.produto.id, quantidade: i.quantidade + 1 }))}><Plus size={14} /></button>
                            </div>
                            <button className="rounded-full p-2 text-stone-400 hover:bg-red-50 hover:text-red-600" aria-label="Remover" onClick={() => acao(() => api.carrinho.remover({ produtoId: i.produto.id }))}><Trash2 size={17} /></button>
                          </div>
                        </div>
                        <p className="font-display text-lg font-extrabold">{brl(i.subtotalCentavos)}</p>
                      </li>
                    ))}
                  </ul>
                  <div className="mt-1 flex justify-between border-t border-stone-100 pt-3 text-sm text-stone-600"><span>Frete {g.freteCentavos === 0 ? '(grátis)' : ''}</span><span className="font-semibold">{brl(g.freteCentavos)}</span></div>
                </Cartao>
              ))}
            </div>
            <aside className="lg:sticky lg:top-36 lg:self-start"><Cartao titulo="Resumo do pedido">
              <p className="flex justify-between text-sm text-stone-600"><span>{c.quantidadeTotal} {c.quantidadeTotal === 1 ? 'item' : 'itens'}</span></p>
              <p className="mt-2 flex items-end justify-between border-t border-stone-100 pt-3"><span className="font-semibold">Total</span><span className="font-display text-3xl font-extrabold">{brl(c.totalCentavos)}</span></p>
              <p className="mt-1 text-xs text-stone-500">Frete grátis em compras acima de R$ 150,00 por loja.</p>
              <Link to="/checkout" className="btn-primario mt-5 w-full !py-3">Continuar para o pagamento</Link>
            </Cartao></aside>
          </div>
        )}
      </Estado>
    </div>
  );
}
