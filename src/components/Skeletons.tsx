export function CatchCardSkeleton() {
  return (
    <div className="flex gap-3 rounded-2xl bg-white p-3 shadow-soft">
      <div className="skeleton h-20 w-20 shrink-0 rounded-xl" />
      <div className="flex-1 space-y-2 py-1.5">
        <div className="skeleton h-4 w-2/3 rounded-full" />
        <div className="skeleton h-3 w-1/2 rounded-full" />
        <div className="skeleton h-3 w-1/3 rounded-full" />
      </div>
    </div>
  );
}

export function TipCardSkeleton() {
  return (
    <div className="rounded-2xl bg-white p-4 shadow-soft space-y-2">
      <div className="skeleton h-4 w-1/3 rounded-full" />
      <div className="skeleton h-3 w-full rounded-full" />
      <div className="skeleton h-3 w-4/5 rounded-full" />
    </div>
  );
}
