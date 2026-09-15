type BrandMarkProps = {
  size?: "sm" | "md" | "lg";
  className?: string;
  suffix?: string;
};

const sizeStyles = {
  sm: {
    wrap: "gap-0",
    title: "text-lg leading-none tracking-wide sm:text-xl",
    byline: "text-[0.62rem] leading-none tracking-wider sm:text-[0.7rem]",
  },
  md: {
    wrap: "gap-0",
    title: "text-xl leading-none tracking-wide sm:text-2xl",
    byline: "text-[0.68rem] leading-none tracking-wider sm:text-xs",
  },
  lg: {
    wrap: "gap-0.5",
    title: "text-3xl leading-none tracking-wide sm:text-5xl",
    byline: "text-sm leading-none tracking-wider sm:text-base",
  },
} as const;

/**
 * Stacked brand lockup: “Home Essentials” with smaller “by Kamgol” at the base.
 */
export function BrandMark({ size = "md", className = "", suffix }: BrandMarkProps) {
  const s = sizeStyles[size];

  return (
    <span className={`inline-flex items-end gap-2 ${className}`.trim()}>
      <span
        className={`font-display inline-flex flex-col items-stretch ${s.wrap}`}
        aria-label="Home Essentials by Kamgol"
      >
        <span className={`font-semibold ${s.title}`}>Home Essentials</span>
        <span
          className={`self-end font-light italic opacity-90 ${s.byline}`}
          aria-hidden
        >
          by Kamgol
        </span>
      </span>
      {suffix ? (
        <span className="pb-0.5 text-xs font-medium tracking-wide opacity-70 sm:text-sm">
          {suffix}
        </span>
      ) : null}
    </span>
  );
}
