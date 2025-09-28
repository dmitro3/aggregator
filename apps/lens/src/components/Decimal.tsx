type DecimalProps = {
  value: number;
  end?: string;
  cap?: number;
};
export default function Decimal({
  value,
  end,
  cap,
  ...props
}: DecimalProps & React.ComponentProps<"span">) {
  const intl = Intl.NumberFormat("en");
  const [number, mantissa] = value.toString().split(/\./);

  if (cap && value > cap)
    return (
      <span {...props}>
        {" "}
        &gt;{cap}
        {end}
      </span>
    );
  else if (mantissa && value < 1) {
    const truncate = mantissa.slice(1, mantissa.length - 3);

    return (
      <span {...props}>
        {intl.format(Number(number))}.{mantissa.slice(0, 1)}
        {truncate.length > 0 && <sub>{truncate.length}</sub>}
        {mantissa.slice(mantissa.length - 3)}
        {end}
      </span>
    );
  } else
    return (
      <span {...props}>
        {intl.format(value)}
        {end}
      </span>
    );
}
