import { useMemo } from 'react';
import { motion } from 'framer-motion';
import {
  BarChart, Bar, XAxis, YAxis, ResponsiveContainer, Tooltip, Cell,
  LineChart, Line, CartesianGrid, PieChart, Pie, Legend,
} from 'recharts';
import { ChartBar as BarChart3, Fish, MapPin, Scale, Trophy, Waves } from 'lucide-react';
import { Catch } from '@/types';
import {
  computeSummary, topSpecies, catchesPerMonth, distributionBySeason,
} from '@/lib/stats';

interface StatsScreenProps {
  catches: Catch[];
}

const CHART_COLORS = [
  '#38a8ff', '#43c1a4', '#78d9c2', '#0f8bf5',
  '#016dd1', '#22a488', '#79c6ff', '#15836e',
];
const PIE_COLORS = ['#43c1a4', '#38a8ff', '#bb924c', '#78d9c2'];

const tooltipStyle = {
  backgroundColor: 'rgb(15 23 42 / 0.92)',
  border: '1px solid rgb(255 255 255 / 0.12)',
  borderRadius: '0.75rem',
  color: '#e2e8f0',
  fontSize: '0.8rem',
  padding: '0.5rem 0.75rem',
};

export function StatsScreen({ catches }: StatsScreenProps) {
  const summary = useMemo(() => computeSummary(catches), [catches]);
  const speciesData = useMemo(() => topSpecies(catches), [catches]);
  const monthData = useMemo(() => catchesPerMonth(catches), [catches]);
  const seasonData = useMemo(() => distributionBySeason(catches), [catches]);

  if (catches.length === 0) {
    return (
      <div className="relative z-10 flex h-full flex-col">
        <header className="shrink-0 px-5 pb-5 pt-[max(env(safe-area-inset-top),20px)]">
          <span className="eyebrow" style={{ color: '#78d9c2' }}>İstatistik</span>
          <h1 className="mt-1.5 font-display text-[28px] font-semibold tracking-tight text-white">İstatistikler</h1>
        </header>
        <div className="flex flex-1 flex-col items-center justify-center gap-3 px-5 text-center">
          <BarChart3 className="h-10 w-10 text-slate-400" />
          <p className="text-sm text-slate-300">
            İstatistikleri görmek için en az bir av kaydı eklemelisin.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="relative z-10 flex h-full flex-col">
      <header className="shrink-0 px-5 pb-4 pt-[max(env(safe-area-inset-top),20px)]">
        <span className="eyebrow" style={{ color: '#78d9c2' }}>İstatistik</span>
        <h1 className="mt-1.5 font-display text-[28px] font-semibold tracking-tight text-white">İstatistikler</h1>
        <p className="mt-0.5 text-sm text-lake-200">{catches.length} av kaydı</p>
      </header>

      <div className="min-h-0 flex-1 overflow-y-auto overscroll-contain">
        <div className="space-y-4 px-5 pb-28 pt-3">
          <div className="grid grid-cols-2 gap-3">
            <SummaryCard icon={Fish} label="Toplam Av" value={String(summary.totalCatches)} />
            <SummaryCard
              icon={Scale}
              label="Toplam Ağırlık"
              value={summary.totalWeight > 0 ? `${summary.totalWeight.toFixed(1)} kg` : '—'}
            />
            <SummaryCard icon={Trophy} label="En Çok Tür" value={summary.topSpecies ?? '—'} />
            <SummaryCard icon={MapPin} label="Favori Konum" value={summary.favoriteLocation ?? '—'} />
          </div>

          <ChartCard title="En Çok Yakalanan Türler" icon={Fish}>
            <ResponsiveContainer width="100%" height={Math.max(160, speciesData.length * 32)}>
              <BarChart data={speciesData} layout="vertical" margin={{ top: 4, right: 12, bottom: 4, left: 4 }}>
                <XAxis type="number" tick={{ fill: '#94a3b8', fontSize: 11 }} axisLine={false} tickLine={false} />
                <YAxis
                  type="category"
                  dataKey="name"
                  tick={{ fill: '#cbd5e1', fontSize: 11 }}
                  axisLine={false}
                  tickLine={false}
                  width={72}
                />
                <Tooltip cursor={{ fill: 'rgb(255 255 255 / 0.05)' }} contentStyle={tooltipStyle} />
                <Bar dataKey="count" radius={[0, 6, 6, 0]} barSize={18}>
                  {speciesData.map((_, i) => (
                    <Cell key={i} fill={CHART_COLORS[i % CHART_COLORS.length]} />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </ChartCard>

          <ChartCard title="Aylara Göre Avlar" icon={BarChart3}>
            <ResponsiveContainer width="100%" height={200}>
              <LineChart data={monthData} margin={{ top: 8, right: 12, bottom: 4, left: -16 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="rgb(255 255 255 / 0.08)" />
                <XAxis dataKey="month" tick={{ fill: '#94a3b8', fontSize: 10 }} axisLine={false} tickLine={false} />
                <YAxis tick={{ fill: '#94a3b8', fontSize: 11 }} axisLine={false} tickLine={false} allowDecimals={false} />
                <Tooltip cursor={{ stroke: 'rgb(56 168 255 / 0.3)' }} contentStyle={tooltipStyle} />
                <Line
                  type="monotone"
                  dataKey="count"
                  stroke="#38a8ff"
                  strokeWidth={2.5}
                  dot={{ fill: '#38a8ff', r: 3 }}
                  activeDot={{ r: 5 }}
                />
              </LineChart>
            </ResponsiveContainer>
          </ChartCard>

          <ChartCard title="Mevsime Göre Dağılım" icon={Waves}>
            <ResponsiveContainer width="100%" height={220}>
              <PieChart>
                <Pie
                  data={seasonData}
                  dataKey="count"
                  nameKey="season"
                  cx="50%"
                  cy="50%"
                  innerRadius={48}
                  outerRadius={78}
                  paddingAngle={3}
                  stroke="rgb(15 23 42 / 0.6)"
                >
                  {seasonData.map((_, i) => (
                    <Cell key={i} fill={PIE_COLORS[i % PIE_COLORS.length]} />
                  ))}
                </Pie>
                <Tooltip contentStyle={tooltipStyle} />
                <Legend
                  wrapperStyle={{ fontSize: 11, color: '#cbd5e1' }}
                  iconType="circle"
                  formatter={(value) => <span style={{ color: '#cbd5e1' }}>{value}</span>}
                />
              </PieChart>
            </ResponsiveContainer>
          </ChartCard>
        </div>
      </div>
    </div>
  );
}

function SummaryCard({ icon: Icon, label, value }: { icon: typeof Fish; label: string; value: string }) {
  return (
    <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} className="glass-card rounded-2xl p-3">
      <div className="mb-1.5 flex items-center gap-1.5 text-xs font-medium text-slate-300">
        <Icon className="h-3.5 w-3.5 text-lake-300" />
        {label}
      </div>
      <p className="truncate text-sm font-semibold text-slate-100" title={value}>{value}</p>
    </motion.div>
  );
}

function ChartCard({ title, icon: Icon, children }: { title: string; icon: typeof Fish; children: React.ReactNode }) {
  return (
    <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="glass-card rounded-2xl p-4">
      <div className="mb-3 flex items-center gap-2">
        <div className="flex h-7 w-7 items-center justify-center rounded-full bg-lake-500/20">
          <Icon className="h-3.5 w-3.5 text-lake-300" />
        </div>
        <span className="text-sm font-semibold text-white">{title}</span>
      </div>
      {children}
    </motion.div>
  );
}
