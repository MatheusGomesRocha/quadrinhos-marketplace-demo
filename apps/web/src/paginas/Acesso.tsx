import { useState, type FormEvent } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Campo, Cartao, Erro, Titulo } from '../componentes/ui';
import { useSessao } from '../sessao';

const CONTAS_DEMO = [
  ['Comprador', 'comprador1@mkt.demo'], ['Vendedor', 'vendedor1@mkt.demo'], ['Admin', 'admin@mkt.demo'], ['Vendedor pendente', 'vendedor5@mkt.demo'],
] as const;

export function Entrar() {
  const { entrar, demo } = useSessao();
  const nav = useNavigate();
  const [email, setEmail] = useState('');
  const [senha, setSenha] = useState('');
  const [erro, setErro] = useState<string | null>(null);
  const [enviando, setEnviando] = useState(false);

  async function enviar(e: FormEvent) {
    e.preventDefault();
    setErro(null); setEnviando(true);
    try {
      const u = await entrar(email, senha);
      nav(u.papel === 'admin' ? '/admin' : u.papel === 'vendedor' ? '/vendedor' : '/');
    } catch (x) { setErro((x as Error).message); } finally { setEnviando(false); }
  }

  return (
    <div className="mx-auto max-w-md">
      <Titulo>Entrar</Titulo>
      <Cartao>
        <form onSubmit={enviar} className="space-y-4">
          <Campo rotulo="E-mail"><input className="campo" type="email" required value={email} onChange={(e) => setEmail(e.target.value)} autoComplete="username" /></Campo>
          <Campo rotulo="Senha"><input className="campo" type="password" required value={senha} onChange={(e) => setSenha(e.target.value)} autoComplete="current-password" /></Campo>
          <Erro texto={erro} />
          <button className="btn-primario w-full" disabled={enviando}>{enviando ? 'Entrando…' : 'Entrar'}</button>
        </form>
        <p className="mt-4 text-center text-sm text-stone-600">Novo por aqui? <Link className="font-semibold text-marca-700" to="/cadastrar">Criar conta</Link> · <Link className="font-semibold text-marca-700" to="/vender">Quero vender</Link></p>
      </Cartao>
      {demo && (
        <Cartao titulo="Contas de demonstração (senha: demo123)" className="mt-4">
          <div className="flex flex-wrap gap-2">{CONTAS_DEMO.map(([r, m]) => <button key={m} type="button" className="btn-sec !py-1 text-xs" onClick={() => { setEmail(m); setSenha('demo123'); }}>{r}</button>)}</div>
        </Cartao>
      )}
    </div>
  );
}

export function CadastrarComprador() {
  const { api, entrar } = useSessao();
  const nav = useNavigate();
  const [f, setF] = useState({ nome: '', email: '', senha: '' });
  const [erro, setErro] = useState<string | null>(null);
  async function enviar(e: FormEvent) {
    e.preventDefault(); setErro(null);
    try { await api.auth.cadastrarComprador(f); await entrar(f.email, f.senha); nav('/'); } catch (x) { setErro((x as Error).message); }
  }
  return (
    <div className="mx-auto max-w-md">
      <Titulo>Criar conta de comprador</Titulo>
      <Cartao>
        <form onSubmit={enviar} className="space-y-4">
          <Campo rotulo="Nome"><input className="campo" required value={f.nome} onChange={(e) => setF({ ...f, nome: e.target.value })} /></Campo>
          <Campo rotulo="E-mail"><input className="campo" type="email" required value={f.email} onChange={(e) => setF({ ...f, email: e.target.value })} /></Campo>
          <Campo rotulo="Senha (mínimo 8 caracteres)"><input className="campo" type="password" required minLength={8} value={f.senha} onChange={(e) => setF({ ...f, senha: e.target.value })} /></Campo>
          <Erro texto={erro} />
          <button className="btn-primario w-full">Criar conta</button>
        </form>
      </Cartao>
    </div>
  );
}

export function SerVendedor() {
  const { api } = useSessao();
  const [f, setF] = useState({ nome: '', email: '', senha: '', nomeLoja: '', documento: '', descricaoLoja: '' });
  const [erro, setErro] = useState<string | null>(null);
  const [ok, setOk] = useState(false);
  const set = (k: keyof typeof f) => (e: { target: { value: string } }) => setF({ ...f, [k]: e.target.value });
  async function enviar(e: FormEvent) {
    e.preventDefault(); setErro(null);
    try { await api.auth.solicitarCadastroVendedor(f); setOk(true); } catch (x) { setErro((x as Error).message); }
  }
  if (ok) return (
    <div className="mx-auto max-w-md"><Cartao><h1 className="text-xl font-bold">Solicitação enviada!</h1><p className="mt-2 text-sm text-stone-600">Um administrador vai analisar o cadastro da sua loja. Você só consegue entrar depois da aprovação.</p><Link to="/entrar" className="btn-primario mt-4">Ir para o login</Link></Cartao></div>
  );
  return (
    <div className="mx-auto max-w-xl">
      <Titulo>Quero vender na Estante Viva</Titulo>
      <Cartao>
        <p className="mb-4 text-sm text-stone-600">Seu cadastro passa por uma avaliação do administrador antes de a loja ser liberada.</p>
        <form onSubmit={enviar} className="grid gap-4 sm:grid-cols-2">
          <Campo rotulo="Seu nome"><input className="campo" required value={f.nome} onChange={set('nome')} /></Campo>
          <Campo rotulo="Nome da loja"><input className="campo" required value={f.nomeLoja} onChange={set('nomeLoja')} /></Campo>
          <Campo rotulo="E-mail"><input className="campo" type="email" required value={f.email} onChange={set('email')} /></Campo>
          <Campo rotulo="CPF ou CNPJ"><input className="campo" required minLength={11} value={f.documento} onChange={set('documento')} /></Campo>
          <Campo rotulo="Senha (mínimo 8 caracteres)"><input className="campo" type="password" required minLength={8} value={f.senha} onChange={set('senha')} /></Campo>
          <div className="sm:col-span-2"><Campo rotulo="Conte sobre a loja"><textarea className="campo" rows={3} required minLength={10} value={f.descricaoLoja} onChange={set('descricaoLoja')} /></Campo></div>
          <div className="sm:col-span-2 space-y-3"><Erro texto={erro} /><button className="btn-primario w-full">Enviar para avaliação</button></div>
        </form>
      </Cartao>
    </div>
  );
}
