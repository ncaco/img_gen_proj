 'use client';

import { createContext, useContext, useMemo, useState, type ReactNode } from 'react';

export type EncyclopediaSelection = {
  characterId: number;
  gender: string | null;
  attribute: string | null;
  type: string | null;
} | null;

type FlowUIContextValue = {
  isEncyclopediaOpen: boolean;
  openEncyclopedia: () => void;
  closeEncyclopedia: () => void;
  toggleEncyclopedia: () => void;
  encyclopediaSelection: EncyclopediaSelection;
  setEncyclopediaSelection: (selection: EncyclopediaSelection) => void;
  clearEncyclopediaSelection: () => void;
};

const FlowUIContext = createContext<FlowUIContextValue | undefined>(undefined);

export function FlowUIProvider({ children }: { children: ReactNode }) {
  const [isEncyclopediaOpen, setIsEncyclopediaOpen] = useState(false);
  const [encyclopediaSelection, setEncyclopediaSelectionState] = useState<EncyclopediaSelection>(null);

  const value = useMemo(
    () => ({
      isEncyclopediaOpen,
      openEncyclopedia: () => setIsEncyclopediaOpen(true),
      closeEncyclopedia: () => setIsEncyclopediaOpen(false),
      toggleEncyclopedia: () => setIsEncyclopediaOpen((prev) => !prev),
      encyclopediaSelection,
      setEncyclopediaSelection: (selection: EncyclopediaSelection) => setEncyclopediaSelectionState(selection),
      clearEncyclopediaSelection: () => setEncyclopediaSelectionState(null),
    }),
    [isEncyclopediaOpen, encyclopediaSelection]
  );

  return <FlowUIContext.Provider value={value}>{children}</FlowUIContext.Provider>;
}

export function useFlowUI(): FlowUIContextValue {
  const ctx = useContext(FlowUIContext);
  if (!ctx) {
    throw new Error('useFlowUI must be used within a FlowUIProvider');
  }
  return ctx;
}


