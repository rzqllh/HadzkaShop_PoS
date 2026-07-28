import { formatIDR } from "@/lib/utils";

interface TillSummaryRowProps {
  label: string;
  value: number;
  isTotal?: boolean;
  isNegative?: boolean;
}

export function TillSummaryRow({ label, value, isTotal = false, isNegative = false }: TillSummaryRowProps) {
  return (
    <div className={`flex justify-between items-center py-2 ${isTotal ? "border-t border-border pt-4 mt-2 font-bold" : "text-muted-foreground"}`}>
      <span className={isTotal ? "text-foreground" : ""}>{label}</span>
      <span className={`font-price ${isTotal ? "text-lg text-foreground" : ""} ${isNegative ? "text-destructive" : ""}`}>
        {isNegative ? "-" : ""}{formatIDR(Math.abs(value))}
      </span>
    </div>
  );
}
