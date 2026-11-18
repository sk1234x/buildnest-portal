import React from 'react';

export function BrandLogo({ className = 'h-7 w-7' }: { className?: string }) {
  return (
    <svg
      viewBox="0 0 32 32"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      className={className}
      aria-hidden="true"
    >
      <rect
        width="32"
        height="32"
        rx="9"
        className="fill-indigo-600/10 dark:fill-indigo-400/10"
      />
      <path
        d="M8 17C10.5 12.5 13.5 12.5 16 16.5C18.5 20.5 21.5 20.5 24 16"
        className="stroke-indigo-600 dark:stroke-indigo-400"
        strokeWidth="2.5"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}
