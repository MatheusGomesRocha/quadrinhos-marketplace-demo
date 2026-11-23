import { useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import { MessageSquare, ShoppingCart, Store } from 'lucide-react';
import { brl, data, ROTULO_TIPO } from '../api/formato';
import { Campo, Capa, Cartao, Erro, Estado, Estrelas, Modal, useCarregar } from '../componentes/ui';
import { useSessao } from '../sessao';

export function ProdutoPagina() {
  const { api, usuario, atualizarContadores } = useSessao();
  const { id } = useParams();
  const nav = useNavigate();
  const r = useCarregar(() => api.catalogo.detalhe({ id: Number(id) }), [id]);
  const [qtd, setQtd] = useState(1);
  const [erro, setErro] = useState<string | null>(null);
  const [aviso, setAviso] = useState<string | null>(null);
  const [conversa, setConversa] = useState(false);
  const [texto, setTexto] = useState('');

  async function adicionar(irParaCarrinho: boolean) {
    setErro(null); setAviso(null);
    try {
      await api.carrinho.adicionar({ produtoId: Number(id), quantidade: qtd });
      atualizarContadores();
      if (irParaCarrinho) nav('/carrinho'); else setAviso('Adicionado ao carrinho.');
    } catch (x) { setErro((x as Error).message); }
  }
  async function falar() {
    setErro(null);
    try {
      await api.mensagens.iniciar({ vendedorId: r.dados!.vendedor.id, produtoId: Number(id), texto });
      atualizarContadores(); nav('/mensagens');
    } catch (x) { setErro((x as Error).message); }
  }

  return (
    <Estado r={r}>
      {({ produto: p, vendedor, nota, avaliacoes }) => (
        <div className="grid gap-6 lg:grid-cols-[320px_1fr]">
          <Capa titulo={p.titulo} cor={p.cor} className="h-96" />
          <div className="space-y-5">
            <div>
              <p className="text-xs font-semibold uppercase text-marca-700">{ROTULO_TIPO[p.tipo]} · {p.estado}</p>
              <h1 className="text-3xl font-extrabold">{p.titulo}</h1>
              <p className="text-stone-600">{p.autor} · {p.editora}</p>
              <div className="mt-1"><Estrelas valor={nota.media} total={nota.total} /></div>
            </div>
            <p className="text-3xl font-bold">{brl(p.precoCentavos)}</p>
            <p className="whitespace-pre-line text-stone-700">{p.descricao}</p>

            {p.estoque > 0 && p.status === 'ativo' ? (
              !usuario ? (
                <Link to="/entrar" className="btn-primario">Entre para comprar</Link>
              ) : usuario.papel === 'comprador' ? (
                <div className="space-y-3">
                  <div className="flex flex-wrap items-end gap-3">
                    <Campo rotulo={`Quantidade (disponível: ${p.estoque})`}>
                      <input className="campo w-28" type="number" min={1} max={p.estoque} value={qtd} onChange={(e) => setQtd(Math.max(1, Math.min(p.estoque, Number(e.target.value) || 1)))} />
                    </Campo>
                    <button className="btn-primario" onClick={() => adicionar(false)}><ShoppingCart size={16} /> Adicionar ao carrinho</button>
                    <button className="btn-sec" onClick={() => adicionar(true)}>Comprar agora</button>
                  </div>
                  {aviso && <p className="text-sm text-emerald-700">{aviso} <Link className="underline" to="/carrinho">Ver carrinho</Link></p>}
                  <Erro texto={erro} />
                </div>
              ) : <p className="text-sm text-stone-500">Entre como comprador para adquirir este produto.</p>
            ) : <p className="rounded-lg bg-stone-200 px-3 py-2 text-sm font-semibold">Indisponível no momento</p>}

            <Cartao>
              <div className="flex flex-wrap items-center justify-between gap-3">
                <div>
                  <p className="flex items-center gap-2 font-semibold"><Store size={16} /> {vendedor.nomeLoja}</p>
                  <Estrelas valor={vendedor.nota.media} total={vendedor.nota.total} tamanho={14} />
                  <p className="text-xs text-stone-500">{vendedor.vendasConcluidas} vendas concluídas</p>
                </div>
                {usuario?.papel === 'comprador' && <button className="btn-sec" onClick={() => setConversa(true)}><MessageSquare size={16} /> Falar com o vendedor</button>}
              </div>
              {vendedor.descricaoLoja && <p className="mt-3 text-sm text-stone-600">{vendedor.descricaoLoja}</p>}
            </Cartao>

            <Cartao titulo={`Avaliações do produto (${nota.total})`}>
              {avaliacoes.length === 0 ? <p className="text-sm text-stone-500">Ainda não há avaliações.</p> : (
                <ul className="divide-y divide-stone-100">
                  {avaliacoes.map((a) => (
                    <li key={a.id} className="py-3"><div className="flex items-center gap-2"><Estrelas valor={a.nota} tamanho={14} /><span className="text-sm font-semibold">{a.compradorNome}</span><span className="text-xs text-stone-400">{data(a.criadoEm)}</span></div>{a.comentario && <p className="mt-1 text-sm text-stone-700">{a.comentario}</p>}</li>
                  ))}
                </ul>
              )}
            </Cartao>
          </div>
          {conversa && (
            <Modal titulo={`Mensagem para ${vendedor.nomeLoja}`} onFechar={() => setConversa(false)}>
              <div className="space-y-3">
                <textarea className="campo" rows={4} placeholder="Escreva sua dúvida sobre o produto…" value={texto} onChange={(e) => setTexto(e.target.value)} />
                <Erro texto={erro} />
                <button className="btn-primario w-full" disabled={texto.trim().length < 2} onClick={falar}>Enviar</button>
              </div>
            </Modal>
          )}
        </div>
      )}
    </Estado>
  );
}
