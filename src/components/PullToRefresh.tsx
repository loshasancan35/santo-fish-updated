import { ReactNode, useRef, useState } from 'react';
import { motion, useMotionValue, useTransform, animate } from 'framer-motion';
import { RefreshCw } from 'lucide-react';

const TRIGGER_DISTANCE = 60;

export function PullToRefresh({ onRefresh, children }: { onRefresh: () => Promise<void>; children: ReactNode }) {
  const containerRef = useRef<HTMLDivElement>(null);
  const startY = useRef(0);
  const dragging = useRef(false);
  const [refreshing, setRefreshing] = useState(false);
  const pullY = useMotionValue(0);
  const rotate = useTransform(pullY, [0, TRIGGER_DISTANCE], [0, 220]);
  const opacity = useTransform(pullY, [0, 24], [0, 1]);

  const handleTouchStart = (e: React.TouchEvent) => {
    if (containerRef.current && containerRef.current.scrollTop <= 0 && !refreshing) {
      startY.current = e.touches[0].clientY;
      dragging.current = true;
    }
  };

  const handleTouchMove = (e: React.TouchEvent) => {
    if (!dragging.current) return;
    const diff = e.touches[0].clientY - startY.current;
    if (diff > 0) {
      pullY.set(Math.min(diff * 0.5, 90));
    } else {
      dragging.current = false;
    }
  };

  const handleTouchEnd = async () => {
    if (!dragging.current) return;
    dragging.current = false;
    if (pullY.get() > TRIGGER_DISTANCE) {
      setRefreshing(true);
      animate(pullY, 46, { type: 'spring', stiffness: 300, damping: 30 });
      await onRefresh();
      setRefreshing(false);
    }
    animate(pullY, 0, { type: 'spring', stiffness: 300, damping: 30 });
  };

  return (
    <div
      ref={containerRef}
      className="h-full overflow-y-auto overscroll-contain"
      onTouchStart={handleTouchStart}
      onTouchMove={handleTouchMove}
      onTouchEnd={handleTouchEnd}
    >
      <motion.div style={{ height: pullY, opacity }} className="flex items-end justify-center overflow-hidden pb-2">
        <motion.div style={{ rotate }} className={refreshing ? 'animate-spin' : ''}>
          <RefreshCw className="h-5 w-5 text-deep-600" />
        </motion.div>
      </motion.div>
      {children}
    </div>
  );
}
