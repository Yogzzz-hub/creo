import { createContext, useContext, useState } from "react";

interface PlatformSidebarContextType {
  mobileOpen: boolean;
  setMobileOpen: (open: boolean) => void;
}

const PlatformSidebarContext = createContext<PlatformSidebarContextType | undefined>(undefined);

export function PlatformSidebarProvider({ children }: { children: React.ReactNode }) {
  const [mobileOpen, setMobileOpen] = useState(false);
  return (
    <PlatformSidebarContext.Provider value={{ mobileOpen, setMobileOpen }}>
      {children}
    </PlatformSidebarContext.Provider>
  );
}

export function usePlatformSidebar() {
  const ctx = useContext(PlatformSidebarContext);
  if (!ctx) throw new Error("usePlatformSidebar must be used within PlatformSidebarProvider");
  return ctx;
}
