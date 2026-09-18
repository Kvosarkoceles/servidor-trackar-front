import {
  Area,
  AreaChart,
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  Legend,
  Line,
  LineChart,
  Pie,
  PieChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts';

import { EmptyState } from '@/components/ui/Feedback';
import { fmtDuration, fmtNumber } from '@/utils/format';
import type { DistancePoint, SpeedPoint } from '@/types';

/** Rango de altura por defecto de las gráficas. */
const CHART_HEIGHT = 240;

const axisProps = {
  stroke: 'rgb(var(--content-muted))',
  fontSize: 11,
  tickLine: false,
} as const;

const gridProps = {
  stroke: 'rgb(var(--line))',
  strokeDasharray: '3 3',
  vertical: false,
} as const;

/** Estilos del tooltip nativo de Recharts, alineados con el tema. */
const tooltipStyle = {
  contentStyle: {
    background: 'rgb(var(--panel))',
    border: '1px solid rgb(var(--line))',
    borderRadius: 8,
    fontSize: 12,
    color: 'rgb(var(--content))',
  },
  labelStyle: { color: 'rgb(var(--content-muted))', fontSize: 11 },
} as const;

/** Kilómetros por intervalo (hora o día). */
export function DistanceChart({ data }: { data: DistancePoint[] }) {
  if (data.length === 0) {
    return <EmptyState title="Sin datos de distancia" description="No hay posiciones en el rango consultado." />;
  }

  return (
    <ResponsiveContainer width="100%" height={CHART_HEIGHT}>
      <AreaChart data={data} margin={{ top: 8, right: 12, bottom: 0, left: -12 }}>
        <defs>
          <linearGradient id="distanceFill" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="#2f83f6" stopOpacity={0.45} />
            <stop offset="100%" stopColor="#2f83f6" stopOpacity={0.02} />
          </linearGradient>
        </defs>
        <CartesianGrid {...gridProps} />
        <XAxis dataKey="label" {...axisProps} />
        <YAxis {...axisProps} width={44} tickFormatter={(value: number) => `${value}`} />
        <Tooltip {...tooltipStyle} formatter={(value) => [`${value} km`, 'Distancia']} />
        <Area
          type="monotone"
          dataKey="km"
          stroke="#2f83f6"
          strokeWidth={2}
          fill="url(#distanceFill)"
          name="Distancia"
        />
      </AreaChart>
    </ResponsiveContainer>
  );
}

/** Velocidad media y máxima por intervalo. */
export function SpeedChart({ data }: { data: SpeedPoint[] }) {
  if (data.length === 0) {
    return <EmptyState title="Sin datos de velocidad" description="No hay posiciones en el rango consultado." />;
  }

  return (
    <ResponsiveContainer width="100%" height={CHART_HEIGHT}>
      <LineChart data={data} margin={{ top: 8, right: 12, bottom: 0, left: -12 }}>
        <CartesianGrid {...gridProps} />
        <XAxis dataKey="label" {...axisProps} />
        <YAxis {...axisProps} width={44} unit=" km/h" />
        <Tooltip {...tooltipStyle} formatter={(value) => `${value} km/h`} />
        <Legend wrapperStyle={{ fontSize: 11 }} />
        <Line
          type="monotone"
          dataKey="avgKmh"
          name="Promedio"
          stroke="#22c55e"
          strokeWidth={2}
          dot={false}
        />
        <Line
          type="monotone"
          dataKey="maxKmh"
          name="Máxima"
          stroke="#f59e0b"
          strokeWidth={2}
          strokeDasharray="4 3"
          dot={false}
        />
      </LineChart>
    </ResponsiveContainer>
  );
}

export interface StatusSlice {
  name: string;
  value: number;
  color: string;
}

/** Distribución de dispositivos por estado (movimiento / detenido / offline). */
export function StatusPieChart({ data }: { data: StatusSlice[] }) {
  const total = data.reduce((sum, slice) => sum + slice.value, 0);
  if (total === 0) {
    return <EmptyState title="Sin dispositivos" description="Aún no hay dispositivos registrados en el backend." />;
  }

  return (
    <ResponsiveContainer width="100%" height={CHART_HEIGHT}>
      <PieChart>
        <Pie data={data} dataKey="value" nameKey="name" innerRadius={56} outerRadius={88} paddingAngle={2}>
          {data.map((slice) => (
            <Cell key={slice.name} fill={slice.color} stroke="rgb(var(--panel))" strokeWidth={2} />
          ))}
        </Pie>
        <Tooltip {...tooltipStyle} formatter={(value, name) => [String(value), String(name)]} />
        <Legend wrapperStyle={{ fontSize: 11 }} />
      </PieChart>
    </ResponsiveContainer>
  );
}

export interface CategoryDatum {
  label: string;
  value: number;
  color?: string;
}

/** Barras genéricas (eventos por categoría, tiempo por estado...). */
export function CategoryBarChart({
  data,
  color = '#2f83f6',
  unit = '',
  emptyTitle = 'Sin datos',
  emptyDescription = 'No hay información para mostrar en el rango consultado.',
  formatValue,
}: {
  data: CategoryDatum[];
  color?: string;
  unit?: string;
  emptyTitle?: string;
  emptyDescription?: string;
  formatValue?: (value: number) => string;
}) {
  if (data.length === 0 || data.every((item) => item.value === 0)) {
    return <EmptyState title={emptyTitle} description={emptyDescription} />;
  }

  return (
    <ResponsiveContainer width="100%" height={CHART_HEIGHT}>
      <BarChart data={data} margin={{ top: 8, right: 12, bottom: 0, left: -12 }}>
        <CartesianGrid {...gridProps} />
        <XAxis dataKey="label" {...axisProps} />
        <YAxis
          {...axisProps}
          width={54}
          tickFormatter={(value: number) => (formatValue ? formatValue(value) : fmtNumber(value))}
        />
        <Tooltip
          {...tooltipStyle}
          formatter={(value) =>
            formatValue
              ? formatValue(Number(value))
              : `${fmtNumber(Number(value))}${unit ? ` ${unit}` : ''}`
          }
        />
        <Bar dataKey="value" radius={[4, 4, 0, 0]}>
          {data.map((item) => (
            <Cell key={item.label} fill={item.color ?? color} />
          ))}
        </Bar>
      </BarChart>
    </ResponsiveContainer>
  );
}

/** Barras de tiempo (movimiento vs detención) con formato h/min. */
export function TimeBarChart({ data }: { data: CategoryDatum[] }) {
  return (
    <CategoryBarChart
      data={data}
      formatValue={(value) => fmtDuration(value)}
      emptyTitle="Sin datos de tiempo"
      emptyDescription="No hay intervalos suficientes para calcular tiempos."
    />
  );
}
