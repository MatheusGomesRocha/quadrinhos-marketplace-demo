import { ArcElement, BarElement, CategoryScale, Chart as ChartJS, Filler, Legend, LinearScale, LineElement, PointElement, Tooltip } from 'chart.js';
import { Bar, Doughnut, Line } from 'react-chartjs-2';
import { brl, diaCurto } from '../api/formato';

ChartJS.register(ArcElement, BarElement, CategoryScale, Filler, Legend, LinearScale, LineElement, PointElement, Tooltip);

export const PALETA = ['#ea580c', '#0ea5e9', '#16a34a', '#a855f7', '#e11d48', '#ca8a04', '#64748b'];
const eixoReais = { ticks: { callback: (v: string | number) => brl(Number(v)) }, beginAtZero: true };

export function LinhaVendas({ serie, campo = 'valorCentavos', rotulo = 'Vendas' }: { serie: { data: string; valorCentavos: number; comissaoCentavos: number }[]; campo?: 'valorCentavos' | 'comissaoCentavos'; rotulo?: string }) {
  return (
    <div className="h-64">
      <Line
        data={{ labels: serie.map((s) => diaCurto(s.data)), datasets: [{ label: rotulo, data: serie.map((s) => s[campo]), borderColor: PALETA[0], backgroundColor: 'rgba(234,88,12,.12)', fill: true, tension: 0.3, pointRadius: 2 }] }}
        options={{ maintainAspectRatio: false, plugins: { legend: { display: false }, tooltip: { callbacks: { label: (c) => `${rotulo}: ${brl(Number(c.raw))}` } } }, scales: { y: { ...eixoReais, ticks: { callback: (v) => brl(Number(v)) } } } }}
      />
    </div>
  );
}

export function RoscaValores({ itens, formatar = brl }: { itens: { rotulo: string; valor: number }[]; formatar?: (n: number) => string }) {
  return (
    <div className="h-64">
      <Doughnut
        data={{ labels: itens.map((i) => i.rotulo), datasets: [{ data: itens.map((i) => i.valor), backgroundColor: PALETA, borderWidth: 0 }] }}
        options={{ maintainAspectRatio: false, plugins: { legend: { position: 'right' }, tooltip: { callbacks: { label: (c) => `${c.label}: ${formatar(Number(c.raw))}` } } } }}
      />
    </div>
  );
}

export function BarrasHoriz({ itens, formatar = brl, rotulo = 'Valor' }: { itens: { rotulo: string; valor: number }[]; formatar?: (n: number) => string; rotulo?: string }) {
  return (
    <div className="h-64">
      <Bar
        data={{ labels: itens.map((i) => (i.rotulo.length > 24 ? `${i.rotulo.slice(0, 22)}…` : i.rotulo)), datasets: [{ label: rotulo, data: itens.map((i) => i.valor), backgroundColor: PALETA[0], borderRadius: 4 }] }}
        options={{ indexAxis: 'y', maintainAspectRatio: false, plugins: { legend: { display: false }, tooltip: { callbacks: { label: (c) => `${rotulo}: ${formatar(Number(c.raw))}` } } }, scales: { x: { beginAtZero: true, ticks: { callback: (v) => formatar(Number(v)) } } } }}
      />
    </div>
  );
}
