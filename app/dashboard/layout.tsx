"use client";

import StudioSidebar, { StudioAuthGate } from "@/components/studio/StudioSidebar";

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <StudioAuthGate>
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
