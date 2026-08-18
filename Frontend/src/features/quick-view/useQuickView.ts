import { create } from 'zustand';

interface QuickViewState {
  productId: string | null;
  isOpen: boolean;
  open: (productId: string) => void;
  close: () => void;
}

/**
 * Global quick-view target.
 *
 * Lives in a store rather than in each grid's local state because the sheet is
 * mounted once at the app shell: a product card in the home feed, the deal
 * band and the wishlist all open the same instance, so only one sheet can ever
 * be on screen and none of them need to render a modal of their own.
 */
export const useQuickView = create<QuickViewState>((set) => ({
  productId: null,
  isOpen: false,
  open: (productId) => set({ productId, isOpen: true }),
  // The id is kept on close so the sheet keeps its content through the exit
  // animation instead of flashing an empty panel as it slides away.
  close: () => set({ isOpen: false }),
}));
