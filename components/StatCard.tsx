interface StatCardProps {
  title: string;
  value: string;
  subtitle?: string;
  icon?: React.ReactNode;
}

export default function StatCard({ title, value, subtitle, icon }: StatCardProps) {
  return (
    <div className="border border-border rounded-lg p-6 bg-background hover:border-accent/30 transition-colors">
      <div className="flex items-start justify-between mb-4">
        <h3 className="text-sm font-medium text-foreground/70">{title}</h3>
        {icon && <div className="text-foreground/40">{icon}</div>}
      </div>
      <div className="space-y-1">
        <div className="text-3xl font-bold text-foreground">{value}</div>
        {subtitle && (
          <div className="text-sm text-foreground/60">{subtitle}</div>
        )}
      </div>
    </div>
  );
}










