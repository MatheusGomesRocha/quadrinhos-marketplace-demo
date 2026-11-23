import { useState } from 'react';
import { Link } from 'react-router-dom';
import { brl, dataHora } from '../../api/formato';
import { Campo, Erro, Estado, Modal, Paginacao, Selo, Tabela, Titulo, useCarregar } from '../../componentes/ui';
import { useSessao } from '../../sessao';

export function Reclamacoes() {
  const { api } = useSessao();
  const [status, setStatus] = useState<'aberta' | ''>('aberta');
  const [pagina, setPagina] = useState(1);
  const r = useCarregar(() => api.reclamacoes.listar({ status: (status || undefined) as never, pagina }), [status, pagina]);
  const [sel, setSel] = useState<number | null>(null);
  const [resposta, setResposta] = useState('');
  const [erro, setErro] = useState<string | null>(null);
  async function decidir(decisao: 'reembolsar' | 'rejeitar') {
    setErro(null);
    try { await api.reclamacoes.resolver({ id: sel!, decisao, resposta }); setSel(null); setResposta(''); await r.recarregar(); } catch (x) { setErro((x as Error).message); }
  }
  return (
    <div>
      <Titulo acao={<select className="campo !w-auto" value={status} onChange={(e) => { setStatus(e.target.value as typeof status); setPagina(1); }}><option value="aberta">Abertas</option><option value="">Todas</option></select>}>Reclamações</Titulo>
      <Estado r={r}>
        {(p) => (
          <div className="cartao">
            <Tabela colunas={['Aberta em', 'Pedido', 'Comprador', 'Loja', 'Valor', 'Motivo', 'Situação', '']} vazio="Nenhuma reclamação.">
              {p.itens.map((x) => (
                <tr key={x.id}>
                  <td className="td">{dataHora(x.criadoEm)}</td><td className="td">{x.pedido ? <Link className="font-mono text-xs text-marca-700" to={`/pedidos/${x.pedido.id}`}>{x.pedido.codigo}</Link> : '—'}</td>
                  <td className="td">{x.pedido?.comprador.nome}</td><td className="td">{x.pedido?.vendedor.nomeLoja}</td><td className="td">{x.pedido ? brl(x.pedido.totalCentavos) : ''}</td>
                  <td className="td max-w-xs text-xs">{x.motivo}</td><td className="td"><Selo status={x.status} /></td>
                  <td className="td">{x.status === 'aberta' && <button className="btn-primario !px-3 !py-1" onClick={() => setSel(x.id)}>Decidir</button>}</td>
                </tr>
              ))}
            </Tabela>
            <Paginacao p={p} onPagina={setPagina} />
          </div>
        )}
      </Estado>
      {sel && (
        <Modal titulo="Decidir reclamação" onFechar={() => setSel(null)}>
          <div className="space-y-3">
            <Campo rotulo="Resposta ao comprador"><textarea className="campo" rows={3} value={resposta} onChange={(e) => setResposta(e.target.value)} /></Campo>
            <p className="text-xs text-stone-500">Reembolsar cancela o pedido e devolve o estoque. Rejeitar devolve o pedido a "Enviado" com mais 7 dias de prazo.</p>
            <Erro texto={erro} />
            <div className="flex gap-2"><button className="btn-perigo flex-1" disabled={resposta.trim().length < 3} onClick={() => decidir('reembolsar')}>Reembolsar</button><button className="btn-sec flex-1" disabled={resposta.trim().length < 3} onClick={() => decidir('rejeitar')}>Rejeitar</button></div>
          </div>
        </Modal>
      )}
    </div>
  );
}
