import React, { useState, useRef, useCallback, useEffect } from 'react';
import { createPortal } from 'react-dom';
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
  const wrapRef = useRef<HTMLDivElement>(null);
  const [coords, setCoords] = useState({ top: 0, left: 0 });

  const show = useCallback(() => {
    if (wrapRef.current) {
      const rect = wrapRef.current.getBoundingClientRect();
      let top = 0, left = 0;
      if (position === 'top') {
        top = rect.top - 8;
        left = rect.left + rect.width / 2;
      } else if (position === 'bottom') {
        top = rect.bottom + 8;
        left = rect.left + rect.width / 2;
      } else if (position === 'left') {
        top = rect.top + rect.height / 2;
        left = rect.left - 8;
      } else if (position === 'right') {
        top = rect.top + rect.height / 2;
        left = rect.right + 8;
      }
      setCoords({ top, left });
    }
    timerRef.current = setTimeout(() => setVisible(true), 300);
  }, [position]);

  const hide = useCallback(() => {
    if (timerRef.current) clearTimeout(timerRef.current);
    setVisible(false);
  }, []);

  useEffect(() => {
    return () => {
      if (timerRef.current) clearTimeout(timerRef.current);
    };
  }, []);

  const getTransform = () => {
    switch (position) {
      case 'top': return 'translate(-50%, -100%)';
      case 'bottom': return 'translateX(-50%)';
      case 'left': return 'translate(-100%, -50%)';
      case 'right': return 'translateY(-50%)';
      default: return 'none';
    }
  };

  return (
    <div className="tt-wrap" ref={wrapRef} onPointerEnter={show} onPointerLeave={hide} onFocus={show} onBlur={hide}>
      {children}
      {visible && createPortal(
        <div 
          className="tt-popup" 
          style={{ 
            position: 'fixed', 
            top: coords.top + 'px', 
            left: coords.left + 'px',
            transform: getTransform(),
            margin: 0,
            zIndex: 999999
          }}
        >
          <span className="tt-label">{label}</span>
          {description && <span className="tt-desc">{description}</span>}
          {shortcut && <kbd className="tt-kbd">{shortcut}</kbd>}
        </div>,
        document.body
      )}
    </div>
  );
};
