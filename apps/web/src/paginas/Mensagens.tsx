import { useEffect, useRef, useState } from 'react';
import { Send } from 'lucide-react';
import { dataHora } from '../api/formato';
import { Cartao, Erro, Estado, Titulo, useCarregar, Vazio } from '../componentes/ui';
import { useSessao } from '../sessao';

export function Mensagens() {
  const { api, usuario, atualizarContadores } = useSessao();
  const lista = useCarregar(() => api.mensagens.conversas(), []);
  const [aberta, setAberta] = useState<number | null>(null);
  const conversa = useCarregar(() => (aberta ? api.mensagens.conversa({ id: aberta }) : Promise.resolve(null)), [aberta]);
  const [texto, setTexto] = useState('');
  const [erro, setErro] = useState<string | null>(null);
  const fim = useRef<HTMLDivElement>(null);

  useEffect(() => { if (!aberta && lista.dados?.length) setAberta(lista.dados[0]!.id); }, [lista.dados, aberta]);
  useEffect(() => { fim.current?.scrollIntoView({ block: 'end' }); atualizarContadores(); }, [conversa.dados]); // eslint-disable-line react-hooks/exhaustive-deps

  async function enviar() {
    if (!aberta || !texto.trim()) return;
    setErro(null);
    try { await api.mensagens.enviar({ conversaId: aberta, texto }); setTexto(''); await conversa.recarregar(); void lista.recarregar(); } catch (x) { setErro((x as Error).message); }
  }

  return (
    <div>
      <Titulo>Mensagens</Titulo>
      <Estado r={lista}>
        {(cs) => cs.length === 0 ? <Vazio texto={usuario?.papel === 'comprador' ? 'Você ainda não conversou com nenhum vendedor. Abra um produto e use "Falar com o vendedor".' : 'Nenhum comprador entrou em contato ainda.'} /> : (
          <div className="grid gap-4 md:grid-cols-[280px_1fr]">
            <Cartao className="!p-2">
              <ul>{cs.map((c) => (
                <li key={c.id}><button onClick={() => setAberta(c.id)} className={`w-full rounded-lg p-3 text-left ${aberta === c.id ? 'bg-marca-50' : 'hover:bg-stone-50'}`}>
                  <p className="flex justify-between text-sm font-semibold">{c.outro.nome}{c.naoLidas > 0 && <span className="rounded-full bg-sky-600 px-2 text-xs text-white">{c.naoLidas}</span>}</p>
                  {c.produto && <p className="truncate text-xs text-stone-500">Sobre: {c.produto.titulo}</p>}
                  <p className="truncate text-xs text-stone-600">{c.ultimaMensagem?.texto}</p>
                </button></li>
              ))}</ul>
            </Cartao>
            <Cartao className="flex min-h-[420px] flex-col">
              {conversa.dados ? (
                <>
                  <p className="border-b pb-2 font-semibold">{conversa.dados.outro.nome}{conversa.dados.produto && <span className="ml-2 text-xs font-normal text-stone-500">sobre {conversa.dados.produto.titulo}</span>}</p>
                  <div className="flex-1 space-y-2 overflow-y-auto py-3" style={{ maxHeight: 380 }}>
                    {conversa.dados.mensagens.map((m) => (
                      <div key={m.id} className={`flex ${m.autorId === usuario?.id ? 'justify-end' : 'justify-start'}`}>
                        <div className={`max-w-[75%] rounded-xl px-3 py-2 text-sm ${m.autorId === usuario?.id ? 'bg-marca-600 text-white' : 'bg-stone-100'}`}>{m.texto}<p className={`mt-0.5 text-[10px] ${m.autorId === usuario?.id ? 'text-marca-100' : 'text-stone-400'}`}>{dataHora(m.criadoEm)}</p></div>
                      </div>
                    ))}
                    <div ref={fim} />
                  </div>
                  <Erro texto={erro} />
                  <form className="flex gap-2 pt-2" onSubmit={(e) => { e.preventDefault(); void enviar(); }}>
                    <input className="campo" placeholder="Escreva uma mensagem…" value={texto} onChange={(e) => setTexto(e.target.value)} />
                    <button className="btn-primario" aria-label="Enviar"><Send size={16} /></button>
                  </form>
                </>
              ) : <Vazio texto="Selecione uma conversa." />}
            </Cartao>
          </div>
        )}
      </Estado>
    </div>
  );
}
