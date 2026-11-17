import { Area, AreaChart, Bar, BarChart, CartesianGrid, Cell, Legend, Line, LineChart, Pie, PieChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import { formatCompactINR, formatINR } from "@/lib/format";

const tooltipStyle = {
  contentStyle: { background: "var(--popover)", border: "1px solid var(--border)", borderRadius: 12, color: "var(--popover-foreground)", fontSize: 12 },
  labelStyle: { color: "var(--muted-foreground)" },
};
const axis = { stroke: "var(--muted-foreground)", fontSize: 11, tickLine: false, axisLine: false } as const;

export function TrendChart({ data, height = 260 }: { data: Array<{ label: string; income: number; expense: number }>; height?: number }) {
  return (
    <ResponsiveContainer width="100%" height={height}>
      <BarChart data={data} barGap={4}>
        <CartesianGrid vertical={false} stroke="var(--border)" />
        <XAxis dataKey="label" {...axis} />
        <YAxis {...axis} tickFormatter={(v: number) => formatCompactINR(v)} width={56} />
        <Tooltip {...tooltipStyle} cursor={{ fill: "var(--muted)" }} formatter={(v: number) => formatINR(v)} />
        <Legend wrapperStyle={{ fontSize: 12 }} />
        <Bar dataKey="income" name="Income" fill="var(--income)" radius={[6, 6, 0, 0]} maxBarSize={28} />
        <Bar dataKey="expense" name="Expenses" fill="var(--expense)" radius={[6, 6, 0, 0]} maxBarSize={28} />
      </BarChart>
    </ResponsiveContainer>
  );
}

export function DonutChart({ data, height = 240 }: { data: Array<{ label: string; amount: number; color: string }>; height?: number }) {
  return (
    <ResponsiveContainer width="100%" height={height}>
      <PieChart>
        <Pie data={data} dataKey="amount" nameKey="label" innerRadius="58%" outerRadius="88%" paddingAngle={2} stroke="var(--card)" strokeWidth={2}>
          {data.map((d) => <Cell key={d.label} fill={d.color} />)}
        </Pie>
        <Tooltip {...tooltipStyle} formatter={(v: number) => formatINR(v)} />
      </PieChart>
    </ResponsiveContainer>
  );
}

export function GrowthChart({ data, height = 260 }: { data: Array<{ label: string; invested: number; value: number }>; height?: number }) {
  return (
    <ResponsiveContainer width="100%" height={height}>
      <AreaChart data={data}>
        <defs>
          <linearGradient id="gv" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="var(--gold)" stopOpacity={0.5} />
            <stop offset="100%" stopColor="var(--gold)" stopOpacity={0} />
          </linearGradient>
          <linearGradient id="gi" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="var(--primary)" stopOpacity={0.35} />
            <stop offset="100%" stopColor="var(--primary)" stopOpacity={0} />
          </linearGradient>
        </defs>
        <CartesianGrid vertical={false} stroke="var(--border)" />
        <XAxis dataKey="label" {...axis} />
        <YAxis {...axis} tickFormatter={(v: number) => formatCompactINR(v)} width={60} />
        <Tooltip {...tooltipStyle} formatter={(v: number) => formatINR(v)} />
        <Legend wrapperStyle={{ fontSize: 12 }} />
        <Area type="monotone" dataKey="value" name="Total value" stroke="var(--gold)" fill="url(#gv)" strokeWidth={2} />
        <Area type="monotone" dataKey="invested" name="Amount invested" stroke="var(--primary)" fill="url(#gi)" strokeWidth={2} />
      </AreaChart>
    </ResponsiveContainer>
  );
}

export function LineSeriesChart({ data, lines, height = 260 }: { data: Array<Record<string, number | string>>; lines: Array<{ key: string; name: string; color: string; dashed?: boolean }>; height?: number }) {
  return (
    <ResponsiveContainer width="100%" height={height}>
      <LineChart data={data}>
        <CartesianGrid vertical={false} stroke="var(--border)" />
        <XAxis dataKey="label" {...axis} />
        <YAxis {...axis} tickFormatter={(v: number) => formatCompactINR(v)} width={60} />
        <Tooltip {...tooltipStyle} formatter={(v: number) => formatINR(v)} />
        <Legend wrapperStyle={{ fontSize: 12 }} />
        {lines.map((l) => (
          <Line key={l.key} type="monotone" dataKey={l.key} name={l.name} stroke={l.color} strokeWidth={2.5} dot={{ r: 3 }} {...(l.dashed ? { strokeDasharray: "6 4" } : {})} />
        ))}
      </LineChart>
    </ResponsiveContainer>
  );
}
