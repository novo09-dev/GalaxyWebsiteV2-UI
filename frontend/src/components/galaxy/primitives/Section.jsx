import React from "react";

/**
 * Section wrapper — consistent vertical rhythm + container.
 * Props: id, bg (tailwind bg class), className, wide, children
 */
export default function Section({ id, bg = "bg-[#08080A]", className = "", wide = false, children, ...rest }) {
  return (
    <section id={id} className={`relative section ${bg} ${className}`} {...rest}>
      <div className={wide ? "gx-container-wide" : "gx-container"}>{children}</div>
    </section>
  );
}
