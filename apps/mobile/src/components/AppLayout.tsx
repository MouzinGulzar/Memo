import type { ReactNode } from "react";
import BottomNav from "./BottomNav";

export default function AppLayout({ children }: { children: ReactNode }) {
  return (
    <div style={{ paddingBottom: 60 }}>
      {children}
      <BottomNav />
    </div>
  );
}
