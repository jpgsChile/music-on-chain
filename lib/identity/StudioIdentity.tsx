"use client";

import { createContext, useContext } from "react";

export type StudioIdentity = {
  actorRef: string;
  walletAddress: string | null;
};

const StudioIdentityContext = createContext<StudioIdentity | null>(null);

export function StudioIdentityProvider({
  value,
  children,
}: {
  value: StudioIdentity;
  children: React.ReactNode;
}) {
  return (
    <StudioIdentityContext.Provider value={value}>
      {children}
    </StudioIdentityContext.Provider>
  );
}

export function useStudioIdentity(): StudioIdentity {
  const value = useContext(StudioIdentityContext);
  if (!value) {
    throw new Error("useStudioIdentity requires StudioIdentityProvider");
  }
  return value;
}

export function useOptionalStudioIdentity(): StudioIdentity | null {
  return useContext(StudioIdentityContext);
}
