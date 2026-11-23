import { type ReactNode } from 'react';
import { BookOpen, LogOut, MessageSquare, RotateCcw, ShoppingCart } from 'lucide-react';
import { Link, NavLink, useNavigate } from 'react-router-dom';
import { useSessao } from '../sessao';

const link = ({ isActive }: { isActive: boolean }) => `rounded-md px-3 py-1.5 text-sm font-medium ${isActive ? 'bg-marca-100 text-marca-700' : 'text-stone-600 hover:bg-stone-100'}`;

export function Layout({ children }: { children: ReactNode }) {
  const { usuario, sair, contadores, demo, restaurarDemo } = useSessao();
  const nav = useNavigate();

  const menu: [string, string][] =
    usuario?.papel === 'admin'
      ? [['/admin', 'Visão geral'], ['/admin/vendedores', 'Vendedores'], ['/admin/usuarios', 'Usuários'], ['/admin/rankings', 'Rankings'], ['/admin/pedidos', 'Pedidos'], ['/admin/estoque', 'Estoque'], ['/admin/reclamacoes', 'Reclamações'], ['/admin/logins', 'Logins']]
      : usuario?.papel === 'vendedor'
        ? [['/vendedor', 'Painel'], ['/vendedor/produtos', 'Meus produtos'], ['/vendedor/produtos/novo', 'Novo produto'], ['/vendedor/pedidos', 'Pedidos recebidos']]
        : [['/', 'Loja'], ...(usuario ? ([['/pedidos', 'Meus pedidos']] as [string, string][]) : [])];

  return (
    <div className="min-h-screen">
      {demo && (
        <div className="flex flex-wrap items-center justify-center gap-3 bg-stone-900 px-4 py-1.5 text-center text-xs text-stone-200">
          <span>Versão de demonstração: roda inteira no seu navegador, sem servidor. Senha de todas as contas: <b>demo123</b>.</span>
          <button className="inline-flex items-center gap-1 underline" onClick={() => confirm('Apagar suas alterações e voltar aos dados de exemplo?') && restaurarDemo?.()}><RotateCcw size={12} /> Restaurar dados</button>
        </div>
      )}
      <header className="sticky top-0 z-40 border-b border-stone-200 bg-white/95 backdrop-blur">
        <div className="mx-auto flex max-w-7xl flex-wrap items-center gap-x-4 gap-y-2 px-4 py-3">
          <Link to={usuario?.papel === 'admin' ? '/admin' : usuario?.papel === 'vendedor' ? '/vendedor' : '/'} className="flex items-center gap-2 text-lg font-extrabold text-marca-700"><BookOpen size={22} /> Estante Viva</Link>
          <nav className="flex flex-1 flex-wrap items-center gap-1">{menu.map(([to, rotulo]) => <NavLink key={to} to={to} end className={link}>{rotulo}</NavLink>)}</nav>
          <div className="flex items-center gap-2">
            {usuario?.papel === 'comprador' && (
              <Link to="/carrinho" className="relative rounded-md p-2 text-stone-600 hover:bg-stone-100" aria-label="Carrinho"><ShoppingCart size={20} />{contadores.carrinho > 0 && <span className="absolute -right-0.5 -top-0.5 rounded-full bg-marca-600 px-1.5 text-[10px] font-bold text-white">{contadores.carrinho}</span>}</Link>
            )}
            {usuario && usuario.papel !== 'admin' && (
              <Link to="/mensagens" className="relative rounded-md p-2 text-stone-600 hover:bg-stone-100" aria-label="Mensagens"><MessageSquare size={20} />{contadores.mensagens > 0 && <span className="absolute -right-0.5 -top-0.5 rounded-full bg-sky-600 px-1.5 text-[10px] font-bold text-white">{contadores.mensagens}</span>}</Link>
            )}
            {usuario ? (
              <>
                <span className="hidden text-sm text-stone-600 sm:inline">{usuario.nomeLoja ?? usuario.nome} <span className="text-xs text-stone-400">({usuario.papel})</span></span>
                <button className="btn-sec !px-3 !py-1.5" onClick={() => { sair(); nav('/'); }}><LogOut size={16} /> Sair</button>
              </>
            ) : (
              <>
                <Link to="/entrar" className="btn-sec !py-1.5">Entrar</Link>
                <Link to="/cadastrar" className="btn-primario !py-1.5">Criar conta</Link>
              </>
            )}
          </div>
        </div>
      </header>
      <main className="mx-auto max-w-7xl px-4 py-6">{children}</main>
      <footer className="mx-auto max-w-7xl px-4 pb-8 pt-4 text-center text-xs text-stone-400">Projeto de portfólio · pagamento simulado · títulos e lojas fictícios</footer>
    </div>
  );
}
