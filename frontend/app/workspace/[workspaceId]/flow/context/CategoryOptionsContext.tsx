'use client';

import { createContext, useContext, useMemo, useState, useEffect } from 'react';
import { listCategoriesPublic } from '@/app/lib/category';

export interface CategoryOptions {
  gender: string[];
  class: string[];
  attribute: string[];
}

const defaultOptions: CategoryOptions = {
  gender: [],
  class: [],
  attribute: [],
};

const CategoryOptionsContext = createContext<CategoryOptions>(defaultOptions);

export function CategoryOptionsProvider({ children }: { children: React.ReactNode }) {
  const [options, setOptions] = useState<CategoryOptions>(defaultOptions);

  useEffect(() => {
    listCategoriesPublic()
      .then((res) => {
        setOptions({
          gender: res.gender ?? [],
          class: res.class ?? [],
          attribute: res.attribute ?? [],
        });
      })
      .catch(() => {
        // API 실패 시 기본값 유지
      });
  }, []);

  const value = useMemo(() => options, [options]);
  return (
    <CategoryOptionsContext.Provider value={value}>
      {children}
    </CategoryOptionsContext.Provider>
  );
}

export function useCategoryOptions(): CategoryOptions {
  return useContext(CategoryOptionsContext);
}
