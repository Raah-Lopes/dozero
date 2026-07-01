import React, { ReactNode } from 'react';

interface GlassAccordionProps {
  title: ReactNode;
  defaultOpen?: boolean;
  children: ReactNode;
  style?: React.CSSProperties;
}

export const GlassAccordion: React.FC<GlassAccordionProps> = ({ title, defaultOpen = true, children, style }) => {
  return (
    <details className="glass-accordion" open={defaultOpen} style={{ ...style, marginBottom: '16px' }}>
      <summary style={{ outline: 'none' }}>
        <div style={{ fontSize: '0.68rem', color: '#64748b', textTransform: 'uppercase', letterSpacing: '0.05em', fontFamily: 'var(--font-display)', display: 'flex', alignItems: 'center', gap: '6px' }}>
          {title}
        </div>
      </summary>
      <div className="accordion-content">
        {children}
      </div>
    </details>
  );
};
