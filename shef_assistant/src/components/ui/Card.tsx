"use client";

import { HTMLAttributes, forwardRef } from "react";

interface CardProps extends HTMLAttributes<HTMLDivElement> {
  title?: string;
}

const Card = forwardRef<HTMLDivElement, CardProps>(
  ({ className = "", title, children, ...props }, ref) => {
    return (
      <div
        ref={ref}
        className={`
          bg-white dark:bg-gray-800
          rounded-xl
          border border-gray-200 dark:border-gray-700
          p-6
          ${className}
        `}
        {...props}
      >
        {title && (
          <h2 className="text-lg font-semibold text-gray-900 dark:text-gray-100 mb-4">
            {title}
          </h2>
        )}
        {children}
      </div>
    );
  }
);

Card.displayName = "Card";

export default Card;
