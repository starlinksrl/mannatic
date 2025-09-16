import React from 'react';

export const Logo = ({ className }: { className?: string }) => (
  <div className={`flex items-center gap-2 text-primary ${className}`}>
    <svg
      xmlns="http://www.w3.org/2000/svg"
      width="24"
      height="24"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      className="h-6 w-6"
    >
      <path d="M12 2v4" />
      <path d="m16.2 7.8 2.9-1.7" />
      <path d="M20 12h4" />
      <path d="m16.2 16.2 2.9 1.7" />
      <path d="M12 20v4" />
      <path d="m7.8 16.2-2.9 1.7" />
      <path d="M4 12H0" />
      <path d="m7.8 7.8-2.9-1.7" />
      <circle cx="12" cy="12" r="4" />
    </svg>
    <span className="font-headline text-lg font-bold text-foreground">SchedulaPro</span>
  </div>
);
