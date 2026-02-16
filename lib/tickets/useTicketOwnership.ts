"use client";

import { useState, useEffect, useCallback } from "react";
import type { TicketOwnership } from "@/types/ticketNft";
import { getTicketsByWallet } from "./ownership";

export function useTicketOwnership(wallet: string) {
  const [tickets, setTickets] = useState<TicketOwnership[]>([]);

  const refresh = useCallback(() => {
    setTickets(getTicketsByWallet(wallet));
  }, [wallet]);

  useEffect(() => {
    refresh();
  }, [refresh]);

  return { tickets, refresh };
}
