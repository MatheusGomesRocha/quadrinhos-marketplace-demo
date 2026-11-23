import { Navigate, Route, Routes } from 'react-router-dom';
import type { Papel } from '@mkt/core';
import { Layout } from './componentes/Layout';
import { Carregando } from './componentes/ui';
import { useSessao } from './sessao';
import { Carrinho } from './paginas/Carrinho';
import { Checkout } from './paginas/Checkout';
import { Entrar, CadastrarComprador, SerVendedor } from './paginas/Acesso';
import { Loja } from './paginas/Loja';
import { Mensagens } from './paginas/Mensagens';
import { PedidoDetalhe } from './paginas/PedidoDetalhe';
import { MeusPedidos } from './paginas/MeusPedidos';
import { ProdutoPagina } from './paginas/Produto';
import { PainelVendedor } from './paginas/vendedor/Painel';
import { ProdutosVendedor } from './paginas/vendedor/Produtos';
import { ProdutoForm } from './paginas/vendedor/ProdutoForm';
import { PedidosVendedor } from './paginas/vendedor/Pedidos';
import { Geral } from './paginas/admin/Geral';
import { Vendedores } from './paginas/admin/Vendedores';
import { Usuarios } from './paginas/admin/Usuarios';
import { Rankings } from './paginas/admin/Rankings';
import { HistoricoPedidos } from './paginas/admin/HistoricoPedidos';
import { Estoque } from './paginas/admin/Estoque';
import { Logins } from './paginas/admin/Logins';
import { Reclamacoes } from './paginas/admin/Reclamacoes';

const inicioDe = (p: Papel) => (p === 'admin' ? '/admin' : p === 'vendedor' ? '/vendedor' : '/');

/** Só deixa passar quem tem um dos papéis; visitante vai para o login. */
function Protegida({ papeis, children }: { papeis: Papel[]; children: JSX.Element }) {
  const { usuario, carregando } = useSessao();
  if (carregando) return <Carregando />;
  if (!usuario) return <Navigate to="/entrar" replace />;
  if (!papeis.includes(usuario.papel)) return <Navigate to={inicioDe(usuario.papel)} replace />;
  return children;
}

export function App() {
  const comprador: Papel[] = ['comprador'];
  const vendedor: Papel[] = ['vendedor'];
  const admin: Papel[] = ['admin'];
  return (
    <Layout>
      <Routes>
        <Route path="/" element={<Loja />} />
        <Route path="/produto/:id" element={<ProdutoPagina />} />
        <Route path="/entrar" element={<Entrar />} />
        <Route path="/cadastrar" element={<CadastrarComprador />} />
        <Route path="/vender" element={<SerVendedor />} />

        <Route path="/carrinho" element={<Protegida papeis={comprador}><Carrinho /></Protegida>} />
        <Route path="/checkout" element={<Protegida papeis={comprador}><Checkout /></Protegida>} />
        <Route path="/pedidos" element={<Protegida papeis={comprador}><MeusPedidos /></Protegida>} />
        <Route path="/pedidos/:id" element={<Protegida papeis={['comprador', 'vendedor', 'admin']}><PedidoDetalhe /></Protegida>} />
        <Route path="/mensagens" element={<Protegida papeis={['comprador', 'vendedor']}><Mensagens /></Protegida>} />

        <Route path="/vendedor" element={<Protegida papeis={vendedor}><PainelVendedor /></Protegida>} />
        <Route path="/vendedor/produtos" element={<Protegida papeis={vendedor}><ProdutosVendedor /></Protegida>} />
        <Route path="/vendedor/produtos/novo" element={<Protegida papeis={vendedor}><ProdutoForm /></Protegida>} />
        <Route path="/vendedor/produtos/:id" element={<Protegida papeis={vendedor}><ProdutoForm /></Protegida>} />
        <Route path="/vendedor/pedidos" element={<Protegida papeis={vendedor}><PedidosVendedor /></Protegida>} />

        <Route path="/admin" element={<Protegida papeis={admin}><Geral /></Protegida>} />
        <Route path="/admin/vendedores" element={<Protegida papeis={admin}><Vendedores /></Protegida>} />
        <Route path="/admin/usuarios" element={<Protegida papeis={admin}><Usuarios /></Protegida>} />
        <Route path="/admin/rankings" element={<Protegida papeis={admin}><Rankings /></Protegida>} />
        <Route path="/admin/pedidos" element={<Protegida papeis={admin}><HistoricoPedidos /></Protegida>} />
        <Route path="/admin/estoque" element={<Protegida papeis={admin}><Estoque /></Protegida>} />
        <Route path="/admin/logins" element={<Protegida papeis={admin}><Logins /></Protegida>} />
        <Route path="/admin/reclamacoes" element={<Protegida papeis={admin}><Reclamacoes /></Protegida>} />
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </Layout>
  );
}
