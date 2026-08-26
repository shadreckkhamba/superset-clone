import React, { useEffect, useMemo, useRef, useState } from 'react';

interface LastUpdatedBadgeProps {
  label?: string;
  value?: string;
  synced?: boolean;
  isDarkMode?: boolean;
  lastUpdatedTime?: string | null;
}

export default function LastUpdatedBadge({
  value,
  synced,
  isDarkMode = false,
  lastUpdatedTime = null,
}: LastUpdatedBadgeProps) {
  const [now, setNow] = useState(Date.now());
  const syncingStartedAtRef = useRef(Date.now());

  useEffect(() => {
    const intervalId = window.setInterval(() => {
      setNow(Date.now());
    }, 1000);
    return () => window.clearInterval(intervalId);
  }, []);

  const parsedTimestamp = useMemo(() => {
    if (!lastUpdatedTime) return null;
    const parsed = new Date(lastUpdatedTime);
    return Number.isNaN(parsed.getTime()) ? null : parsed;
  }, [lastUpdatedTime]);

  useEffect(() => {
    if (parsedTimestamp) {
      syncingStartedAtRef.current = Date.now();
    }
  }, [parsedTimestamp]);

  const effectiveSynced = typeof synced === 'boolean' ? synced : Boolean(parsedTimestamp);

  const displayValue =
    value ||
    (effectiveSynced && parsedTimestamp
      ? (() => {
          const diffMs = Math.max(0, now - parsedTimestamp.getTime());
          const totalMinutes = Math.floor(diffMs / 60000);

          if (totalMinutes < 1) return 'Updated just now';
          if (totalMinutes < 60) return `Updated ${totalMinutes} minutes ago`;

          const totalHours = Math.floor(totalMinutes / 60);
          if (totalHours < 24) return `Updated ${totalHours} hour${totalHours === 1 ? '' : 's'} ago`;

          const totalDays = Math.floor(totalHours / 24);
          return `Updated ${totalDays} day${totalDays === 1 ? '' : 's'} ago`;
        })()
      : (() => {
          const elapsedMs = Math.max(0, now - syncingStartedAtRef.current);
          const minutes = Math.floor(elapsedMs / 60000);
          const seconds = Math.floor((elapsedMs % 60000) / 1000);
          return `Syncing ${String(minutes).padStart(2, '0')}:${String(seconds).padStart(2, '0')}`;
        })());

  return (
    <div
      style={{
        display: 'flex',
        alignItems: 'center',
        gap: '8px',
        padding: '6px 10px',
        borderRadius: '10px',
        background: isDarkMode ? '#1a1a1a' : '#f8fafc',
        border: isDarkMode ? '1px solid #404040' : '1px solid #d9e2ec',
        boxShadow: isDarkMode ? '0 2px 8px rgba(0,0,0,0.25)' : 'none',
        transition: 'background-color 0.3s ease, border-color 0.3s ease, box-shadow 0.3s ease',
      }}
    >
      <span
        style={{
          fontSize: '20px',
          color: effectiveSynced ? '#1890ff' : '#8c8c8c',
          lineHeight: 1,
        }}
      >
        &#x21bb;
      </span>
      <div style={{ display: 'flex', alignItems: 'baseline', gap: '4px', lineHeight: 1.1 }}>
        <span style={{ fontSize: '14px', fontWeight: 700, color: isDarkMode ? '#e0e0e0' : '#1f2a44' }}>{displayValue}</span>
      </div>
    </div>
  );
}