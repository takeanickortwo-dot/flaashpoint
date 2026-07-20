import React from 'react';
import { useGlobalSync } from '../hooks/useGlobalSync'; // adjust path if needed

export default function Layout({ children }: { children: React.ReactNode }) {
  const sync = useGlobalSync(60000); // 1 minute interval

  // Compute seconds and progress (0‑1)
  const seconds = Math.ceil(sync.countdownMs / 1000);
  const totalMs = 60000; // same as interval
  const progress = sync.isSynced
    ? (totalMs - sync.countdownMs) / totalMs
    : 0;

  return (
    <div className="app-container">
      <nav className="navbar">
        {/* ... your existing nav items ... */}

        {/* The countdown ring – replace your old one with this */}
        <div className="sync-indicator">
          <div className="ring-container">
            <svg width="40" height="40" viewBox="0 0 40 40">
              <circle
                cx="20"
                cy="20"
                r="16"
                fill="none"
                stroke="#e6e6e6"
                strokeWidth="4"
              />
              <circle
                cx="20"
                cy="20"
                r="16"
                fill="none"
                stroke={sync.isSynced ? '#22c55e' : '#f59e0b'}
                strokeWidth="4"
                strokeDasharray={`${2 * Math.PI * 16}`}
                strokeDashoffset={`${2 * Math.PI * 16 * (1 - progress)}`}
                transform="rotate(-90 20 20)"
                style={{ transition: 'stroke-dashoffset 0.1s' }}
              />
            </svg>
            <span className="ring-label">{seconds}s</span>
          </div>
          <span className="sync-status">
            {sync.isSynced ? '🌐' : '⏳'} {sync.isSynced ? 'Global' : 'Local'}
          </span>
        </div>
      </nav>

      <main>{children}</main>
    </div>
  );
}