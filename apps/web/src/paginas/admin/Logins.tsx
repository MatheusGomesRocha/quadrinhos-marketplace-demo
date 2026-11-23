import { useState } from 'react';
import { dataHora } from '../../api/formato';
import { Sentinela, Tabela, Titulo, useInfinita } from '../../componentes/ui';
import { useSessao } from '../../sessao';

export function Logins() {
  const { api } = useSessao();
  const [q, setQ] = useState('');
  const [resultado, setResultado] = useState('');
  const l = useInfinita((pagina) => api.admin.registrosLogin({ q: q || undefined, sucesso: resultado === '' ? undefined : resultado === '1', pagina, porPagina: 25 }), [q, resultado]);
  return (
    <div className="animate-subir">
      <Titulo sub={l.inicial ? undefined : `${l.total} registros`}>Registro de logins</Titulo>
      <div className="mb-4 flex flex-wrap gap-3">
        <input className="campo !w-72 !rounded-full" placeholder="Buscar por e-mail" value={q} onChange={(e) => setQ(e.target.value)} />
        <select className="campo !w-auto !rounded-full" value={resultado} onChange={(e) => setResultado(e.target.value)}><option value="">Todos</option><option value="1">Sucesso</option><option value="0">Falha</option></select>
      </div>
      <div className="cartao !p-2">
        <Tabela carregando={l.inicial} colunas={['Quando', 'E-mail', 'Papel', 'Resultado', 'Motivo', 'IP']} vazio="Nenhum registro.">
          {l.itens.map((x) => <tr key={x.id}><td className="td">{dataHora(x.criadoEm)}</td><td className="td">{x.email}</td><td className="td capitalize">{x.papel ?? '—'}</td><td className="td">{x.sucesso ? <span className="font-semibold text-emerald-700">Sucesso</span> : <span className="font-semibold text-red-600">Falha</span>}</td><td className="td">{x.motivo ?? ''}</td><td className="td font-mono text-xs">{x.ip ?? '—'}</td></tr>)}
        </Tabela>
        <Sentinela l={l} unidade="registros" />
      </div>
    </div>
  );
}
