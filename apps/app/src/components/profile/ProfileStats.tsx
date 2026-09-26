import { ArrowDownLeft, ArrowUpRight, Package, Wallet } from "lucide-react";
import { formatAmount, type PurchaseRecord, type SaleRecord } from "@/lib/profileHistory";

function Cell({
  icon,
  label,
  value,
  accent,
}: {
  icon: React.ReactNode;
  label: string;
  value: string;
  accent?: "positive" | "primary";
}) {
  return (
    <div className="flex min-w-0 items-center gap-3 bg-surface px-4 py-3.5 sm:px-5">
      <span
        aria-hidden="true"
        className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg border border-primary/25 bg-primary/10 text-primary-light"
      >
        {icon}
      </span>
      <div className="min-w-0">
        <p className="panel-label leading-tight">{label}</p>
        <p
          className={`numeric mt-0.5 truncate text-[17px] font-bold leading-none ${
            accent === "positive"
              ? "text-positive"
              : accent === "primary"
                ? "text-primary-bright"
                : "text-white"
          }`}
        >
          {value}
        </p>
      </div>
    </div>
  );
}

/**
 * The four numbers a profile is actually read for. They used to be a caption
 * line buried inside whichever history tab happened to be open, so half of them
 * were invisible at any moment.
 */
export function ProfileStats({
  sales,
  purchases,
}: {
  sales: SaleRecord[];
  purchases: PurchaseRecord[];
}) {
  const earned = sales.reduce((sum, sale) => sum + sale.totalEarned, 0);
  const spent = purchases.reduce((sum, purchase) => sum + purchase.amount, 0);
  const currency = sales[0]?.currency ?? purchases[0]?.currency ?? "USD";

  return (
    // Hairlines are grid gaps over a line-coloured base, so they land between
    // cells at both column counts without per-cell edge classes.
    <div className="grid grid-cols-2 gap-px overflow-hidden rounded-2xl border border-line bg-line lg:grid-cols-4">
      <Cell
        icon={<Package className="h-[15px] w-[15px]" />}
        label={sales.length === 1 ? "Listing sold" : "Listings sold"}
        value={String(sales.length)}
      />
      <Cell
        icon={<ArrowUpRight className="h-[15px] w-[15px]" />}
        label="Earned"
        value={formatAmount(earned, currency)}
        accent="positive"
      />
      <Cell
        icon={<Wallet className="h-[15px] w-[15px]" />}
        label="Bought & won"
        value={String(purchases.length)}
      />
      <Cell
        icon={<ArrowDownLeft className="h-[15px] w-[15px]" />}
        label="Spent"
        value={formatAmount(spent, currency)}
        accent="primary"
      />
    </div>
  );
}
