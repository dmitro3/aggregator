type DecimalProps = {
  value: number;
  end?: string;
  leading?: string;
  cap?: number;
  showPositiveSign?: boolean;
  truncateStyle?: React.CSSProperties;
};
export default function Decimal({
  value,
  end,
  cap,
  leading,
  truncateStyle,
  showPositiveSign,
  ...props
}: DecimalProps & React.ComponentProps<"span">) {
  const intl = Intl.NumberFormat("en");
  const [number, mantissa] = value.toString().split(/\./);

  const sign = (
    <span>
      {value > 0 ? showPositiveSign && "+" : "-"}
      {leading}
    </span>
  );

  if (cap && value > cap)
    return (
      <span {...props}>
        &gt;
        {sign}
        {Math.abs(cap)}
        {end}
      </span>
    );
  else if (mantissa && Math.abs(value) < 1) {
    const truncate = mantissa.slice(1, mantissa.length - 3);

    return (
      <span {...props}>
        {sign}
        {intl.format(Math.abs(Number(number)))}.{mantissa.slice(0, 1)}
        {truncate.length > 0 && (
          <sub style={truncateStyle}>{truncate.length}</sub>
        )}
        {mantissa.slice(mantissa.length - 3)}
        {end}
      </span>
    );
  } else
    return (
      <span {...props}>
        {sign}
        {intl.format(Math.abs(value))}
        {end}
      </span>
    );
}
