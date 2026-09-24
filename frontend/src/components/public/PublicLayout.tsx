import { Outlet } from "react-router";
import { Navbar } from "./Navbar";
import { Footer } from "./Footer";
import { PublicBottomNav } from "./PublicBottomNav";

export function PublicLayout() {
  return (
    <div className="flex min-h-screen flex-col bg-white text-[#0D2137]">
      <Navbar />
      <main className="flex-1 pb-16 lg:pb-0">
        <Outlet />
      </main>
      <Footer />
      <PublicBottomNav />
    </div>
  );
}

