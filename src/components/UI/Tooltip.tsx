import React, { useState, useRef, useCallback } from 'react';
import './Tooltip.css';

interface TooltipProps {
  label: string;
  description?: string;
  shortcut?: string;
  children: React.ReactElement;
  position?: 'top' | 'bottom' | 'left' | 'right';
}

export const Tooltip: React.FC<TooltipProps> = ({ label, description, shortcut, children, position = 'top' }) => {
  const [visible, setVisible] = useState(false);
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const show = useCallback(() => {
    timerRef.current = setTimeout(() => setVisible(true), 300);
  }, []);

  const hide = useCallback(() => {
    if (timerRef.current) clearTimeout(timerRef.current);
    setVisible(false);
  }, []);

  return (
    <div className="tt-wrap" onPointerEnter={show} onPointerLeave={hide}>
      {children}
      {visible && (
        <div className={`tt-popup tt-${position}`}>
          <span className="tt-label">{label}</span>
          {description && <span className="tt-desc">{description}</span>}
          {shortcut && <kbd className="tt-kbd">{shortcut}</kbd>}
        </div>
      )}
    </div>
  );
};
