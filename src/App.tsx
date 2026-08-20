import { useState } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import { BottomNav, Tab } from '@/components/BottomNav';
import { HomeScreen } from '@/screens/HomeScreen';
import { AddCatchScreen } from '@/screens/AddCatchScreen';
import { HistoryScreen } from '@/screens/HistoryScreen';
import { StatsScreen } from '@/screens/StatsScreen';
import { MapScreen } from '@/screens/MapScreen';
import { useCatches } from '@/hooks/useCatches';

function App() {
  const [tab, setTab] = useState<Tab>('home');
  const { catches, loading, reload } = useCatches();

  const reloadAsync = async () => {
    await reload();
  };

  return (
    <div className="ocean-bg relative mx-auto h-[100dvh] max-w-md overflow-hidden font-sans text-slate-100 shadow-xl">
      <AnimatePresence mode="wait">
        {tab === 'home' && (
          <motion.div
            key="home"
            initial={{ opacity: 0, x: -20 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -20 }}
            transition={{ duration: 0.25, ease: 'easeOut' }}
            className="h-full"
          >
            <HomeScreen
              catches={catches}
              loading={loading}
              reload={reloadAsync}
              onAddCatch={() => setTab('add')}
            />
          </motion.div>
        )}
        {tab === 'add' && (
          <motion.div
            key="add"
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: 20 }}
            transition={{ duration: 0.25, ease: 'easeOut' }}
            className="h-full"
          >
            <AddCatchScreen
              onSaved={() => {
                reload();
                setTab('history');
              }}
              onCancel={() => setTab('home')}
            />
          </motion.div>
        )}
        {tab === 'history' && (
          <motion.div
            key="history"
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -20 }}
            transition={{ duration: 0.25, ease: 'easeOut' }}
            className="h-full"
          >
            <HistoryScreen catches={catches} loading={loading} reload={reloadAsync} />
          </motion.div>
        )}
        {tab === 'stats' && (
          <motion.div
            key="stats"
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -20 }}
            transition={{ duration: 0.25, ease: 'easeOut' }}
            className="h-full"
          >
            <StatsScreen catches={catches} />
          </motion.div>
        )}
        {tab === 'map' && (
          <motion.div
            key="map"
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -20 }}
            transition={{ duration: 0.25, ease: 'easeOut' }}
            className="h-full"
          >
            <MapScreen catches={catches} reload={reloadAsync} />
          </motion.div>
        )}
      </AnimatePresence>

      {tab !== 'add' && <BottomNav active={tab} onChange={setTab} />}
    </div>
  );
}

export default App;
