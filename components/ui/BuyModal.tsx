"use client";

import { useEffect, useState } from "react";

type BuyModalProps = {
  open: boolean;
  onClose: () => void;
  title: string;
  confirmLabel: string;
  successLabel: string;
  closeLabel: string;
  trackTitle: string;
  priceLabel: string;
};

export default function BuyModal({
  open,
  onClose,
  title,
  confirmLabel,
  successLabel,
  closeLabel,
  trackTitle,
  priceLabel,
}: BuyModalProps) {
  const [confirmed, setConfirmed] = useState(false);

  useEffect(() => {
    if (!open) {
      setConfirmed(false);
    }
  }, [open]);

  if (!open) {
    return null;
  }

  return (
    <div className="fixed inset-0 bg-black/70 flex items-center justify-center z-50">
      <div className="bg-zinc-900 p-6 rounded-xl max-w-sm text-center">
        <h3 className="text-base font-semibold">{title}</h3>
        {confirmed ? (
          <p className="text-sm mt-3">{successLabel}</p>
        ) : (
          <>
            <p className="text-sm mt-3">{trackTitle}</p>
            {priceLabel ? (
              <p className="text-xs opacity-70 mt-1">{priceLabel}</p>
            ) : null}
            <button
              className="mt-5 bg-white text-black px-4 py-2 rounded-full text-sm"
              onClick={() => setConfirmed(true)}
            >
              {confirmLabel}
            </button>
          </>
        )}
        <button
          className="mt-4 text-xs opacity-70"
          onClick={() => {
            setConfirmed(false);
            onClose();
          }}
        >
          {closeLabel}
        </button>
      </div>
    </div>
  );
}
