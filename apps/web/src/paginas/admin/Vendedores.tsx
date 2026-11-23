import { useState } from 'react';
import { data } from '../../api/formato';
import { Erro, Estado, Modal, Paginacao, Selo, Tabela, Titulo, useCarregar, Campo } from '../../componentes/ui';
import { useSessao } from '../../sessao';

export function Vendedores() {
  const { api } = useSessao();
  const [status, setStatus] = useState<'pendente' | 'ativo' | 'rejeitado' | ''>('pendente');
  const [pagina, setPagina] = useState(1);
  const r = useCarregar(() => api.admin.vendedores({ status: (status || undefined) as never, pagina }), [status, pagina]);
  const [rejeitando, setRejeitando] = useState<number | null>(null);
  const [motivo, setMotivo] = useState('');
  const [erro, setErro] = useState<string | null>(null);

  async function rodar(fn: () => Promise<unknown>) { setErro(null); try { await fn(); setRejeitando(null); setMotivo(''); await r.recarregar(); } catch (x) { setErro((x as Error).message); } }

  return (
    <div>
      <Titulo acao={<select className="campo !w-auto" value={status} onChange={(e) => { setStatus(e.target.value as typeof status); setPagina(1); }}><option value="pendente">Pendentes</option><option value="ativo">Aprovados</option><option value="rejeitado">Rejeitados</option><option value="">Todos</option></select>}>Solicitações de vendedores</Titulo>
      <Erro texto={erro} />
      <Estado r={r}>
        {(p) => (
          <div className="cartao">
            <Tabela colunas={['Loja', 'Responsável', 'E-mail', 'Documento', 'Pedido em', 'Situação', 'Descrição', '']} vazio="Nenhuma solicitação nesta lista.">
              {p.itens.map((v) => (
                <tr key={v.id}>
                  <td className="td font-semibold">{v.nomeLoja}</td><td className="td">{v.nome}</td><td className="td">{v.email}</td><td className="td">{v.documento}</td><td className="td">{data(v.criadoEm)}</td>
                  <td className="td"><Selo status={v.status} />{v.motivoRejeicao && <p className="text-xs text-stone-500">{v.motivoRejeicao}</p>}</td>
                  <td className="td max-w-xs text-xs text-stone-600">{v.descricaoLoja}</td>
                  <td className="td whitespace-nowrap">
                    {v.status !== 'ativo' && <button className="btn-primario !px-3 !py-1" onClick={() => rodar(() => api.admin.aprovarVendedor({ id: v.id }))}>Aprovar</button>}{' '}
                    {v.status === 'pendente' && <button className="btn-sec !px-3 !py-1" onClick={() => setRejeitando(v.id)}>Rejeitar</button>}
                  </td>
                </tr>
              ))}
            </Tabela>
            <Paginacao p={p} onPagina={setPagina} />
          </div>
        )}
      </Estado>
      {rejeitando && (
        <Modal titulo="Rejeitar cadastro" onFechar={() => setRejeitando(null)}>
          <div className="space-y-3"><Campo rotulo="Motivo (o vendedor verá ao tentar entrar)"><textarea className="campo" rows={3} value={motivo} onChange={(e) => setMotivo(e.target.value)} /></Campo><Erro texto={erro} /><button className="btn-perigo w-full" disabled={motivo.trim().length < 3} onClick={() => rodar(() => api.admin.rejeitarVendedor({ id: rejeitando, motivo }))}>Confirmar rejeição</button></div>
        </Modal>
      )}
    </div>
  );
}
