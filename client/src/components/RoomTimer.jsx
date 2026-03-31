import React, { useState, useEffect } from 'react';

export default function RoomTimer({ expiresAt }) {
  const [remaining, setRemaining] = useState('');
  const [status, setStatus] = useState('safe');

  useEffect(() => {
    const tick = () => {
      const now = Date.now();
      const diff = expiresAt - now;

      if (diff <= 0) {
        setRemaining('00:00');
        setStatus('danger');
        return;
      }

      const totalSec = Math.floor(diff / 1000);
      const hrs = Math.floor(totalSec / 3600);
      const mins = Math.floor((totalSec % 3600) / 60);
      const secs = totalSec % 60;

      const pad = (n) => String(n).padStart(2, '0');
      if (hrs > 0) {
        setRemaining(`${pad(hrs)}:${pad(mins)}:${pad(secs)}`);
      } else {
        setRemaining(`${pad(mins)}:${pad(secs)}`);
      }

      if (totalSec <= 60) setStatus('danger');
      else if (totalSec <= 300) setStatus('warning');
      else setStatus('safe');
    };

    tick();
    const interval = setInterval(tick, 1000);
    return () => clearInterval(interval);
  }, [expiresAt]);

  return (
    <div className={`room-timer ${status}`}>
      <span className="timer-icon">⏱</span>
      <span>{remaining}</span>
    </div>
  );
}
