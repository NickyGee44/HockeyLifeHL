export function PlayerHelmetIcon({ className = 'h-5 w-5' }: { className?: string }) {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.8"
      strokeLinecap="round"
      strokeLinejoin="round"
      className={className}
      aria-hidden="true"
    >
      <path d="M4 12a8 8 0 0 1 8-8h4a4 4 0 0 1 4 4v6h-6l-1.75 4H8a4 4 0 0 1-4-4Z" />
      <path d="M14 14h6" />
      <path d="M8.5 10H12" />
      <path d="M16 8.5V12" />
    </svg>
  );
}

export function GoalieHelmetIcon({ className = 'h-5 w-5' }: { className?: string }) {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.8"
      strokeLinecap="round"
      strokeLinejoin="round"
      className={className}
      aria-hidden="true"
    >
      <path d="M12 3c4.5 0 8 2.9 8 6.5V13c0 4.7-3.4 8-8 8s-8-3.3-8-8V9.5C4 5.9 7.5 3 12 3Z" />
      <path d="M9 10h.01" />
      <path d="M15 10h.01" />
      <path d="M8.5 14h7" />
      <path d="M10 14v4" />
      <path d="M14 14v4" />
    </svg>
  );
}
