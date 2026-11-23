import { useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import { Check, Package, Truck, XCircle } from 'lucide-react';
import { brl, dataHora } from '../api/formato';
import { Arte, Campo, Cartao, Erro, Estado, Estrelas, Lightbox, Modal, Selo, SeletorNota, Titulo, UploadFotos, useCarregar } from '../componentes/ui';
import { useSessao } from '../sessao';

function Linha({ ok, icone, titulo, quando }: { ok: boolean; icone: JSX.Element; titulo: string; quando?: string | null }) {
  return (
    <li className={`flex items-center gap-3 ${ok ? 'text-stone-900' : 'text-stone-400'}`}>
      <span className={`flex h-8 w-8 items-center justify-center rounded-full ${ok ? 'bg-emerald-100 text-emerald-700' : 'bg-stone-100'}`}>{icone}</span>
      <span className="text-sm font-semibold">{titulo}</span><span className="text-xs text-stone-500">{ok ? dataHora(quando) : ''}</span>
    </li>
  );
}

/** Miniatura do item: a arte vem do produto (busca o detalhe só para pegar tipo/cor). */
function PedidoCapa({ produtoId, titulo }: { produtoId: number; titulo: string }) {
  const { api } = useSessao();
  const r = useCarregar(() => api.catalogo.detalhe({ id: produtoId }).catch(() => null), [produtoId]);
  const p = r.dados?.produto;
  return p ? <Arte p={p} className="aspect-[5/7] w-10 rounded object-cover" /> : <div className="esqueleto aspect-[5/7] w-10" title={titulo} />;
}

export function PedidoDetalhe() {
  const { api, usuario } = useSessao();
  const { id } = useParams();
  const r = useCarregar(() => api.pedidos.detalhe({ id: Number(id) }), [id]);
  const [erro, setErro] = useState<string | null>(null);
  const [modal, setModal] = useState<null | 'reclamar' | 'enviar' | 'avaliar'>(null);
  const [texto, setTexto] = useState('');
  const [notaVend, setNotaVend] = useState(0);
  const [comVend, setComVend] = useState('');
  const [notas, setNotas] = useState<Record<number, { nota: number; comentario: string; fotos: string[] }>>({});
  const [ampliar, setAmpliar] = useState<string[] | null>(null);

  async function rodar(fn: () => Promise<unknown>, fechar = true) {
    setErro(null);
    try { await fn(); if (fechar) setModal(null); setTexto(''); await r.recarregar(); } catch (x) { setErro((x as Error).message); }
  }

  return (
    <Estado r={r}>
      {({ pedido: p, acoes, avaliacoes }) => {
        const comprador = usuario?.papel === 'comprador';
        const jaAvaliouProduto = (pid: number) => avaliacoes.produtos.find((a) => a.produtoId === pid);
        return (
          <div className="animate-subir space-y-5">
            <Titulo acao={<Selo status={p.status} />}>Pedido <span className="font-mono text-lg">{p.codigo}</span></Titulo>
            <Link to={usuario?.papel === 'vendedor' ? '/vendedor/pedidos' : usuario?.papel === 'admin' ? '/admin/pedidos' : '/pedidos'} className="text-sm text-marca-600">← Voltar para a lista</Link>
            <Erro texto={erro} />

            <div className="grid gap-5 lg:grid-cols-[1fr_340px]">
              <div className="space-y-5">
                <Cartao titulo="Acompanhamento">
                  <ul className="space-y-3">
                    <Linha ok icone={<Check size={16} />} titulo="Pedido realizado e pago" quando={p.pagoEm ?? p.criadoEm} />
                    <Linha ok={!!p.enviadoEm} icone={<Truck size={16} />} titulo={p.codigoRastreio ? `Enviado (rastreio ${p.codigoRastreio})` : 'Enviado pela loja'} quando={p.enviadoEm} />
                    <Linha ok={p.status === 'entregue'} icone={<Package size={16} />} titulo="Recebido pelo comprador" quando={p.entregueEm} />
                    {p.status === 'cancelado' && <Linha ok icone={<XCircle size={16} />} titulo="Pedido cancelado" quando={null} />}
                  </ul>
                  {p.prazoEntregaEm && p.status === 'enviado' && <p className="mt-3 text-sm text-stone-600">Prazo de entrega: <b>{dataHora(p.prazoEntregaEm)}</b></p>}
                  {p.reclamacao && (
                    <div className="mt-4 rounded-lg bg-red-50 p-3 text-sm"><p className="font-semibold text-red-800">Reclamação ({p.reclamacao.status})</p><p>{p.reclamacao.motivo}</p>{p.reclamacao.respostaAdmin && <p className="mt-1 text-stone-700"><b>Resposta:</b> {p.reclamacao.respostaAdmin}</p>}</div>
                  )}
                  <div className="mt-4 flex flex-wrap gap-2">
                    {acoes.podeMarcarEnviado && <button className="btn-primario" onClick={() => setModal('enviar')}><Truck size={16} /> Informar envio</button>}
                    {acoes.podeMarcarRecebido && <button className="btn-primario" onClick={() => rodar(() => api.pedidos.marcarRecebido({ id: p.id }))}><Check size={16} /> Marcar como recebido</button>}
                    {acoes.podeReclamar && <button className="btn-perigo" onClick={() => setModal('reclamar')}>Abrir reclamação (prazo vencido)</button>}
                    {acoes.podeCancelar && <button className="btn-sec" onClick={() => confirm('Cancelar este pedido? O estoque será devolvido.') && rodar(() => api.pedidos.cancelar({ id: p.id }))}>Cancelar pedido</button>}
                  </div>
                  {comprador && p.status === 'enviado' && !acoes.podeReclamar && <p className="mt-3 text-xs text-stone-500">A reclamação só fica disponível depois que o prazo de entrega vencer.</p>}
                </Cartao>

                <Cartao titulo="Itens">
                  <ul className="divide-y divide-stone-100">
                    {p.itens.map((i) => {
                      const av = jaAvaliouProduto(i.produtoId);
                      const n = notas[i.produtoId] ?? { nota: 0, comentario: '', fotos: [] };
                      return (
                        <li key={i.id} className="py-3">
                          <div className="flex items-center gap-3"><Link to={`/produto/${i.produtoId}`}><PedidoCapa produtoId={i.produtoId} titulo={i.titulo} /></Link><Link className="flex-1 font-bold hover:text-marca-600" to={`/produto/${i.produtoId}`}>{i.titulo}</Link><span className="text-sm">{i.quantidade} × {brl(i.precoUnitarioCentavos)}</span></div>
                          {av && <div className="mt-1 text-sm"><div className="flex items-center gap-2"><Estrelas valor={av.nota} tamanho={14} /><span className="text-stone-600">{av.comentario}</span></div>{av.fotos.length > 0 && <div className="mt-2 flex gap-2">{av.fotos.map((f, k) => <button key={k} onClick={() => setAmpliar(av.fotos)} className="h-16 w-16 overflow-hidden rounded-lg ring-1 ring-stone-200"><img src={f} alt={`Sua foto ${k + 1}`} className="h-full w-full object-cover" /></button>)}</div>}</div>}
                          {acoes.podeAvaliar && !av && (
                            <div className="mt-2 space-y-2 rounded-lg bg-stone-50 p-3">
                              <p className="text-xs font-semibold text-stone-500">Avalie este produto</p>
                              <SeletorNota valor={n.nota} onChange={(nota) => setNotas({ ...notas, [i.produtoId]: { ...n, nota } })} />
                              <input className="campo" placeholder="Comentário (opcional)" value={n.comentario} onChange={(e) => setNotas({ ...notas, [i.produtoId]: { ...n, comentario: e.target.value } })} />
                              <UploadFotos fotos={n.fotos} onChange={(fotos) => setNotas({ ...notas, [i.produtoId]: { ...n, fotos } })} />
                              <button className="btn-primario !py-1.5" disabled={!n.nota} onClick={() => rodar(() => api.avaliacoes.avaliarProduto({ pedidoId: p.id, produtoId: i.produtoId, nota: n.nota, comentario: n.comentario || null, fotos: n.fotos }), false)}>Enviar avaliação</button>
                            </div>
                          )}
                        </li>
                      );
                    })}
                  </ul>
                </Cartao>

                {(avaliacoes.vendedor || acoes.podeAvaliar) && (
                  <Cartao titulo={`Avaliação da loja ${p.vendedor.nomeLoja}`}>
                    {avaliacoes.vendedor ? (
                      <div className="flex items-center gap-2"><Estrelas valor={avaliacoes.vendedor.nota} /><span className="text-sm text-stone-600">{avaliacoes.vendedor.comentario}</span></div>
                    ) : (
                      <div className="space-y-2">
                        <SeletorNota valor={notaVend} onChange={setNotaVend} />
                        <input className="campo" placeholder="Como foi a experiência com o vendedor? (opcional)" value={comVend} onChange={(e) => setComVend(e.target.value)} />
                        <button className="btn-primario !py-1.5" disabled={!notaVend} onClick={() => rodar(() => api.avaliacoes.avaliarVendedor({ pedidoId: p.id, nota: notaVend, comentario: comVend || null }), false)}>Avaliar vendedor</button>
                      </div>
                    )}
                  </Cartao>
                )}
              </div>

              <div className="space-y-5">
                <Cartao titulo="Valores">
                  <dl className="space-y-1 text-sm">
                    <div className="flex justify-between"><dt>Subtotal</dt><dd>{brl(p.subtotalCentavos)}</dd></div>
                    <div className="flex justify-between"><dt>Frete</dt><dd>{brl(p.freteCentavos)}</dd></div>
                    <div className="flex justify-between border-t pt-1 text-base font-bold"><dt>Total</dt><dd>{brl(p.totalCentavos)}</dd></div>
                    {usuario?.papel !== 'comprador' && <>
                      <div className="flex justify-between text-stone-500"><dt>Comissão da plataforma</dt><dd>− {brl(p.comissaoCentavos)}</dd></div>
                      <div className="flex justify-between font-semibold text-emerald-700"><dt>Líquido do vendedor</dt><dd>{brl(p.liquidoVendedorCentavos)}</dd></div>
                    </>}
                    <p className="pt-1 text-xs text-stone-500">Pagamento: {p.metodoPagamento} (simulado)</p>
                  </dl>
                </Cartao>
                <Cartao titulo="Entrega">
                  <p className="text-sm font-semibold">{p.enderecoNome}</p>
                  <p className="text-sm text-stone-600">{p.enderecoRua}, {p.enderecoNumero}{p.enderecoComplemento ? ` - ${p.enderecoComplemento}` : ''}<br />{p.enderecoBairro} · {p.enderecoCidade}/{p.enderecoUf}<br />CEP {p.enderecoCep}</p>
                </Cartao>
                <Cartao titulo="Partes">
                  <p className="text-sm">Comprador: <b>{p.comprador.nome}</b></p><p className="text-sm">Loja: <b>{p.vendedor.nomeLoja}</b></p>
                </Cartao>
              </div>
            </div>

            {ampliar && <Lightbox fotos={ampliar} inicio={0} onFechar={() => setAmpliar(null)} />}
            {modal === 'reclamar' && (
              <Modal titulo="Abrir reclamação" onFechar={() => setModal(null)}>
                <div className="space-y-3"><Campo rotulo="O que aconteceu?"><textarea className="campo" rows={4} value={texto} onChange={(e) => setTexto(e.target.value)} placeholder="Mínimo de 10 caracteres" /></Campo><Erro texto={erro} /><button className="btn-perigo w-full" disabled={texto.trim().length < 10} onClick={() => rodar(() => api.reclamacoes.abrir({ pedidoId: p.id, motivo: texto }))}>Enviar reclamação</button></div>
              </Modal>
            )}
            {modal === 'enviar' && (
              <Modal titulo="Informar envio" onFechar={() => setModal(null)}>
                <div className="space-y-3"><Campo rotulo="Código de rastreio"><input className="campo" value={texto} onChange={(e) => setTexto(e.target.value)} placeholder="Ex.: BR123456789BR" /></Campo><Erro texto={erro} /><button className="btn-primario w-full" disabled={texto.trim().length < 5} onClick={() => rodar(() => api.pedidos.marcarEnviado({ id: p.id, codigoRastreio: texto }))}>Confirmar envio</button></div>
              </Modal>
            )}
          </div>
        );
      }}
    </Estado>
  );
}
