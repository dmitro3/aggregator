import { clsx } from "clsx";

export default function Money({
  value,
  ...props
}: React.ComponentProps<"span"> & { value: number }) {
  const intl = Intl.NumberFormat("en", {});
  return (
    <span
      {...props}
      className={clsx(
        "dollar before:text-green before:text-xs before:font-bold before:font-[var(--font-mono)]",
        props.className,
      )}
    >
      {intl.format(value)}
    </span>
  );
}
