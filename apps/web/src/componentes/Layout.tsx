import { useState, type FormEvent, type ReactNode } from 'react';
import { BookOpen, Boxes, ClipboardList, LayoutDashboard, LogOut, MessageSquare, PackagePlus, Package, RotateCcw, Search, ShieldAlert, ShoppingBag, Store, Trophy, UserRound, Users, UserCheck, ScrollText, ShoppingCart, ArrowUp } from 'lucide-react';
import { Link, NavLink, useLocation, useNavigate, useSearchParams } from 'react-router-dom';
import { useEffect } from 'react';
import { useSessao } from '../sessao';

const Logo = ({ escuro }: { escuro?: boolean }) => (
  <span className={`flex items-center gap-2 font-display text-xl font-extrabold ${escuro ? 'text-white' : 'text-tinta-900'}`}>
    <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-marca-500 text-white shadow-sm"><BookOpen size={20} /></span>Estante Viva
  </span>
);

const FaixaDemo = () => {
  const { demo, restaurarDemo } = useSessao();
  if (!demo) return null;
  return (
    <div className="flex flex-wrap items-center justify-center gap-x-4 gap-y-1 bg-marca-500 px-4 py-1.5 text-center text-xs font-medium text-white">
      <span>Versão de demonstração: roda inteira no seu navegador. Senha de todas as contas: <b>demo123</b></span>
      <button className="inline-flex items-center gap-1 underline underline-offset-2" onClick={() => confirm('Apagar suas alterações e voltar aos dados de exemplo?') && restaurarDemo?.()}><RotateCcw size={12} /> Restaurar dados</button>
    </div>
  );
};

const TIPOS_MENU: [string, string][] = [['', 'Tudo'], ['hq', 'HQs'], ['manga', 'Mangás'], ['livro', 'Livros'], ['gibi', 'Gibis'], ['outro', 'Outros']];

function VoltarAoTopo() {
  const [ver, setVer] = useState(false);
  useEffect(() => { const f = () => setVer(window.scrollY > 900); window.addEventListener('scroll', f, { passive: true }); return () => window.removeEventListener('scroll', f); }, []);
  if (!ver) return null;
  return <button aria-label="Voltar ao topo" onClick={() => window.scrollTo({ top: 0, behavior: 'smooth' })} className="fixed bottom-5 right-5 z-40 rounded-full bg-tinta-900 p-3 text-white shadow-lg hover:bg-tinta-700"><ArrowUp size={20} /></button>;
}

function LayoutLoja({ children }: { children: ReactNode }) {
  const { usuario, sair, contadores } = useSessao();
  const nav = useNavigate();
  const loc = useLocation();
  const [params] = useSearchParams();
  const [q, setQ] = useState(params.get('q') ?? '');
  useEffect(() => { setQ(params.get('q') ?? ''); }, [params]);
  const tipoAtual = loc.pathname === '/' ? params.get('tipo') ?? '' : null;

  const buscar = (e: FormEvent) => { e.preventDefault(); nav(q.trim() ? `/?q=${encodeURIComponent(q.trim())}` : '/'); };
  return (
    <div className="min-h-screen">
      <FaixaDemo />
      <header className="sticky top-0 z-40 border-b border-stone-200/80 bg-white/90 backdrop-blur-xl">
        <div className="mx-auto flex max-w-7xl flex-wrap items-center gap-x-5 gap-y-3 px-4 py-3">
          <Link to="/"><Logo /></Link>
          <form onSubmit={buscar} className="order-3 relative w-full md:order-none md:flex-1">
            <Search size={18} className="absolute left-4 top-1/2 -translate-y-1/2 text-stone-400" />
            <input className="w-full rounded-full border border-stone-200 bg-stone-50 py-2.5 pl-11 pr-4 text-sm outline-none transition focus:border-marca-500 focus:bg-white focus:ring-4 focus:ring-marca-100" placeholder="Busque por título, autor ou editora" value={q} onChange={(e) => setQ(e.target.value)} aria-label="Buscar produtos" />
          </form>
          <div className="ml-auto flex items-center gap-1 md:ml-0">
            {usuario?.papel === 'comprador' && (<>
              <Link to="/pedidos" className="hidden items-center gap-1.5 rounded-full px-3 py-2 text-sm font-semibold text-stone-600 hover:bg-stone-100 sm:flex"><Package size={18} /> Pedidos</Link>
              <Link to="/carrinho" className="relative rounded-full p-2.5 text-stone-700 hover:bg-stone-100" aria-label="Carrinho"><ShoppingBag size={21} />{contadores.carrinho > 0 && <span className="absolute -right-0.5 -top-0.5 min-w-[18px] rounded-full bg-marca-500 px-1 text-center text-[10px] font-bold leading-[18px] text-white">{contadores.carrinho}</span>}</Link>
            </>)}
            {usuario && (
              <Link to="/mensagens" className="relative rounded-full p-2.5 text-stone-700 hover:bg-stone-100" aria-label="Mensagens"><MessageSquare size={20} />{contadores.mensagens > 0 && <span className="absolute -right-0.5 -top-0.5 min-w-[18px] rounded-full bg-sky-600 px-1 text-center text-[10px] font-bold leading-[18px] text-white">{contadores.mensagens}</span>}</Link>
            )}
            {usuario ? (
              <div className="ml-1 flex items-center gap-2 rounded-full border border-stone-200 py-1 pl-1 pr-3">
                <span className="flex h-7 w-7 items-center justify-center rounded-full bg-tinta-900 text-xs font-bold text-white">{usuario.nome[0]}</span>
                <span className="hidden text-sm font-semibold sm:inline">{usuario.nome.split(' ')[0]}</span>
                <button onClick={() => { sair(); nav('/'); }} aria-label="Sair" className="text-stone-500 hover:text-stone-900"><LogOut size={16} /></button>
              </div>
            ) : (
              <>
                <Link to="/entrar" className="btn-sec !rounded-full !py-2"><UserRound size={16} /> Entrar</Link>
                <Link to="/cadastrar" className="btn-escuro !rounded-full !py-2">Criar conta</Link>
              </>
            )}
          </div>
        </div>
        <nav className="mx-auto flex max-w-7xl items-center gap-1 overflow-x-auto px-4 pb-2.5 text-sm" aria-label="Categorias">
          {TIPOS_MENU.map(([t, rot]) => (
            <Link key={t} to={t ? `/?tipo=${t}` : '/'} className={`whitespace-nowrap rounded-full px-3.5 py-1.5 font-semibold transition ${tipoAtual === t ? 'bg-tinta-900 text-white' : 'text-stone-600 hover:bg-stone-100'}`}>{rot}</Link>
          ))}
          <span className="mx-2 h-4 w-px bg-stone-200" />
          <Link to="/vender" className="inline-flex items-center gap-1.5 whitespace-nowrap rounded-full px-3.5 py-1.5 font-semibold text-marca-600 hover:bg-marca-50"><Store size={15} /> Venda na Estante Viva</Link>
        </nav>
      </header>
      <main className="mx-auto max-w-7xl px-4 py-8">{children}</main>
      <footer className="mt-10 bg-tinta-900 text-stone-400">
        <div className="mx-auto grid max-w-7xl gap-8 px-4 py-10 text-sm sm:grid-cols-3">
          <div><Logo escuro /><p className="mt-3 max-w-xs">Marketplace de quadrinhos, mangás, gibis e livros de lojas independentes.</p></div>
          <div><p className="mb-2 font-semibold text-white">Como funciona</p><p>Frete grátis acima de R$ 150 por loja.<br />Prazo de entrega de 15 dias, com reclamação se atrasar.<br />Avaliações com fotos de quem comprou.</p></div>
          <div><p className="mb-2 font-semibold text-white">Projeto de portfólio</p><p>Pagamento simulado. Títulos, lojas e imagens são fictícios, gerados por código.</p></div>
        </div>
      </footer>
      <VoltarAoTopo />
    </div>
  );
}

function LayoutPainel({ children }: { children: ReactNode }) {
  const { usuario, sair, contadores } = useSessao();
  const nav = useNavigate();
  const admin = usuario?.papel === 'admin';
  const itens: [string, string, ReactNode][] = admin
    ? [['/admin', 'Visão geral', <LayoutDashboard size={18} />], ['/admin/vendedores', 'Vendedores', <UserCheck size={18} />], ['/admin/usuarios', 'Usuários', <Users size={18} />], ['/admin/rankings', 'Rankings', <Trophy size={18} />], ['/admin/pedidos', 'Pedidos', <ClipboardList size={18} />], ['/admin/estoque', 'Estoque', <Boxes size={18} />], ['/admin/reclamacoes', 'Reclamações', <ShieldAlert size={18} />], ['/admin/logins', 'Logins', <ScrollText size={18} />]]
    : [['/vendedor', 'Painel', <LayoutDashboard size={18} />], ['/vendedor/produtos', 'Meus produtos', <Package size={18} />], ['/vendedor/produtos/novo', 'Novo produto', <PackagePlus size={18} />], ['/vendedor/pedidos', 'Pedidos recebidos', <ClipboardList size={18} />], ['/mensagens', 'Mensagens', <MessageSquare size={18} />]];
  const link = ({ isActive }: { isActive: boolean }) => `flex items-center gap-3 whitespace-nowrap rounded-xl px-3.5 py-2.5 text-sm font-semibold transition ${isActive ? 'bg-marca-500 text-white shadow-sm' : 'text-stone-400 hover:bg-white/5 hover:text-white'}`;
  return (
    <div className="min-h-screen lg:flex">
      <aside className="bg-tinta-900 lg:sticky lg:top-0 lg:flex lg:h-screen lg:w-64 lg:shrink-0 lg:flex-col lg:p-4">
        <FaixaDemo />
        <div className="flex items-center justify-between px-4 py-3 lg:px-2 lg:py-4"><Link to={admin ? '/admin' : '/vendedor'}><Logo escuro /></Link>
          <button className="text-stone-400 hover:text-white lg:hidden" onClick={() => { sair(); nav('/'); }} aria-label="Sair"><LogOut size={18} /></button></div>
        <nav className="flex gap-1 overflow-x-auto px-3 pb-3 lg:flex-1 lg:flex-col lg:overflow-visible lg:px-0">
          {itens.map(([to, rot, ic]) => (
            <NavLink key={to} to={to} end className={link}>{ic}{rot}{to === '/mensagens' && contadores.mensagens > 0 && <span className="ml-auto rounded-full bg-sky-500 px-1.5 text-[10px] font-bold text-white">{contadores.mensagens}</span>}</NavLink>
          ))}
          <Link to="/" className="flex items-center gap-3 whitespace-nowrap rounded-xl px-3.5 py-2.5 text-sm font-semibold text-stone-400 hover:bg-white/5 hover:text-white lg:mt-3 lg:border-t lg:border-white/10 lg:pt-4"><ShoppingCart size={18} /> Ver a loja</Link>
        </nav>
        <div className="hidden rounded-2xl bg-white/5 p-3 lg:block">
          <p className="truncate text-sm font-bold text-white">{usuario?.nomeLoja ?? usuario?.nome}</p>
          <p className="text-xs capitalize text-stone-400">{usuario?.papel}</p>
          <button className="mt-2 flex items-center gap-2 text-xs font-semibold text-stone-400 hover:text-white" onClick={() => { sair(); nav('/'); }}><LogOut size={14} /> Sair</button>
        </div>
      </aside>
      <main className="min-w-0 flex-1 px-4 py-6 lg:px-8 lg:py-8"><div className="mx-auto max-w-6xl">{children}</div></main>
      <VoltarAoTopo />
    </div>
  );
}

export function Layout({ children }: { children: ReactNode }) {
  const { usuario } = useSessao();
  const loc = useLocation();
  useEffect(() => { window.scrollTo(0, 0); }, [loc.pathname]);
  return usuario && usuario.papel !== 'comprador' ? <LayoutPainel>{children}</LayoutPainel> : <LayoutLoja>{children}</LayoutLoja>;
}
