import { useState } from 'react';
import { data } from '../../api/formato';
import { Erro, Selo, Sentinela, Tabela, Titulo, useInfinita } from '../../componentes/ui';
import { useSessao } from '../../sessao';
import { mascaraTelefone } from '../../utils/mascaras';

export function Usuarios() {
  const { api, usuario } = useSessao();
  const [q, setQ] = useState('');
  const [papel, setPapel] = useState('');
  const l = useInfinita((pagina) => api.admin.usuarios({ q: q || undefined, papel: (papel || undefined) as never, pagina, porPagina: 15 }), [q, papel]);
  const [erro, setErro] = useState<string | null>(null);
  async function rodar(fn: () => Promise<unknown>) { setErro(null); try { await fn(); l.reiniciar(); } catch (x) { setErro((x as Error).message); } }
  return (
    <div className="animate-subir">
      <Titulo sub={l.inicial ? undefined : `${l.total} usuários`}>Usuários</Titulo>
      <div className="mb-4 flex flex-wrap gap-3">
        <input className="campo !w-72 !rounded-full" placeholder="Buscar por nome ou e-mail" value={q} onChange={(e) => setQ(e.target.value)} />
        <select className="campo !w-auto !rounded-full" value={papel} onChange={(e) => setPapel(e.target.value)}><option value="">Todos os papéis</option><option value="comprador">Compradores</option><option value="vendedor">Vendedores</option><option value="admin">Admins</option></select>
      </div>
      <Erro texto={erro} />
      <div className="cartao !p-2">
        <Tabela carregando={l.inicial} colunas={['Nome', 'E-mail', 'Telefone', 'Papel', 'Loja', 'Cadastro', 'Situação', '']} vazio="Nenhum usuário encontrado.">
          {l.itens.map((u) => (
            <tr key={u.id}>
              <td className="td font-bold">{u.nome}</td><td className="td">{u.email}</td><td className="td text-xs">{u.telefone ? mascaraTelefone(u.telefone) : '—'}</td><td className="td capitalize">{u.papel}</td><td className="td">{u.nomeLoja ?? '—'}</td><td className="td">{data(u.criadoEm)}</td><td className="td"><Selo status={u.status} /></td>
              <td className="td">
                {u.id !== usuario?.id && u.status === 'ativo' && u.papel !== 'admin' && <button className="btn-sec !px-3 !py-1.5" onClick={() => confirm(`Bloquear ${u.nome}? A sessão dele cai na hora.`) && rodar(() => api.admin.bloquear({ id: u.id }))}>Bloquear</button>}
                {u.status === 'bloqueado' && <button className="btn-primario !px-3 !py-1.5" onClick={() => rodar(() => api.admin.desbloquear({ id: u.id }))}>Desbloquear</button>}
              </td>
            </tr>
          ))}
        </Tabela>
        <Sentinela l={l} unidade="usuários" />
      </div>
    </div>
  );
}
