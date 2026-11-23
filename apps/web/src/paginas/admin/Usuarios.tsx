import { useState } from 'react';
import { data } from '../../api/formato';
import { Erro, Estado, Paginacao, Selo, Tabela, Titulo, useCarregar } from '../../componentes/ui';
import { useSessao } from '../../sessao';

export function Usuarios() {
  const { api, usuario } = useSessao();
  const [q, setQ] = useState('');
  const [papel, setPapel] = useState('');
  const [pagina, setPagina] = useState(1);
  const r = useCarregar(() => api.admin.usuarios({ q: q || undefined, papel: (papel || undefined) as never, pagina }), [q, papel, pagina]);
  const [erro, setErro] = useState<string | null>(null);
  async function rodar(fn: () => Promise<unknown>) { setErro(null); try { await fn(); await r.recarregar(); } catch (x) { setErro((x as Error).message); } }
  return (
    <div>
      <Titulo>Usuários</Titulo>
      <div className="mb-4 flex flex-wrap gap-3">
        <input className="campo !w-64" placeholder="Buscar por nome ou e-mail" value={q} onChange={(e) => { setQ(e.target.value); setPagina(1); }} />
        <select className="campo !w-auto" value={papel} onChange={(e) => { setPapel(e.target.value); setPagina(1); }}><option value="">Todos os papéis</option><option value="comprador">Compradores</option><option value="vendedor">Vendedores</option><option value="admin">Admins</option></select>
      </div>
      <Erro texto={erro} />
      <Estado r={r}>
        {(p) => (
          <div className="cartao">
            <Tabela colunas={['Nome', 'E-mail', 'Papel', 'Loja', 'Cadastro', 'Situação', '']} vazio="Nenhum usuário encontrado.">
              {p.itens.map((u) => (
                <tr key={u.id}>
                  <td className="td font-semibold">{u.nome}</td><td className="td">{u.email}</td><td className="td">{u.papel}</td><td className="td">{u.nomeLoja ?? '—'}</td><td className="td">{data(u.criadoEm)}</td><td className="td"><Selo status={u.status} /></td>
                  <td className="td">
                    {u.id !== usuario?.id && u.status === 'ativo' && u.papel !== 'admin' && <button className="btn-sec !px-3 !py-1" onClick={() => confirm(`Bloquear ${u.nome}? A sessão dele cai na hora.`) && rodar(() => api.admin.bloquear({ id: u.id }))}>Bloquear</button>}
                    {u.status === 'bloqueado' && <button className="btn-primario !px-3 !py-1" onClick={() => rodar(() => api.admin.desbloquear({ id: u.id }))}>Desbloquear</button>}
                  </td>
                </tr>
              ))}
            </Tabela>
            <Paginacao p={p} onPagina={setPagina} />
          </div>
        )}
      </Estado>
    </div>
  );
}
