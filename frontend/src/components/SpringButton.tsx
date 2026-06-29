import { motion, useReducedMotion } from "framer-motion";
import React from "react";

interface SpringButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  children: React.ReactNode;
}

export const SpringButton = React.forwardRef<HTMLButtonElement, SpringButtonProps>(
  ({ children, className = "", ...props }, ref) => {
    const shouldReduceMotion = useReducedMotion();
    const { onDrag, onDragStart, onDragEnd, ...restProps } = props as any;

    return (
      <motion.button
        ref={ref as any}
        whileTap={shouldReduceMotion ? {} : { scale: 0.97 }}
        transition={
          shouldReduceMotion
            ? {}
            : { type: "spring", stiffness: 400, damping: 17 }
        }
        className={className}
        {...restProps}
      >
        {children}
      </motion.button>
    );
  }
);

SpringButton.displayName = "SpringButton";
export default SpringButton;
