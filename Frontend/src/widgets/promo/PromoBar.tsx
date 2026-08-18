import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';

const DEAL_DURATION_SECONDS = 2 * 60 * 60 + 45 * 60 + 12;

function formatTime(totalSeconds: number): string {
  const hours = Math.floor(totalSeconds / 3600);
  const minutes = Math.floor((totalSeconds % 3600) / 60);
  const seconds = totalSeconds % 60;
  return [hours, minutes, seconds].map((value) => String(value).padStart(2, '0')).join(':');
}

export function PromoBar() {
  const [remaining, setRemaining] = useState(DEAL_DURATION_SECONDS);

  useEffect(() => {
    const timer = window.setInterval(() => setRemaining((value) => (value > 0 ? value - 1 : 0)), 1000);
    return () => window.clearInterval(timer);
  }, []);

  return (
    <div className="sticky top-0 z-40 border-b border-white/10 bg-[#171513] text-canvas shadow-lg">
      <div className="container-page flex min-h-9 items-center justify-center gap-3 px-4 py-2 text-[11px] tracking-wide sm:gap-5 sm:text-xs">
        <span className="hidden text-canvas/65 sm:inline">SUMAN PRIVATE EDIT</span>
        <span className="font-medium">Selected pieces up to −35%</span>
        <span className="tabular-nums text-[#e7b17f]">Ends in {formatTime(remaining)}</span>
        <Link to="/?featured=true" className="underline underline-offset-4 transition-colors hover:text-[#e7b17f]">
          Shop now
        </Link>
      </div>
    </div>
  );
}
