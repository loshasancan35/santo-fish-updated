import { motion } from 'framer-motion';
import { Chrome as Home, CirclePlus as PlusCircle, History, ChartBar as BarChart3, Map } from 'lucide-react';

export type Tab = 'home' | 'add' | 'history' | 'stats' | 'map';

const ITEMS: { id: Tab; label: string; icon: typeof Home }[] = [
  { id: 'home', label: 'Ana Sayfa', icon: Home },
  { id: 'history', label: 'Geçmiş', icon: History },
  { id: 'add', label: 'Yeni Av', icon: PlusCircle },
  { id: 'stats', label: 'İstatistik', icon: BarChart3 },
  { id: 'map', label: 'Harita', icon: Map },
];

export function BottomNav({ active, onChange }: { active: Tab; onChange: (tab: Tab) => void }) {
  const addIndex = ITEMS.findIndex((i) => i.id === 'add');
  const leftItems = ITEMS.slice(0, addIndex);
  const rightItems = ITEMS.slice(addIndex + 1);
  const addItem = ITEMS[addIndex];

  return (
    <nav className="pointer-events-none fixed inset-x-0 bottom-0 z-40 flex justify-center px-3 pb-[max(env(safe-area-inset-bottom),12px)] pt-2">
      <div
        className="pointer-events-auto relative flex w-full max-w-md items-end justify-between rounded-2xl border border-white/12 px-3 pb-2 pt-2 backdrop-blur-xl"
        style={{
          background: 'rgb(3 21 37 / 0.88)',
          boxShadow:
            '0 1px 0 0 rgb(24 191 255 / 0.06) inset, 0 -10px 32px -14px rgb(0 0 0 / 0.65), 0 -2px 10px -4px rgb(0 0 0 / 0.4)',
        }}
      >
        {leftItems.map((item) => (
          <NavButton key={item.id} item={item} active={active === item.id} onChange={onChange} />
        ))}

        {/* Center Add button — prominent */}
        <button
          onClick={() => onChange(addItem.id)}
          className="relative -mt-6 flex flex-col items-center gap-1"
        >
          <motion.div
            whileTap={{ scale: 0.9 }}
            className="flex h-14 w-14 items-center justify-center rounded-full border-2 border-cyan-400/30"
            style={{
              background: 'linear-gradient(135deg, #18BFFF 0%, #0f8bf5 100%)',
              boxShadow: '0 4px 16px rgb(24 191 255 / 0.4), 0 0 0 4px rgb(3 21 37 / 0.9)',
            }}
          >
            <PlusCircle className="h-6 w-6 text-white" strokeWidth={2.2} />
          </motion.div>
          <span className="text-[9.5px] font-medium leading-none text-cyan-300">{addItem.label}</span>
        </button>

        {rightItems.map((item) => (
          <NavButton key={item.id} item={item} active={active === item.id} onChange={onChange} />
        ))}
      </div>
    </nav>
  );
}

function NavButton({
  item,
  active,
  onChange,
}: {
  item: { id: Tab; label: string; icon: typeof Home };
  active: boolean;
  onChange: (tab: Tab) => void;
}) {
  const Icon = item.icon;
  return (
    <button
      onClick={() => onChange(item.id)}
      className="relative flex flex-1 flex-col items-center gap-1 rounded-xl px-1 py-1.5 active:scale-95 transition-transform"
    >
      {active && (
        <motion.div
          layoutId="nav-active-pill"
          className="absolute inset-0 rounded-xl border border-cyan-400/20 bg-cyan-500/10"
          transition={{ type: 'spring', stiffness: 420, damping: 32 }}
        />
      )}
      <Icon
        className={`relative z-10 h-[18px] w-[18px] ${active ? 'text-cyan-300' : 'text-slate-400'}`}
        strokeWidth={active ? 2.4 : 2}
      />
      <span
        className={`relative z-10 text-[9.5px] font-medium leading-none ${
          active ? 'text-cyan-300' : 'text-slate-400'
        }`}
      >
        {item.label}
      </span>
    </button>
  );
}
