"use client";

import { useState } from "react";

export default function Header({ dict }: { dict: any }) {
  const [open, setOpen] = useState(false);

  return (
    <>
      <header className="flex items-center justify-between px-4 py-3 sticky top-0 bg-black/80 backdrop-blur z-50">
        <span className="font-bold">{dict.header.brand}</span>

        <button className="text-sm opacity-80" onClick={() => setOpen(true)}>
          {dict.header.whatIs}
        </button>

        <button className="bg-white text-black px-3 py-1 rounded-full text-sm">
          {dict.header.signIn}
        </button>
      </header>

      {open && (
        <div className="fixed inset-0 bg-black/70 flex items-center justify-center z-50">
          <div className="bg-zinc-900 p-6 rounded-xl max-w-sm text-center">
            <p className="text-sm leading-relaxed">{dict.header.about}</p>
            <button
              className="mt-4 text-sm opacity-70"
              onClick={() => setOpen(false)}
            >
              {dict.common.close}
            </button>
          </div>
        </div>
      )}
    </>
  );
}
