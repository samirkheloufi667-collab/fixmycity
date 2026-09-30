import { createContext, useContext } from 'react';
import type { Category, City } from './types';
import { useApi } from './use-api';

interface Reference {
  categories: Category[];
  city: City | null;
  categoryBySlug: (slug: string) => Category | undefined;
}

const ReferenceContext = createContext<Reference>({ categories: [], city: null, categoryBySlug: () => undefined });

/** Catégories et territoire : chargés une fois, utilisés partout (carte, filtres, formulaire). */
export function ReferenceProvider({ children }: { children: React.ReactNode }) {
  const categories = useApi<Category[]>('/categories');
  const city = useApi<City>('/city');
  const list = categories.data ?? [];
  return (
    <ReferenceContext.Provider
      value={{ categories: list, city: city.data, categoryBySlug: (slug) => list.find((c) => c.slug === slug) }}
    >
      {children}
    </ReferenceContext.Provider>
  );
}

export const useReference = () => useContext(ReferenceContext);
