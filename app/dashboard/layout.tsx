"use client";

import { usePathname } from "next/navigation";
import StudioSidebar, { StudioAuthGate } from "@/components/studio/StudioSidebar";

function isFanSupportPath(pathname: string) {
  return pathname === "/dashboard/support" || pathname.startsWith("/dashboard/support/");
}

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const pathname = usePathname();
  const fanSupport = isFanSupportPath(pathname);

  if (fanSupport) {
    return (
      <StudioAuthGate variant="fan">
        <div className="min-h-screen px-4 sm:px-6 lg:px-8 py-12">
          <div className="max-w-6xl mx-auto">{children}</div>
        </div>
      </StudioAuthGate>
    );
  }

  return (
    <StudioAuthGate variant="studio">
      <div className="min-h-screen">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 sm:py-10">
          <div className="flex flex-col lg:flex-row gap-8 lg:gap-10">
            <StudioSidebar />
            <main className="flex-1 min-w-0">{children}</main>
          </div>
        </div>
      </div>
    </StudioAuthGate>
  );
}
