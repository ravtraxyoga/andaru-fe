import { createContext, useContext, useEffect, useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { api } from '../api';
import type { ChildCard } from '../types';

const KEY = 'andaru.child';

export function useChildrenQuery() {
  return useQuery({ queryKey: ['children'], queryFn: ({ signal }) => api<ChildCard[]>('/children', { signal }) });
}

/** Anak yang sedang dilihat. Satu ortu bisa punya banyak anak; pilihan diingat per browser. */
export function useSelectedChildState() {
  const q = useChildrenQuery();
  const [id, setId] = useState<number | null>(() => {
    try {
      const v = localStorage.getItem(KEY);
      return v ? Number(v) : null;
    } catch {
      return null;
    }
  });
  const list = q.data ?? [];
  const valid = list.find((c) => c.id === id) ?? list[0] ?? null;
  useEffect(() => {
    if (valid && valid.id !== id) setId(valid.id);
  }, [valid, id]);
  const select = (v: number) => {
    setId(v);
    try {
      localStorage.setItem(KEY, String(v));
    } catch {
      /* abaikan */
    }
  };
  return { children: list, child: valid, select, loading: q.isLoading, error: q.error };
}

export type SelectedChild = ReturnType<typeof useSelectedChildState>;
export const ChildContext = createContext<SelectedChild | null>(null);

export function useSelectedChild() {
  const v = useContext(ChildContext);
  if (!v) throw new Error('ChildContext belum dipasang');
  return v;
}
