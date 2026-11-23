import { useState, type FormEvent, type ReactNode } from 'react';
import { CheckCircle2 } from 'lucide-react';
import { Link, useNavigate } from 'react-router-dom';
import { Arte, Campo, Erro, InputMascara } from '../componentes/ui';
import { useSessao } from '../sessao';
import { mascaraDocumento, mascaraTelefone } from '../utils/mascaras';

const CONTAS_DEMO = [['Comprador', 'comprador1@mkt.demo'], ['Vendedor', 'vendedor1@mkt.demo'], ['Admin', 'admin@mkt.demo'], ['Vendedor pendente', 'vendedor5@mkt.demo']] as const;
const CAPAS = [
  { titulo: 'Cometa Rubro', autor: 'M. Aoki', tipo: 'manga', cor: '#e11d48' },
  { titulo: 'Turma do Sertão', autor: 'Dudu', tipo: 'gibi', cor: '#ea580c' },
  { titulo: 'A Casa dos Ventos Antigos', autor: 'Helena Prado', tipo: 'livro', cor: '#0f766e' },
] as const;

/** Moldura das telas de acesso: formulário de um lado, vitrine ilustrada do outro. */
function Moldura({ titulo, sub, children, rodape }: { titulo: string; sub: string; children: ReactNode; rodape?: ReactNode }) {
  return (
    <div className="mx-auto grid max-w-5xl overflow-hidden rounded-3xl border border-stone-200/80 bg-white shadow-suave md:grid-cols-[1fr_0.8fr]">
      <div className="p-7 sm:p-10">
        <h1 className="text-3xl font-extrabold">{titulo}</h1>
        <p className="mb-6 mt-1 text-sm text-stone-500">{sub}</p>
        {children}
        {rodape && <div className="mt-6 text-center text-sm text-stone-600">{rodape}</div>}
      </div>
      <div className="relative hidden items-center justify-center overflow-hidden bg-tinta-900 p-8 md:flex" aria-hidden>
        <div className="absolute -right-10 -top-10 h-64 w-64 rounded-full bg-marca-500/30 blur-3xl" />
        <div className="relative h-72 w-56">{CAPAS.map((c, i) => <Arte key={c.titulo} p={c as never} loading="eager" className="absolute h-64 rounded-lg shadow-2xl ring-1 ring-white/10" style={{ left: i * 30, top: i * 16, transform: `rotate(${(i - 1) * 8}deg)` } as never} />)}</div>
      </div>
    </div>
  );
}

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
    <Moldura titulo="Bem-vindo de volta" sub="Entre para comprar, vender ou administrar." rodape={<>Novo por aqui? <Link className="font-bold text-marca-600" to="/cadastrar">Criar conta</Link> · <Link className="font-bold text-marca-600" to="/vender">Quero vender</Link></>}>
      <form onSubmit={enviar} className="space-y-4">
        <Campo rotulo="E-mail"><input className="campo" type="email" required value={email} onChange={(e) => setEmail(e.target.value)} autoComplete="username" /></Campo>
        <Campo rotulo="Senha"><input className="campo" type="password" required value={senha} onChange={(e) => setSenha(e.target.value)} autoComplete="current-password" /></Campo>
        <Erro texto={erro} />
        <button className="btn-primario w-full !py-3" disabled={enviando}>{enviando ? 'Entrando…' : 'Entrar'}</button>
      </form>
      {demo && (
        <div className="mt-6 rounded-2xl bg-stone-50 p-4">
          <p className="mb-2 text-xs font-semibold text-stone-500">Contas de demonstração (senha: demo123)</p>
          <div className="flex flex-wrap gap-2">{CONTAS_DEMO.map(([r, m]) => <button key={m} type="button" className="chip !py-1 text-xs" onClick={() => { setEmail(m); setSenha('demo123'); }}>{r}</button>)}</div>
        </div>
      )}
    </Moldura>
  );
}

export function CadastrarComprador() {
  const { api, entrar } = useSessao();
  const nav = useNavigate();
  const [f, setF] = useState({ nome: '', email: '', telefone: '', senha: '' });
  const [erro, setErro] = useState<string | null>(null);
  async function enviar(e: FormEvent) {
    e.preventDefault(); setErro(null);
    try { await api.auth.cadastrarComprador(f); await entrar(f.email, f.senha); nav('/'); } catch (x) { setErro((x as Error).message); }
  }
  return (
    <Moldura titulo="Criar conta" sub="Leva um minuto. Sem cobrança." rodape={<>Já tem conta? <Link className="font-bold text-marca-600" to="/entrar">Entrar</Link></>}>
      <form onSubmit={enviar} className="space-y-4">
        <Campo rotulo="Nome"><input className="campo" required autoComplete="name" value={f.nome} onChange={(e) => setF({ ...f, nome: e.target.value })} /></Campo>
        <Campo rotulo="E-mail"><input className="campo" type="email" required autoComplete="email" value={f.email} onChange={(e) => setF({ ...f, email: e.target.value })} /></Campo>
        <Campo rotulo="Telefone com DDD (opcional)"><InputMascara mascara={mascaraTelefone} className="campo" autoComplete="tel-national" placeholder="(85) 99999-0000" value={f.telefone} onChange={(v) => setF({ ...f, telefone: v })} /></Campo>
        <Campo rotulo="Senha (mínimo 8 caracteres)"><input className="campo" type="password" required minLength={8} autoComplete="new-password" value={f.senha} onChange={(e) => setF({ ...f, senha: e.target.value })} /></Campo>
        <Erro texto={erro} />
        <button className="btn-primario w-full !py-3">Criar conta</button>
      </form>
    </Moldura>
  );
}

export function SerVendedor() {
  const { api } = useSessao();
  const [f, setF] = useState({ nome: '', email: '', telefone: '', senha: '', nomeLoja: '', documento: '', descricaoLoja: '' });
  const [erro, setErro] = useState<string | null>(null);
  const [ok, setOk] = useState(false);
  const set = (k: keyof typeof f) => (e: { target: { value: string } }) => setF({ ...f, [k]: e.target.value });
  async function enviar(e: FormEvent) {
    e.preventDefault(); setErro(null);
    try { await api.auth.solicitarCadastroVendedor(f); setOk(true); } catch (x) { setErro((x as Error).message); }
  }
  if (ok) return (
    <div className="mx-auto max-w-md rounded-3xl border border-stone-200/80 bg-white p-10 text-center shadow-suave">
      <CheckCircle2 size={48} className="mx-auto text-emerald-500" /><h1 className="mt-3 text-2xl font-extrabold">Solicitação enviada!</h1>
      <p className="mt-2 text-sm text-stone-600">Um administrador vai analisar o cadastro da sua loja. Você só consegue entrar depois da aprovação.</p><Link to="/entrar" className="btn-primario mt-6">Ir para o login</Link>
    </div>
  );
  return (
    <Moldura titulo="Venda na Estante Viva" sub="Seu cadastro passa por uma avaliação do administrador antes de a loja ser liberada.">
      <form onSubmit={enviar} className="grid gap-4 sm:grid-cols-2">
        <Campo rotulo="Seu nome"><input className="campo" required autoComplete="name" value={f.nome} onChange={set('nome')} /></Campo>
        <Campo rotulo="Nome da loja"><input className="campo" required value={f.nomeLoja} onChange={set('nomeLoja')} /></Campo>
        <Campo rotulo="E-mail"><input className="campo" type="email" required autoComplete="email" value={f.email} onChange={set('email')} /></Campo>
        <Campo rotulo="Telefone com DDD"><InputMascara mascara={mascaraTelefone} className="campo" required autoComplete="tel-national" placeholder="(85) 99999-0000" value={f.telefone} onChange={(v) => setF({ ...f, telefone: v })} /></Campo>
        <Campo rotulo="CPF ou CNPJ" dica="A máscara muda sozinha conforme você digita."><InputMascara mascara={mascaraDocumento} className="campo" required placeholder="000.000.000-00" value={f.documento} onChange={(v) => setF({ ...f, documento: v })} /></Campo>
        <Campo rotulo="Senha (mínimo 8 caracteres)"><input className="campo" type="password" required minLength={8} autoComplete="new-password" value={f.senha} onChange={set('senha')} /></Campo>
        <div className="sm:col-span-2"><Campo rotulo="Conte sobre a loja"><textarea className="campo" rows={3} required minLength={10} value={f.descricaoLoja} onChange={set('descricaoLoja')} /></Campo></div>
        <div className="space-y-3 sm:col-span-2"><Erro texto={erro} /><button className="btn-primario w-full !py-3">Enviar para avaliação</button></div>
      </form>
    </Moldura>
  );
}
