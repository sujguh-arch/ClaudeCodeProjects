"use client";

import { forwardRef, type ButtonHTMLAttributes, type ReactNode } from "react";

type ButtonVariant = "primary" | "secondary" | "outline" | "ghost" | "danger";
type ButtonSize = "sm" | "md" | "lg";

interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: ButtonVariant;
  size?: ButtonSize;
  isLoading?: boolean;
  leftIcon?: ReactNode;
  rightIcon?: ReactNode;
}

const variantStyles: Record<ButtonVariant, string> = {
  primary:
    "btn-gradient text-white font-semibold hover:shadow-glow disabled:hover:shadow-none",
  secondary:
    "bg-gray-100 dark:bg-gray-800 text-[var(--text-primary)] font-semibold hover:bg-gray-200 dark:hover:bg-gray-700",
  outline:
    "border border-gray-300 dark:border-gray-600 text-[var(--text-primary)] font-semibold hover:bg-gray-50 dark:hover:bg-gray-800",
  ghost:
    "text-[var(--text-secondary)] hover:text-[var(--text-primary)] hover:bg-gray-100 dark:hover:bg-gray-800",
  danger:
    "bg-red-500 text-white font-semibold hover:bg-red-600 dark:bg-red-600 dark:hover:bg-red-700",
};

const sizeStyles: Record<ButtonSize, string> = {
  sm: "px-3 py-1.5 text-sm rounded-md",
  md: "px-4 py-2.5 text-sm rounded-lg",
  lg: "px-6 py-3 text-base rounded-lg",
};

export const Button = forwardRef<HTMLButtonElement, ButtonProps>(
  (
    {
      variant = "primary",
      size = "md",
      isLoading = false,
      leftIcon,
      rightIcon,
      children,
      className = "",
      disabled,
      ...props
    },
    ref
  ) => {
    const isDisabled = disabled || isLoading;

    return (
      <button
        ref={ref}
        disabled={isDisabled}
        className={`
          inline-flex items-center justify-center gap-2
          btn-press
          transition-colors
          disabled:opacity-50 disabled:cursor-not-allowed
          ${variantStyles[variant]}
          ${sizeStyles[size]}
          ${className}
        `.trim()}
        {...props}
      >
        {isLoading ? (
          <span className="inline-block w-4 h-4 border-2 border-current border-t-transparent rounded-full animate-spin" />
        ) : (
          leftIcon
        )}
        {children}
        {!isLoading && rightIcon}
      </button>
    );
  }
);

Button.displayName = "Button";
