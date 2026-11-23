import { useRef, useState, type FormEvent } from 'react';
import { CheckCircle2, CreditCard, FileText, Loader2, QrCode } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { brl } from '../api/formato';
import { Arte, Campo, Cartao, Erro, Estado, InputMascara, Titulo, useCarregar } from '../componentes/ui';
import { useSessao } from '../sessao';
import { cepCompleto, mascaraCep, mascaraTelefone, telefoneCompleto } from '../utils/mascaras';
import { buscarCep } from '../utils/viacep';

const METODOS = [['pix', 'Pix', QrCode], ['cartao', 'Cartão', CreditCard], ['boleto', 'Boleto', FileText]] as const;
const vazio = { nome: '', telefone: '', cep: '', rua: '', numero: '', complemento: '', bairro: '', cidade: '', uf: '' };

export function Checkout() {
  const { api, usuario, atualizarContadores } = useSessao();
  const nav = useNavigate();
  const r = useCarregar(() => api.carrinho.ver(), []);
  const [e, setE] = useState({ ...vazio, nome: usuario?.nome ?? '', telefone: mascaraTelefone(usuario?.telefone ?? '') });
  const [metodo, setMetodo] = useState<'pix' | 'cartao' | 'boleto'>('pix');
  const [erro, setErro] = useState<string | null>(null);
  const [enviando, setEnviando] = useState(false);
  const [cep, setCep] = useState<{ estado: 'ocioso' | 'buscando' | 'ok' | 'nao_achou' | 'falhou'; msg?: string }>({ estado: 'ocioso' });
  const numeroRef = useRef<HTMLInputElement>(null);
  const ultimoCep = useRef('');
  const set = (k: keyof typeof e) => (ev: { target: { value: string } }) => setE((x) => ({ ...x, [k]: ev.target.value }));

  /** Ao completar o CEP (8 dígitos), busca o endereço e preenche rua, bairro, cidade e UF. */
  async function aoMudarCep(valor: string) {
    setE((x) => ({ ...x, cep: valor }));
    if (!cepCompleto(valor)) { ultimoCep.current = ''; setCep({ estado: 'ocioso' }); return; }
    if (ultimoCep.current === valor) return;
    ultimoCep.current = valor;
    setCep({ estado: 'buscando' });
    try {
      const end = await buscarCep(valor);
      if (ultimoCep.current !== valor) return; // o usuário já mudou o CEP
      if (!end) { setCep({ estado: 'nao_achou', msg: 'CEP não encontrado. Confira os números ou preencha à mão.' }); return; }
      // CEPs de cidades pequenas não trazem rua/bairro: só substitui o que veio preenchido.
      setE((x) => ({ ...x, rua: end.rua || x.rua, bairro: end.bairro || x.bairro, cidade: end.cidade || x.cidade, uf: end.uf || x.uf, complemento: x.complemento || end.complemento }));
      setCep({ estado: 'ok', msg: `${[end.rua, end.bairro, `${end.cidade}/${end.uf}`].filter(Boolean).join(' · ')}` });
      numeroRef.current?.focus();
    } catch (x) {
      if (ultimoCep.current === valor) setCep({ estado: 'falhou', msg: `${(x as Error).message} Preencha o endereço à mão.` });
    }
  }

  async function finalizar(ev: FormEvent) {
    ev.preventDefault(); setErro(null);
    if (!telefoneCompleto(e.telefone)) { setErro('Informe o telefone com DDD.'); return; }
    if (!cepCompleto(e.cep)) { setErro('Informe o CEP completo (8 dígitos).'); return; }
    setEnviando(true);
    try {
      const { pedidos } = await api.pedidos.finalizarCompra({ endereco: { ...e, complemento: e.complemento || null }, metodoPagamento: metodo });
      atualizarContadores();
      nav(pedidos.length === 1 ? `/pedidos/${pedidos[0]!.id}` : '/pedidos');
    } catch (x) { setErro((x as Error).message); } finally { setEnviando(false); }
  }

  return (
    <div className="animate-subir">
      <Titulo>Finalizar compra</Titulo>
      <Estado r={r}>
        {(c) => c.grupos.length === 0 ? <p className="text-stone-500">Seu carrinho está vazio.</p> : (
          <form onSubmit={finalizar} className="grid gap-6 lg:grid-cols-[1fr_360px]">
            <div className="space-y-6">
              <Cartao titulo="1 · Endereço de entrega">
                <div className="grid gap-4 sm:grid-cols-6">
                  <div className="sm:col-span-4"><Campo rotulo="Nome de quem recebe"><input className="campo" required autoComplete="name" value={e.nome} onChange={set('nome')} /></Campo></div>
                  <div className="sm:col-span-2"><Campo rotulo="Telefone com DDD"><InputMascara mascara={mascaraTelefone} className="campo" required autoComplete="tel-national" placeholder="(85) 99999-0000" value={e.telefone} onChange={(v) => setE((x) => ({ ...x, telefone: v }))} /></Campo></div>
                  <div className="sm:col-span-2">
                    <Campo rotulo="CEP"><div className="relative"><InputMascara mascara={mascaraCep} className="campo pr-9" required autoComplete="postal-code" placeholder="00000-000" value={e.cep} onChange={(v) => void aoMudarCep(v)} />{cep.estado === 'buscando' && <Loader2 size={16} className="absolute right-3 top-3 animate-spin text-stone-400" />}{cep.estado === 'ok' && <CheckCircle2 size={16} className="absolute right-3 top-3 text-emerald-600" />}</div></Campo>
                  </div>
                  <p className={`self-end pb-2.5 text-xs sm:col-span-4 ${cep.estado === 'ok' ? 'text-emerald-700' : cep.estado === 'ocioso' || cep.estado === 'buscando' ? 'text-stone-400' : 'text-amber-700'}`} aria-live="polite">{cep.estado === 'buscando' ? 'Buscando endereço…' : cep.estado === 'ocioso' ? 'Digite o CEP e preenchemos o endereço para você.' : cep.msg}</p>
                  <div className="sm:col-span-4"><Campo rotulo="Rua"><input className="campo" required autoComplete="address-line1" value={e.rua} onChange={set('rua')} /></Campo></div>
                  <div className="sm:col-span-2"><Campo rotulo="Número"><input ref={numeroRef} className="campo" required inputMode="numeric" value={e.numero} onChange={set('numero')} /></Campo></div>
                  <div className="sm:col-span-3"><Campo rotulo="Complemento (opcional)"><input className="campo" value={e.complemento} onChange={set('complemento')} /></Campo></div>
                  <div className="sm:col-span-3"><Campo rotulo="Bairro"><input className="campo" required value={e.bairro} onChange={set('bairro')} /></Campo></div>
                  <div className="sm:col-span-4"><Campo rotulo="Cidade"><input className="campo" required autoComplete="address-level2" value={e.cidade} onChange={set('cidade')} /></Campo></div>
                  <div className="sm:col-span-2"><Campo rotulo="UF"><input className="campo uppercase" required maxLength={2} autoComplete="address-level1" value={e.uf} onChange={(ev) => setE((x) => ({ ...x, uf: ev.target.value.replace(/[^a-zA-Z]/g, '').toUpperCase() }))} /></Campo></div>
                </div>
              </Cartao>
              <Cartao titulo="2 · Pagamento (simulado: nenhuma cobrança real)">
                <div className="grid gap-3 sm:grid-cols-3">
                  {METODOS.map(([m, rot, Icone]) => (
                    <label key={m} className={`flex cursor-pointer items-center gap-3 rounded-2xl border-2 px-4 py-3.5 text-sm font-bold transition ${metodo === m ? 'border-marca-500 bg-marca-50 text-marca-700' : 'border-stone-200 hover:border-stone-300'}`}>
                      <input type="radio" name="metodo" className="sr-only" checked={metodo === m} onChange={() => setMetodo(m)} /><Icone size={20} />{rot}
                    </label>
                  ))}
                </div>
              </Cartao>
            </div>
            <aside className="lg:sticky lg:top-36 lg:self-start">
              <Cartao titulo="Resumo do pedido">
                <ul className="mb-3 max-h-56 space-y-3 overflow-auto">{c.grupos.flatMap((g) => g.itens).map((i) => <li key={i.produto.id} className="flex items-center gap-3"><Arte p={i.produto} className="aspect-[5/7] w-10 rounded object-cover" /><span className="line-clamp-2 flex-1 text-sm font-semibold">{i.produto.titulo}</span><span className="text-xs text-stone-500">×{i.quantidade}</span></li>)}</ul>
                {c.grupos.map((g) => <p key={g.vendedor.id} className="flex justify-between text-sm text-stone-600"><span>{g.vendedor.nomeLoja} <span className="text-xs">(c/ frete)</span></span><span>{brl(g.totalCentavos)}</span></p>)}
                <p className="mt-3 flex items-end justify-between border-t border-stone-100 pt-3"><span className="font-semibold">Total</span><span className="font-display text-3xl font-extrabold">{brl(c.totalCentavos)}</span></p>
                <div className="mt-3"><Erro texto={erro} /></div>
                <button className="btn-primario mt-4 w-full !py-3" disabled={enviando}>{enviando ? 'Processando…' : 'Confirmar pedido'}</button>
              </Cartao>
            </aside>
          </form>
        )}
      </Estado>
    </div>
  );
}
