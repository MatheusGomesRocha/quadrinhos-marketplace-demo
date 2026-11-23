import { useState } from 'react';
import { dataHora } from '../../api/formato';
import { Estado, Paginacao, Tabela, Titulo, useCarregar } from '../../componentes/ui';
import { useSessao } from '../../sessao';

export function Logins() {
  const { api } = useSessao();
  const [q, setQ] = useState('');
  const [resultado, setResultado] = useState('');
  const [pagina, setPagina] = useState(1);
  const r = useCarregar(() => api.admin.registrosLogin({ q: q || undefined, sucesso: resultado === '' ? undefined : resultado === '1', pagina }), [q, resultado, pagina]);
  return (
    <div>
      <Titulo>Registro de logins</Titulo>
      <div className="mb-4 flex flex-wrap gap-3">
        <input className="campo !w-64" placeholder="Buscar por e-mail" value={q} onChange={(e) => { setQ(e.target.value); setPagina(1); }} />
        <select className="campo !w-auto" value={resultado} onChange={(e) => { setResultado(e.target.value); setPagina(1); }}><option value="">Todos</option><option value="1">Sucesso</option><option value="0">Falha</option></select>
      </div>
      <Estado r={r}>
        {(p) => (
          <div className="cartao">
            <Tabela colunas={['Quando', 'E-mail', 'Papel', 'Resultado', 'Motivo', 'IP']} vazio="Nenhum registro.">
              {p.itens.map((x) => <tr key={x.id}><td className="td">{dataHora(x.criadoEm)}</td><td className="td">{x.email}</td><td className="td">{x.papel ?? '—'}</td><td className="td">{x.sucesso ? <span className="font-semibold text-emerald-700">Sucesso</span> : <span className="font-semibold text-red-600">Falha</span>}</td><td className="td">{x.motivo ?? ''}</td><td className="td font-mono text-xs">{x.ip ?? '—'}</td></tr>)}
            </Tabela>
            <Paginacao p={p} onPagina={setPagina} />
          </div>
        )}
      </Estado>
    </div>
  );
}
