import { useState } from 'react';
import { data } from '../../api/formato';
import { Campo, Erro, Modal, Selo, Sentinela, Tabela, Titulo, useInfinita } from '../../componentes/ui';
import { useSessao } from '../../sessao';
import { mascaraDocumento, mascaraTelefone } from '../../utils/mascaras';

export function Vendedores() {
  const { api } = useSessao();
  const [status, setStatus] = useState<'pendente' | 'ativo' | 'rejeitado' | ''>('pendente');
  const l = useInfinita((pagina) => api.admin.vendedores({ status: (status || undefined) as never, pagina, porPagina: 10 }), [status]);
  const [rejeitando, setRejeitando] = useState<number | null>(null);
  const [motivo, setMotivo] = useState('');
  const [erro, setErro] = useState<string | null>(null);

  async function rodar(fn: () => Promise<unknown>) { setErro(null); try { await fn(); setRejeitando(null); setMotivo(''); l.reiniciar(); } catch (x) { setErro((x as Error).message); } }

  return (
    <div className="animate-subir">
      <Titulo sub="Aprove ou rejeite as lojas que querem vender." acao={<select className="campo !w-auto !rounded-full" value={status} onChange={(e) => setStatus(e.target.value as typeof status)}><option value="pendente">Pendentes</option><option value="ativo">Aprovados</option><option value="rejeitado">Rejeitados</option><option value="">Todos</option></select>}>Solicitações de vendedores</Titulo>
      <Erro texto={erro} />
      <div className="cartao !p-2">
        <Tabela carregando={l.inicial} colunas={['Loja', 'Responsável', 'Contato', 'Documento', 'Pedido em', 'Situação', 'Descrição', '']} vazio="Nenhuma solicitação nesta lista.">
          {l.itens.map((v) => (
            <tr key={v.id}>
              <td className="td font-bold">{v.nomeLoja}</td><td className="td">{v.nome}</td>
              <td className="td text-xs">{v.email}<br />{v.telefone ? mascaraTelefone(v.telefone) : '—'}</td>
              <td className="td font-mono text-xs">{v.documento ? mascaraDocumento(v.documento) : '—'}</td><td className="td">{data(v.criadoEm)}</td>
              <td className="td"><Selo status={v.status} />{v.motivoRejeicao && <p className="mt-1 max-w-[12rem] text-xs text-stone-500">{v.motivoRejeicao}</p>}</td>
              <td className="td max-w-xs text-xs text-stone-600">{v.descricaoLoja}</td>
              <td className="td whitespace-nowrap">
                {v.status !== 'ativo' && <button className="btn-primario !px-3 !py-1.5" onClick={() => rodar(() => api.admin.aprovarVendedor({ id: v.id }))}>Aprovar</button>}{' '}
                {v.status === 'pendente' && <button className="btn-sec !px-3 !py-1.5" onClick={() => setRejeitando(v.id)}>Rejeitar</button>}
              </td>
            </tr>
          ))}
        </Tabela>
        <Sentinela l={l} unidade="vendedores" />
      </div>
      {rejeitando && (
        <Modal titulo="Rejeitar cadastro" onFechar={() => setRejeitando(null)}>
          <div className="space-y-3"><Campo rotulo="Motivo (o vendedor verá ao tentar entrar)"><textarea className="campo" rows={3} value={motivo} onChange={(e) => setMotivo(e.target.value)} /></Campo><Erro texto={erro} /><button className="btn-perigo w-full" disabled={motivo.trim().length < 3} onClick={() => rodar(() => api.admin.rejeitarVendedor({ id: rejeitando, motivo }))}>Confirmar rejeição</button></div>
        </Modal>
      )}
    </div>
  );
}
