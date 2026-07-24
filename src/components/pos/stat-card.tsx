import { Card, CardContent } from "@/components/ui/card";
import { ReactNode } from "react";

interface StatCardProps {
  title: string;
  value: string | number;
  icon: ReactNode;
  description?: string;
  trend?: {
    value: number;
    label: string;
  };
}

export function StatCard({ title, value, icon, description, trend }: StatCardProps) {
  return (
    <Card className="bg-card">
      <CardContent className="p-6">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-sm font-medium text-muted-foreground">{title}</h3>
          <div className="p-2 bg-primary/10 rounded-lg text-primary">
            {icon}
          </div>
        </div>
        <div className="space-y-1">
          <p className="text-2xl font-bold text-foreground">{value}</p>
          {description && (
            <p className="text-sm text-muted-foreground">{description}</p>
          )}
          {trend && (
            <div className={`text-sm font-medium flex items-center gap-1 mt-2 ${trend.value >= 0 ? "text-success" : "text-destructive"}`}>
              <span>{trend.value >= 0 ? "+" : ""}{trend.value}%</span>
              <span className="text-muted-foreground ml-1">{trend.label}</span>
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  );
}
