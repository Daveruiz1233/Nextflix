import { create } from "zustand";

export type NavTab = "home" | "library" | "downloads" | "search";

interface NavigationState {
  isSidebarOpen: boolean;
  activeTab: NavTab;
  toggleSidebar: () => void;
  setSidebarOpen: (open: boolean) => void;
  setActiveTab: (tab: NavTab) => void;
}

export const useNavigationStore = create<NavigationState>((set) => ({
  isSidebarOpen: true, // Default to open on desktop
  activeTab: "home",
  toggleSidebar: () => set((state) => ({ isSidebarOpen: !state.isSidebarOpen })),
  setSidebarOpen: (open) => set({ isSidebarOpen: open }),
  setActiveTab: (tab) => set({ activeTab: tab }),
}));
