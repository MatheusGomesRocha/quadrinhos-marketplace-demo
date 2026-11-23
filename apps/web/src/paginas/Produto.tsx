import { useMemo, useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import { Camera, ChevronRight, MessageSquare, ShieldCheck, ShoppingBag, Store, Truck } from 'lucide-react';
import { brl, data, ROTULO_TIPO } from '../api/formato';
import { Arte, Campo, Cartao, Erro, Estado, Estrelas, Lightbox, Modal, useCarregar } from '../componentes/ui';
import { useSessao } from '../sessao';

const VISTAS = [['frente', 'Capa'], ['verso', 'Verso'], ['cenario', 'Em cena']] as const;

export function ProdutoPagina() {
  const { api, usuario, atualizarContadores } = useSessao();
  const { id } = useParams();
  const nav = useNavigate();
  const r = useCarregar(() => api.catalogo.detalhe({ id: Number(id) }), [id]);
  const [qtd, setQtd] = useState(1);
  const [vista, setVista] = useState<(typeof VISTAS)[number][0]>('frente');
  const [erro, setErro] = useState<string | null>(null);
  const [aviso, setAviso] = useState<string | null>(null);
  const [conversa, setConversa] = useState(false);
  const [texto, setTexto] = useState('');
  const [lightbox, setLightbox] = useState<{ fotos: string[]; i: number; legendas: string[] } | null>(null);

  const fotosClientes = useMemo(() => (r.dados?.avaliacoes ?? []).flatMap((a) => a.fotos.map((f) => ({ f, quem: a.compradorNome, nota: a.nota }))), [r.dados]);
  const distribuicao = useMemo(() => {
    const av = r.dados?.avaliacoes ?? [];
    return [5, 4, 3, 2, 1].map((n) => ({ n, qtd: av.filter((a) => Math.ceil(a.nota) === n).length, total: av.length }));
  }, [r.dados]);

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
    try { await api.mensagens.iniciar({ vendedorId: r.dados!.vendedor.id, produtoId: Number(id), texto }); atualizarContadores(); nav('/mensagens'); } catch (x) { setErro((x as Error).message); }
  }

  return (
    <Estado r={r}>
      {({ produto: p, vendedor, nota, avaliacoes }) => (
        <div className="animate-subir">
          <nav className="mb-5 flex items-center gap-1 text-sm text-stone-500" aria-label="Você está em"><Link to="/" className="hover:text-stone-900">Loja</Link><ChevronRight size={14} /><Link to={`/?tipo=${p.tipo}`} className="hover:text-stone-900">{ROTULO_TIPO[p.tipo]}</Link><ChevronRight size={14} /><span className="truncate text-stone-900">{p.titulo}</span></nav>

          <div className="grid gap-8 lg:grid-cols-[minmax(0,460px)_1fr]">
            <div className="lg:sticky lg:top-36 lg:self-start">
              <div className="flex gap-3">
                <div className="hidden flex-col gap-2 sm:flex">
                  {VISTAS.map(([v, rot]) => (
                    <button key={v} onClick={() => setVista(v)} className={`w-16 overflow-hidden rounded-xl border-2 bg-white p-0.5 transition ${vista === v ? 'border-marca-500' : 'border-transparent opacity-70 hover:opacity-100'}`} aria-label={rot}><Arte p={p} vista={v} className="aspect-[5/7] w-full rounded-lg object-cover" /></button>
                  ))}
                </div>
                <div className="flex-1 overflow-hidden rounded-3xl bg-gradient-to-b from-stone-100 to-stone-200/70 p-6 sm:p-8">
                  <Arte p={p} vista={vista} loading="eager" className="mx-auto aspect-[5/7] max-h-[560px] w-full rounded-lg object-cover shadow-2xl" />
                </div>
              </div>
              <div className="mt-3 flex justify-center gap-2 sm:hidden">{VISTAS.map(([v, rot]) => <button key={v} onClick={() => setVista(v)} className={`chip !py-1 text-xs ${vista === v ? 'chip-ativo' : ''}`}>{rot}</button>)}</div>
            </div>

            <div className="space-y-6">
              <div>
                <p className="text-xs font-bold uppercase tracking-wider text-marca-600">{ROTULO_TIPO[p.tipo]} · {p.estado === 'novo' ? 'Novo' : 'Usado'}</p>
                <h1 className="mt-1 text-3xl font-extrabold leading-tight sm:text-4xl">{p.titulo}</h1>
                <p className="mt-1 text-stone-600">{p.autor} · {p.editora}</p>
                <a href="#avaliacoes" className="mt-2 inline-block"><Estrelas valor={nota.media} total={nota.total} /></a>
              </div>

              <div className="rounded-2xl border border-stone-200/80 bg-white p-5 shadow-cartao">
                <p className="font-display text-4xl font-extrabold">{brl(p.precoCentavos)}</p>
                <p className="mt-1 flex items-center gap-1.5 text-sm text-stone-500"><Truck size={15} /> Frete R$ 15,00 · grátis acima de R$ 150,00 por loja</p>
                {p.estoque > 0 && p.status === 'ativo' ? (
                  !usuario ? (
                    <Link to="/entrar" className="btn-primario mt-4 w-full !py-3">Entre para comprar</Link>
                  ) : usuario.papel === 'comprador' ? (
                    <div className="mt-4 space-y-3">
                      <div className="flex flex-wrap items-end gap-3">
                        <Campo rotulo={`Quantidade (${p.estoque} disponíve${p.estoque === 1 ? 'l' : 'is'})`}><input className="campo !w-28" type="number" min={1} max={p.estoque} value={qtd} onChange={(e) => setQtd(Math.max(1, Math.min(p.estoque, Number(e.target.value) || 1)))} /></Campo>
                        <button className="btn-primario flex-1 !py-3" onClick={() => adicionar(true)}>Comprar agora</button>
                        <button className="btn-sec !py-3" onClick={() => adicionar(false)}><ShoppingBag size={16} /> Adicionar</button>
                      </div>
                      {aviso && <p className="text-sm text-emerald-700">{aviso} <Link className="font-semibold underline" to="/carrinho">Ver carrinho</Link></p>}
                      <Erro texto={erro} />
                    </div>
                  ) : <p className="mt-4 text-sm text-stone-500">Entre como comprador para adquirir este produto.</p>
                ) : <p className="mt-4 rounded-xl bg-stone-100 px-3 py-2.5 text-center text-sm font-semibold text-stone-600">Indisponível no momento</p>}
                <p className="mt-3 flex items-center gap-1.5 text-xs text-stone-500"><ShieldCheck size={14} /> Compra protegida: você pode reclamar se o prazo de entrega vencer.</p>
              </div>

              <section><h2 className="mb-2 text-lg font-extrabold">Sobre este exemplar</h2><p className="whitespace-pre-line leading-relaxed text-stone-700">{p.descricao}</p></section>

              <div className="flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-stone-200/80 bg-white p-5">
                <div className="flex items-center gap-3">
                  <span className="flex h-12 w-12 items-center justify-center rounded-2xl bg-tinta-900 text-white"><Store size={22} /></span>
                  <div><p className="font-bold">{vendedor.nomeLoja}</p><Estrelas valor={vendedor.nota.media} total={vendedor.nota.total} tamanho={13} /><p className="text-xs text-stone-500">{vendedor.vendasConcluidas} vendas concluídas</p></div>
                </div>
                {usuario?.papel === 'comprador' && <button className="btn-sec" onClick={() => setConversa(true)}><MessageSquare size={16} /> Falar com o vendedor</button>}
                {vendedor.descricaoLoja && <p className="w-full text-sm text-stone-600">{vendedor.descricaoLoja}</p>}
              </div>
            </div>
          </div>

          <section id="avaliacoes" className="mt-14 scroll-mt-40">
            <h2 className="mb-5 text-2xl font-extrabold">Avaliações de quem comprou</h2>
            {nota.total === 0 ? <Cartao><p className="text-sm text-stone-500">Ainda não há avaliações para este produto.</p></Cartao> : (
              <div className="grid gap-6 lg:grid-cols-[280px_1fr]">
                <div className="space-y-5">
                  <div className="cartao text-center"><p className="font-display text-5xl font-extrabold">{nota.media.toFixed(1)}</p><div className="mt-1 flex justify-center"><Estrelas valor={nota.media} tamanho={20} /></div><p className="mt-1 text-sm text-stone-500">{nota.total} {nota.total === 1 ? 'avaliação' : 'avaliações'}</p>
                    <div className="mt-4 space-y-1.5">{distribuicao.map((d) => <div key={d.n} className="flex items-center gap-2 text-xs"><span className="w-3 text-stone-500">{d.n}</span><div className="h-2 flex-1 overflow-hidden rounded-full bg-stone-100"><div className="h-full rounded-full bg-amber-400" style={{ width: `${d.total ? (d.qtd / d.total) * 100 : 0}%` }} /></div><span className="w-5 text-right text-stone-400">{d.qtd}</span></div>)}</div>
                  </div>
                  {fotosClientes.length > 0 && (
                    <div className="cartao"><p className="mb-3 flex items-center gap-2 text-sm font-bold"><Camera size={16} /> Fotos dos clientes ({fotosClientes.length})</p>
                      <div className="grid grid-cols-3 gap-2">{fotosClientes.slice(0, 6).map((f, k) => <button key={k} onClick={() => setLightbox({ fotos: fotosClientes.map((x) => x.f), i: k, legendas: fotosClientes.map((x) => x.quem) })} className="relative aspect-square overflow-hidden rounded-xl bg-stone-100"><img src={f.f} alt={`Foto de ${f.quem}`} loading="lazy" className="h-full w-full object-cover transition hover:scale-105" />{k === 5 && fotosClientes.length > 6 && <span className="absolute inset-0 flex items-center justify-center bg-black/55 text-sm font-bold text-white">+{fotosClientes.length - 5}</span>}</button>)}</div>
                    </div>
                  )}
                </div>
                <ul className="space-y-4">
                  {avaliacoes.map((a) => (
                    <li key={a.id} className="cartao">
                      <div className="flex items-center gap-3"><span className="flex h-9 w-9 items-center justify-center rounded-full bg-marca-100 text-sm font-bold text-marca-700">{a.compradorNome[0]}</span><div><p className="text-sm font-bold">{a.compradorNome}</p><p className="text-xs text-stone-400">Compra verificada · {data(a.criadoEm)}</p></div><span className="ml-auto"><Estrelas valor={a.nota} tamanho={15} /></span></div>
                      {a.comentario && <p className="mt-3 text-sm leading-relaxed text-stone-700">{a.comentario}</p>}
                      {a.fotos.length > 0 && <div className="mt-3 flex flex-wrap gap-2">{a.fotos.map((f, k) => <button key={k} onClick={() => setLightbox({ fotos: a.fotos, i: k, legendas: a.fotos.map(() => a.compradorNome) })} className="h-24 w-24 overflow-hidden rounded-xl bg-stone-100 ring-1 ring-stone-200"><img src={f} alt={`Foto de ${a.compradorNome}`} loading="lazy" className="h-full w-full object-cover transition hover:scale-105" /></button>)}</div>}
                    </li>
                  ))}
                </ul>
              </div>
            )}
          </section>

          {lightbox && <Lightbox fotos={lightbox.fotos} inicio={lightbox.i} onFechar={() => setLightbox(null)} legenda={(i) => <>Foto de <b>{lightbox.legendas[i]}</b></>} />}
          {conversa && (
            <Modal titulo={`Mensagem para ${vendedor.nomeLoja}`} onFechar={() => setConversa(false)}>
              <div className="space-y-3"><textarea className="campo" rows={4} placeholder="Escreva sua dúvida sobre o produto…" value={texto} onChange={(e) => setTexto(e.target.value)} /><Erro texto={erro} /><button className="btn-primario w-full" disabled={texto.trim().length < 2} onClick={falar}>Enviar</button></div>
            </Modal>
          )}
        </div>
      )}
    </Estado>
  );
}
