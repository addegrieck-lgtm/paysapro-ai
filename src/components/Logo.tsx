export function LogoMark({ className = 'h-9 w-9' }: { className?: string }) {
  return (
    <svg viewBox="0 0 48 48" className={className} aria-hidden>
      <rect width="48" height="48" rx="12" fill="#1f5c44" />
      <path d="M14 34c0-11 8-19 21-20-1 13-9 21-20 21" fill="#8fcf9f" />
      <path d="M14 34 27 21" stroke="#1f5c44" strokeWidth="2.2" strokeLinecap="round" />
    </svg>
  );
}

export function Logo() {
  return (
    <div className="flex items-center gap-2.5">
      <LogoMark />
      <div className="leading-tight">
        <div className="text-lg font-bold tracking-tight text-ink">Paysapro</div>
        <div className="text-xs font-medium text-muted">Devis & chantiers</div>
      </div>
    </div>
  );
}
