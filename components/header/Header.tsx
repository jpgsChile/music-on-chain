"use client";

import type { ReactNode } from "react";
import { useState } from "react";

type HeaderProps = {
  brand: string;
  whatIsLabel: string;
  signInLabel: string;
  modalContent: ReactNode;
  closeLabel: string;
};

export default function Header({
  brand,
  whatIsLabel,
  signInLabel,
  modalContent,
  closeLabel,
}: HeaderProps) {
  const [open, setOpen] = useState(false);

  return (
    <>
      <header className="flex items-center justify-between px-4 py-3 sticky top-0 bg-black/80 backdrop-blur z-50">
        <span className="font-bold">{brand}</span>

        <button className="text-sm opacity-80" onClick={() => setOpen(true)}>
          {whatIsLabel}
        </button>

        <button className="bg-white text-black px-3 py-1 rounded-full text-sm">
          {signInLabel}
        </button>
      </header>

      {open && (
        <div className="fixed inset-0 bg-black/70 flex items-center justify-center z-50">
          <div className="bg-zinc-900 p-6 rounded-xl max-w-sm text-center">
            {modalContent}
            <button
              className="mt-4 text-sm opacity-70"
              onClick={() => setOpen(false)}
            >
              {closeLabel}
            </button>
          </div>
        </div>
      )}
    </>
  );
}
