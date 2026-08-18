import { useEffect, type ReactNode } from 'react';
import { create } from 'zustand';

interface RailSlotState {
  filterSlot: ReactNode | null;
  setFilterSlot: (node: ReactNode | null) => void;
}

const useRailSlotStore = create<RailSlotState>((set) => ({
  filterSlot: null,
  setFilterSlot: (node) => set({ filterSlot: node }),
}));

/**
 * Lets a page project content into the dashboard's left rail.
 *
 * On desktop the rail is owned by the app shell, but the *filters* belong to
 * whichever listing page is mounted. Rather than teaching the shell about
 * catalogue state — or giving the catalogue a second sidebar of its own next
 * to the shell's — the page publishes its filter panel here and the rail
 * renders it. The slot clears on unmount, so navigating to the cart cannot
 * leave a stale filter panel behind.
 */
export function useRailFilters(node: ReactNode): void {
  const setFilterSlot = useRailSlotStore((state) => state.setFilterSlot);

  useEffect(() => {
    setFilterSlot(node);
    return () => setFilterSlot(null);
  }, [node, setFilterSlot]);
}

export function RailFilterOutlet() {
  const filterSlot = useRailSlotStore((state) => state.filterSlot);
  return <>{filterSlot}</>;
}
