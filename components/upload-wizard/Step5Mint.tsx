"use client";

interface Step5MintProps {
  title: string;
  isMinting: boolean;
  mintTxHash: string | null;
  mintTokenId: string | null;
  mintError: string | null;
  onMint: () => void;
  t: Record<string, string>;
}

export default function Step5Mint({
  title,
  isMinting,
  mintTxHash,
  mintTokenId,
  mintError,
  onMint,
  t,
}: Step5MintProps) {
  const success = Boolean(mintTxHash && mintTokenId);

  return (
    <div className="space-y-4">
      <p className="text-sm text-foreground/70">{t.step5Desc}</p>
      <div className="rounded-lg border border-border bg-border/5 p-4">
        <p className="text-sm text-foreground/80">
          <span className="text-foreground/60">{t.workLabel ?? t.titlePlaceholder}:</span>{" "}
          {title || "—"}
        </p>
      </div>
      {success && (
        <div className="rounded-lg border border-emerald-500/50 bg-emerald-500/10 p-4 text-sm text-foreground">
          <p className="font-medium text-emerald-600 dark:text-emerald-400">{t.mintSuccess}</p>
        </div>
      )}
      {mintError && <p className="text-sm text-red-500">{mintError}</p>}
      {!success && (
        <button
          type="button"
          onClick={onMint}
          disabled={isMinting}
          className="px-4 py-2 rounded-lg bg-accent text-background font-medium hover:bg-accent-hover disabled:opacity-50"
        >
          {isMinting ? t.minting : t.mint}
        </button>
      )}
    </div>
  );
}
