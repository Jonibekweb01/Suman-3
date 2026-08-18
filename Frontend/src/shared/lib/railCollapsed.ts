import { create } from 'zustand';
import { readStorage, writeStorage } from './hooks';

const STORAGE_KEY = 'suman:rail-collapsed';

interface RailCollapsedState {
  collapsed: boolean;
  toggle: () => void;
}

/**
 * Left-rail collapse state.
 *
 * Lifted out of the rail itself because the *shell* owns the dashboard grid:
 * the rail's width is a column track on the layout wrapper, so the wrapper and
 * the toggle button need to read the same value. Persisted because rail width
 * is a workspace preference — a shopper who reclaimed that space for the
 * product grid should not have to reclaim it again on the next page.
 */
export const useRailCollapsed = create<RailCollapsedState>((set) => ({
  collapsed: readStorage(STORAGE_KEY, false),
  toggle: () =>
    set((state) => {
      const collapsed = !state.collapsed;
      writeStorage(STORAGE_KEY, collapsed);
      return { collapsed };
    }),
}));
