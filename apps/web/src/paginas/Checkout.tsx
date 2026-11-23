import { useState, type FormEvent } from 'react';
import { useNavigate } from 'react-router-dom';
import { brl } from '../api/formato';
import { Campo, Cartao, Erro, Estado, Titulo, useCarregar } from '../componentes/ui';
import { useSessao } from '../sessao';

export function Checkout() {
  const { api, atualizarContadores } = useSessao();
  const nav = useNavigate();
  const r = useCarregar(() => api.carrinho.ver(), []);
  const [e, setE] = useState({ nome: '', cep: '', rua: '', numero: '', complemento: '', bairro: '', cidade: '', uf: '' });
  const [metodo, setMetodo] = useState<'pix' | 'cartao' | 'boleto'>('pix');
  const [erro, setErro] = useState<string | null>(null);
  const [enviando, setEnviando] = useState(false);
  const set = (k: keyof typeof e) => (ev: { target: { value: string } }) => setE({ ...e, [k]: ev.target.value });

  async function finalizar(ev: FormEvent) {
    ev.preventDefault(); setErro(null); setEnviando(true);
    try {
      const { pedidos } = await api.pedidos.finalizarCompra({ endereco: { ...e, complemento: e.complemento || null }, metodoPagamento: metodo });
      atualizarContadores();
      nav(pedidos.length === 1 ? `/pedidos/${pedidos[0]!.id}` : '/pedidos');
    } catch (x) { setErro((x as Error).message); } finally { setEnviando(false); }
  }

  return (
    <div>
      <Titulo>Finalizar compra</Titulo>
      <Estado r={r}>
        {(c) => c.grupos.length === 0 ? <p className="text-stone-500">Seu carrinho está vazio.</p> : (
          <form onSubmit={finalizar} className="grid gap-5 lg:grid-cols-[1fr_320px]">
            <div className="space-y-5">
              <Cartao titulo="Endereço de entrega">
                <div className="grid gap-3 sm:grid-cols-6">
                  <div className="sm:col-span-4"><Campo rotulo="Nome de quem recebe"><input className="campo" required value={e.nome} onChange={set('nome')} /></Campo></div>
                  <div className="sm:col-span-2"><Campo rotulo="CEP"><input className="campo" required placeholder="00000-000" value={e.cep} onChange={set('cep')} /></Campo></div>
                  <div className="sm:col-span-4"><Campo rotulo="Rua"><input className="campo" required value={e.rua} onChange={set('rua')} /></Campo></div>
                  <div className="sm:col-span-2"><Campo rotulo="Número"><input className="campo" required value={e.numero} onChange={set('numero')} /></Campo></div>
                  <div className="sm:col-span-3"><Campo rotulo="Complemento"><input className="campo" value={e.complemento} onChange={set('complemento')} /></Campo></div>
                  <div className="sm:col-span-3"><Campo rotulo="Bairro"><input className="campo" required value={e.bairro} onChange={set('bairro')} /></Campo></div>
                  <div className="sm:col-span-4"><Campo rotulo="Cidade"><input className="campo" required value={e.cidade} onChange={set('cidade')} /></Campo></div>
                  <div className="sm:col-span-2"><Campo rotulo="UF"><input className="campo" required maxLength={2} value={e.uf} onChange={(ev) => setE({ ...e, uf: ev.target.value.toUpperCase() })} /></Campo></div>
                </div>
              </Cartao>
              <Cartao titulo="Pagamento (simulado: nenhuma cobrança real)">
                <div className="flex flex-wrap gap-3">
                  {(['pix', 'cartao', 'boleto'] as const).map((m) => (
                    <label key={m} className={`flex cursor-pointer items-center gap-2 rounded-lg border px-4 py-2 text-sm font-semibold ${metodo === m ? 'border-marca-500 bg-marca-50' : 'border-stone-300'}`}>
                      <input type="radio" name="metodo" checked={metodo === m} onChange={() => setMetodo(m)} /> {m === 'cartao' ? 'Cartão' : m === 'pix' ? 'Pix' : 'Boleto'}
                    </label>
                  ))}
                </div>
              </Cartao>
            </div>
            <Cartao titulo="Resumo do pedido">
              {c.grupos.map((g) => <p key={g.vendedor.id} className="flex justify-between text-sm"><span>{g.vendedor.nomeLoja}</span><span>{brl(g.totalCentavos)}</span></p>)}
              <p className="mt-3 flex justify-between border-t pt-3 text-lg font-bold"><span>Total</span><span>{brl(c.totalCentavos)}</span></p>
              <div className="mt-3"><Erro texto={erro} /></div>
              <button className="btn-primario mt-4 w-full" disabled={enviando}>{enviando ? 'Processando…' : 'Confirmar pedido'}</button>
            </Cartao>
          </form>
        )}
      </Estado>
    </div>
  );
}
