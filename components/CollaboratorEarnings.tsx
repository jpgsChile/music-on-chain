"use client";

import { CollaboratorEarning } from "@/lib/dashboard";
import { formatAddress } from "@/lib/utils";
import { getTranslations } from "@/lib/i18n";

function formatUSDC(amount: number): string {
  return amount.toFixed(2);
}

interface CollaboratorEarningsProps {
  earnings: CollaboratorEarning[];
}

export default function CollaboratorEarnings({ earnings }: CollaboratorEarningsProps) {
  const t = getTranslations("es");

  if (earnings.length === 0) {
    return (
      <div className="border border-border rounded-lg p-6 bg-background">
        <h3 className="text-lg font-semibold text-foreground mb-4">
          {t.dashboard.collaboratorEarnings}
        </h3>
        <p className="text-foreground/60">{t.dashboard.noEarnings}</p>
      </div>
    );
  }

  const totalEarned = earnings.reduce((sum, e) => sum + e.totalEarned, 0);

  return (
    <div className="border border-border rounded-lg p-6 bg-background">
      <h3 className="text-lg font-semibold text-foreground mb-6">
        {t.dashboard.collaboratorEarnings}
      </h3>
      <div className="space-y-4">
        {earnings.map((earning, index) => {
          const percentageOfTotal = totalEarned > 0 
            ? (earning.totalEarned / totalEarned) * 100 
            : 0;

          return (
            <div key={index} className="space-y-2">
              <div className="flex items-center justify-between">
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-1">
                    <span className="font-medium text-foreground">
                      {earning.role || "Collaborator"}
                    </span>
                    <span className="text-xs text-foreground/50">
                      ({earning.percentage}% per sale)
                    </span>
                  </div>
                  <div className="text-xs font-mono text-foreground/60 truncate">
                    {formatAddress(earning.walletAddress)}
                  </div>
                </div>
                <div className="text-right ml-4">
                  <div className="text-lg font-bold text-foreground">
                    ${formatUSDC(earning.totalEarned)} USDC
                  </div>
                  <div className="text-xs text-foreground/60">
                    {earning.salesCount} sale{earning.salesCount !== 1 ? "s" : ""}
                  </div>
                </div>
              </div>
              {/* Progress bar */}
              <div className="h-2 bg-border rounded-full overflow-hidden">
                <div
                  className="h-full bg-accent transition-all"
                  style={{ width: `${percentageOfTotal}%` }}
                />
              </div>
            </div>
          );
        })}
      </div>
      <div className="mt-6 pt-6 border-t border-border">
        <div className="flex justify-between items-center">
          <span className="text-sm font-medium text-foreground/70">{t.dashboard.totalDistributed}</span>
          <span className="text-xl font-bold text-accent">
            ${formatUSDC(totalEarned)} USDC
          </span>
        </div>
      </div>
    </div>
  );
}

