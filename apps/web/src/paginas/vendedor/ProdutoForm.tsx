import { useEffect, useState, type FormEvent } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { TIPOS_PRODUTO } from '@mkt/core';
import { reaisParaCentavos, ROTULO_TIPO } from '../../api/formato';
import { Campo, Cartao, Erro, InputMascara, Titulo } from '../../componentes/ui';
import { mascaraMoeda } from '../../utils/mascaras';
import { useSessao } from '../../sessao';

const vazio = { titulo: '', descricao: '', tipo: 'hq', autor: '', editora: '', estado: 'novo', preco: '', estoque: '1' };

export function ProdutoForm() {
  const { api } = useSessao();
  const { id } = useParams();
  const nav = useNavigate();
  const [f, setF] = useState(vazio);
  const [status, setStatus] = useState<'ativo' | 'inativo'>('ativo');
  const [erro, setErro] = useState<string | null>(null);
  const [salvo, setSalvo] = useState(false);
  const set = (k: keyof typeof vazio) => (e: { target: { value: string } }) => setF({ ...f, [k]: e.target.value });

  useEffect(() => {
    if (!id) { setF(vazio); return; }
    api.produtos.obter({ id: Number(id) }).then((p) => { setF({ titulo: p.titulo, descricao: p.descricao, tipo: p.tipo, autor: p.autor, editora: p.editora, estado: p.estado, preco: mascaraMoeda(String(p.precoCentavos)), estoque: String(p.estoque) }); setStatus(p.status as 'ativo' | 'inativo'); }).catch((x: Error) => setErro(x.message));
  }, [id, api]);

  async function enviar(e: FormEvent) {
    e.preventDefault(); setErro(null); setSalvo(false);
    const dados = { titulo: f.titulo, descricao: f.descricao, tipo: f.tipo as never, autor: f.autor, editora: f.editora, estado: f.estado as never, precoCentavos: reaisParaCentavos(f.preco), estoque: Number(f.estoque) };
    try {
      if (id) { await api.produtos.atualizar({ id: Number(id), ...dados }); setSalvo(true); }
      else { await api.produtos.cadastrar(dados); nav('/vendedor/produtos'); }
    } catch (x) { setErro((x as Error).message); }
  }
  async function alternar() {
    const novo = status === 'ativo' ? 'inativo' : 'ativo';
    try { await api.produtos.alterarStatus({ id: Number(id), status: novo }); setStatus(novo); } catch (x) { setErro((x as Error).message); }
  }

  return (
    <div className="mx-auto max-w-2xl">
      <Titulo acao={id && <button className="btn-sec" onClick={alternar}>{status === 'ativo' ? 'Pausar vendas' : 'Reativar'}</button>}>{id ? 'Editar produto' : 'Cadastrar produto'}</Titulo>
      <Cartao>
        <form onSubmit={enviar} className="grid gap-4 sm:grid-cols-2">
          <div className="sm:col-span-2"><Campo rotulo="Título"><input className="campo" required value={f.titulo} onChange={set('titulo')} /></Campo></div>
          <Campo rotulo="Autor"><input className="campo" required value={f.autor} onChange={set('autor')} /></Campo>
          <Campo rotulo="Editora"><input className="campo" required value={f.editora} onChange={set('editora')} /></Campo>
          <Campo rotulo="Tipo"><select className="campo" value={f.tipo} onChange={set('tipo')}>{TIPOS_PRODUTO.map((t) => <option key={t} value={t}>{ROTULO_TIPO[t]}</option>)}</select></Campo>
          <Campo rotulo="Estado"><select className="campo" value={f.estado} onChange={set('estado')}><option value="novo">Novo</option><option value="usado">Usado</option></select></Campo>
          <Campo rotulo="Preço (R$)"><InputMascara mascara={mascaraMoeda} className="campo" required placeholder="29,90" value={f.preco} onChange={(v) => setF({ ...f, preco: v })} /></Campo>
          <Campo rotulo="Quantidade em estoque"><input className="campo" type="number" min={0} required value={f.estoque} onChange={set('estoque')} /></Campo>
          <div className="sm:col-span-2"><Campo rotulo="Descrição"><textarea className="campo" rows={4} required minLength={10} value={f.descricao} onChange={set('descricao')} /></Campo></div>
          <div className="space-y-3 sm:col-span-2"><Erro texto={erro} />{salvo && <p className="text-sm font-semibold text-emerald-700">Alterações salvas.</p>}<button className="btn-primario w-full">{id ? 'Salvar alterações' : 'Cadastrar produto'}</button></div>
        </form>
      </Cartao>
    </div>
  );
}
