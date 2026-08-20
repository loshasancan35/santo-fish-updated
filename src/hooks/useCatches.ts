import { useCallback, useEffect, useState } from 'react';
import { supabase } from '@/lib/supabase';
import { Catch } from '@/types';

export function useCatches() {
  const [catches, setCatches] = useState<Catch[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    setError(null);
    const { data, error: fetchError } = await supabase
      .from('catches')
      .select('*')
      .order('catch_date', { ascending: false })
      .order('created_at', { ascending: false });

    if (fetchError) {
      setError(fetchError.message);
    } else {
      setCatches(data ?? []);
    }
    setLoading(false);
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  return { catches, loading, error, reload: load };
}
