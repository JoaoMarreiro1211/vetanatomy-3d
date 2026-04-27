import { ReactNode } from "react";

import { Card } from "./card";

export function StatCard({
  label,
  value,
  icon,
  helper,
}: {
  label: string;
  value: string | number;
  icon?: ReactNode;
  helper?: string;
}) {
  return (
    <Card className="p-5">
      <div className="flex items-start justify-between gap-4">
        <div>
          <p className="text-sm font-medium text-muted-foreground">{label}</p>
          <div className="mt-2 text-3xl font-bold text-foreground">{value}</div>
          {helper ? <p className="mt-2 text-xs text-muted-foreground">{helper}</p> : null}
        </div>
        {icon ? <div className="grid h-10 w-10 place-items-center rounded-md bg-primary-soft text-[#2F7A3A]">{icon}</div> : null}
      </div>
    </Card>
  );
}
