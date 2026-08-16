/**
 * The brand signature: a clothing swing-tag shape with a pin dot,
 * used everywhere we need a badge — "جديد", "New Drop", stock flags, etc.
 * variant: "lime" (default) | "dark" | "ghost" (for paper/light sections)
 */
export default function SwingTag({ children, variant = "lime", className = "" }) {
  const variantClass = variant === "dark" ? "swing-tag--dark" : variant === "ghost" ? "swing-tag--ghost" : "";
  return (
    <span className={`swing-tag ${variantClass} ${className}`}>
      <span className="swing-tag__pin" aria-hidden="true" />
      {children}
    </span>
  );
}
