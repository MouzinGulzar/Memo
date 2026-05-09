import type { ReactNode } from "react";
import BottomNav from "./BottomNav";
import SideNav from "./SideNav";
import "./AppLayout.css";

export default function AppLayout({ children }: { children: ReactNode }) {
  return (
    <div className="app-layout">
      {/* Sidebar — visible on wide screens only */}
      <div className="app-sidebar">
        <SideNav />
      </div>

      {/* Main content */}
      <main className="app-main">{children}</main>

      {/* Bottom nav — visible on narrow screens only */}
      <div className="app-bottom-nav">
        <BottomNav />
      </div>
    </div>
  );
}
