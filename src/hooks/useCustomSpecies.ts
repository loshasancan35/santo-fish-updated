import { useCallback, useEffect, useState } from 'react';
import { supabase } from '@/lib/supabase';
import { CustomSpecies } from '@/types';

export function useCustomSpecies() {
  const [customSpecies, setCustomSpecies] = useState<CustomSpecies[]>([]);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    const { data, error } = await supabase
      .from('custom_species')
      .select('*')
      .order('name', { ascending: true });
    if (!error) {
      setCustomSpecies(data ?? []);
    }
    setLoading(false);
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  const addCustomSpecies = useCallback(
    async (name: string, tip?: string, photoUrl?: string): Promise<CustomSpecies | null> => {
      const trimmed = name.trim();
      if (!trimmed) return null;
      const { data, error } = await supabase
        .from('custom_species')
        .insert({ name: trimmed, tip: tip?.trim() || null, photo_url: photoUrl?.trim() || null })
        .select()
        .maybeSingle();
      if (error || !data) {
        // Maybe already exists — try fetching
        const { data: existing } = await supabase
          .from('custom_species')
          .select('*')
          .eq('name', trimmed)
          .maybeSingle();
        if (existing) {
          setCustomSpecies((prev) => {
            if (prev.some((s) => s.name === existing.name)) return prev;
            return [...prev, existing].sort((a, b) => a.name.localeCompare(b.name, 'tr'));
          });
          return existing as CustomSpecies;
        }
        return null;
      }
      setCustomSpecies((prev) => [...prev, data as CustomSpecies].sort((a, b) => a.name.localeCompare(b.name, 'tr')));
      return data as CustomSpecies;
    },
    []
  );

  return { customSpecies, loading, reload: load, addCustomSpecies };
}
