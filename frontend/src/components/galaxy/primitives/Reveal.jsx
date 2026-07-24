import React from "react";
import { motion } from "framer-motion";

/**
 * Scroll-triggered fade + rise. Non-essential motion; degrades gracefully.
 */
export default function Reveal({ children, y = 24, delay = 0, once = true, duration = 0.75, className = "", as = "div" }) {
  const MotionTag = motion[as] || motion.div;
  return (
    <MotionTag
      initial={{ opacity: 0, y }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once, amount: 0.15 }}
      transition={{ duration, ease: [0.22, 1, 0.36, 1], delay }}
      className={className}
    >
      {children}
    </MotionTag>
  );
}
