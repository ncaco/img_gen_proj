'use client';

import { createContext, useContext, useMemo, useState, useEffect } from 'react';
import { listCategoriesPublic, type CategoryTreeNode } from '@/app/lib/category';

export interface CategoryOptions {
  gender: string[];
  class: string[];
  attribute: string[];
  /** 2·3·4뎁스 트리 (플로우에서 클래스 선택 시 하위 선택용) */
  classTree: CategoryTreeNode[];
  genderTree: CategoryTreeNode[];
  attributeTree: CategoryTreeNode[];
}

const defaultOptions: CategoryOptions = {
  gender: [],
  class: [],
  attribute: [],
  classTree: [],
  genderTree: [],
  attributeTree: [],
};

const CategoryOptionsContext = createContext<CategoryOptions>(defaultOptions);

export function CategoryOptionsProvider({ children }: { children: React.ReactNode }) {
  const [options, setOptions] = useState<CategoryOptions>(defaultOptions);

  useEffect(() => {
    listCategoriesPublic()
      .then((res) => {
        setOptions({
          gender: (res.gender as string[]) ?? [],
          class: (res.class as string[]) ?? [],
          attribute: (res.attribute as string[]) ?? [],
          classTree: (res.class_tree as CategoryTreeNode[]) ?? [],
          genderTree: (res.gender_tree as CategoryTreeNode[]) ?? [],
          attributeTree: (res.attribute_tree as CategoryTreeNode[]) ?? [],
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
