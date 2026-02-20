"use client";

import { forwardRef } from "react";

type ButtonVariant = "primary" | "ghost" | "icon";

interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: ButtonVariant;
  children: React.ReactNode;
}

export const Button = forwardRef<HTMLButtonElement, ButtonProps>(
  ({ variant = "primary", children, className = "", disabled, ...props }, ref) => {
    const base =
      "inline-flex items-center justify-center transition-all duration-150 ease-out font-medium focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-40";

    const variants: Record<ButtonVariant, string> = {
      primary:
        "h-9 px-4 rounded-lg text-sm text-white",
      ghost:
        "h-9 px-3 rounded-lg text-sm",
      icon:
        "h-9 w-9 rounded-lg",
    };

    const interactiveStyles: Record<ButtonVariant, React.CSSProperties> = {
      primary: {
        background: disabled ? "var(--color-locked)" : "var(--color-accent)",
      },
      ghost: {
        color: "var(--color-text-secondary)",
      },
      icon: {
        color: "var(--color-text-secondary)",
      },
    };

    return (
      <button
        ref={ref}
        className={`${base} ${variants[variant]} ${className}`}
        style={interactiveStyles[variant]}
        disabled={disabled}
        onMouseEnter={(e) => {
          if (disabled) return;
          if (variant === "primary") {
            e.currentTarget.style.background = "var(--color-accent-hover)";
          } else {
            e.currentTarget.style.background = "var(--color-border)";
          }
        }}
        onMouseLeave={(e) => {
          if (variant === "primary") {
            e.currentTarget.style.background = disabled
              ? "var(--color-locked)"
              : "var(--color-accent)";
          } else {
            e.currentTarget.style.background = "transparent";
          }
        }}
        {...props}
      >
        {children}
      </button>
    );
  }
);

Button.displayName = "Button";
