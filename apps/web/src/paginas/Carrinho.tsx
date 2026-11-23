import { useState } from 'react';
import { Minus, Plus, Trash2 } from 'lucide-react';
import { Link } from 'react-router-dom';
import { brl } from '../api/formato';
import { Capa, Cartao, Erro, Estado, Titulo, useCarregar, Vazio } from '../componentes/ui';
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
    <div>
      <Titulo>Carrinho</Titulo>
      <Estado r={r}>
        {(c) => c.grupos.length === 0 ? (
          <Vazio texto="Seu carrinho está vazio." />
        ) : (
          <div className="grid gap-5 lg:grid-cols-[1fr_320px]">
            <div className="space-y-4">
              <Erro texto={erro} />
              {c.grupos.map((g) => (
                <Cartao key={g.vendedor.id} titulo={`Vendido por ${g.vendedor.nomeLoja}`}>
                  <ul className="divide-y divide-stone-100">
                    {g.itens.map((i) => (
                      <li key={i.produto.id} className="flex gap-4 py-3">
                        <Capa titulo={i.produto.titulo} cor={i.produto.cor} className="h-20 w-14 shrink-0 !p-1 text-[9px]" />
                        <div className="flex-1">
                          <Link to={`/produto/${i.produto.id}`} className="font-semibold hover:text-marca-700">{i.produto.titulo}</Link>
                          <p className="text-sm text-stone-500">{brl(i.produto.precoCentavos)} cada · {i.produto.estoque} em estoque</p>
                          {i.indisponivel && <p className="text-sm font-semibold text-red-600">Produto indisponível: remova para continuar.</p>}
                          {i.acimaDoEstoque && <p className="text-sm font-semibold text-red-600">Quantidade acima do estoque: ajuste para até {i.produto.estoque}.</p>}
                          <div className="mt-2 flex items-center gap-2">
                            <button className="btn-sec !p-1.5" aria-label="Diminuir" disabled={i.quantidade <= 1} onClick={() => acao(() => api.carrinho.atualizar({ produtoId: i.produto.id, quantidade: i.quantidade - 1 }))}><Minus size={14} /></button>
                            <span className="w-8 text-center text-sm font-semibold">{i.quantidade}</span>
                            <button className="btn-sec !p-1.5" aria-label="Aumentar" disabled={i.quantidade >= i.produto.estoque} onClick={() => acao(() => api.carrinho.atualizar({ produtoId: i.produto.id, quantidade: i.quantidade + 1 }))}><Plus size={14} /></button>
                            <button className="ml-2 text-sm text-red-600" onClick={() => acao(() => api.carrinho.remover({ produtoId: i.produto.id }))}><Trash2 size={16} /></button>
                          </div>
                        </div>
                        <p className="font-semibold">{brl(i.subtotalCentavos)}</p>
                      </li>
                    ))}
                  </ul>
                  <div className="mt-2 flex justify-between border-t border-stone-100 pt-2 text-sm"><span>Frete {g.freteCentavos === 0 ? '(grátis)' : ''}</span><span>{brl(g.freteCentavos)}</span></div>
                </Cartao>
              ))}
            </div>
            <Cartao titulo="Resumo">
              <p className="flex justify-between text-sm"><span>{c.quantidadeTotal} {c.quantidadeTotal === 1 ? 'item' : 'itens'}</span><span className="text-lg font-bold">{brl(c.totalCentavos)}</span></p>
              <p className="mt-1 text-xs text-stone-500">Cada loja envia separado, então você recebe um pedido por loja. Frete grátis em compras acima de R$ 150,00 por loja.</p>
              <Link to="/checkout" className="btn-primario mt-4 w-full">Continuar para o pagamento</Link>
            </Cartao>
          </div>
        )}
      </Estado>
    </div>
  );
}
