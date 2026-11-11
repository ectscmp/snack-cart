export function MicrosoftIcon({ className }: { className?: string }) {
  return (
    <svg
      viewBox="0 0 24 24"
      aria-hidden="true"
      className={className}
      focusable="false"
    >
      <path fill="#f25022" d="M3 3h8.5v8.5H3z" />
      <path fill="#7fba00" d="M12.5 3H21v8.5h-8.5z" />
      <path fill="#00a4ef" d="M3 12.5h8.5V21H3z" />
      <path fill="#ffb900" d="M12.5 12.5H21V21h-8.5z" />
    </svg>
  );
}
