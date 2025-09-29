import { clsx } from "clsx";
import Decimal from "./Decimal";

export default function Money({
  value,
  ...props
}: React.ComponentProps<"span"> & { value: number }) {
  return (
    <Decimal
      {...props}
      value={value}
      className={clsx(
        "dollar font-bold before:text-green before:text-xs before:font-bold before:font-[var(--font-mono)]",
        props.className,
      )}
    />
  );
}
