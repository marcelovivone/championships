"use client";

import React from "react";
import { createPortal } from "react-dom";

export default function Tooltip({ children, label, className }: { children: React.ReactNode; label: string; className?: string }) {
  const [show, setShow] = React.useState(false);
  const [coords, setCoords] = React.useState<{ left: number; top: number } | null>(null);
  const hostRef = React.useRef<HTMLSpanElement | null>(null);

  const handleEnter = () => {
    const el = hostRef.current;
    if (!el) return setShow(true);
    const rect = el.getBoundingClientRect();
    setCoords({ left: rect.left + rect.width / 2, top: rect.top });
    setShow(true);
  };

  const handleLeave = () => {
    setShow(false);
  };

  // update position on scroll/resize while visible
  React.useEffect(() => {
    if (!show || !hostRef.current) return;
    const onMove = () => {
      const el = hostRef.current;
      if (!el) return;
      const rect = el.getBoundingClientRect();
      setCoords({ left: rect.left + rect.width / 2, top: rect.top });
    };
    window.addEventListener('scroll', onMove, true);
    window.addEventListener('resize', onMove);
    return () => {
      window.removeEventListener('scroll', onMove, true);
      window.removeEventListener('resize', onMove);
    };
  }, [show]);

  const baseClasses = 'z-[9999] pointer-events-none whitespace-nowrap text-xs px-2 py-1 rounded shadow';
  const defaultTheme = 'bg-white text-black border border-gray-200';
  const tooltipNode = show && label && coords ? (
    <div
      className={`${baseClasses} ${className ?? defaultTheme}`}
      style={{ position: 'fixed', left: coords.left, top: coords.top, transform: 'translate(-50%, -100%)' }}
    >
      {label}
    </div>
  ) : null;

  return (
    <span ref={hostRef} className="relative inline-block" onMouseEnter={handleEnter} onMouseLeave={handleLeave}>
      {children}
      {typeof window !== 'undefined' && tooltipNode ? createPortal(tooltipNode, document.body) : null}
    </span>
  );
}
