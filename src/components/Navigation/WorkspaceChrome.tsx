import React, { type ReactNode } from 'react';
import './WorkspaceChrome.css';

interface WorkspaceChromeProps {
  title: string;
  subtitle: string;
  icon: ReactNode;
  navigation?: ReactNode;
  search?: ReactNode;
  actions?: ReactNode;
  children?: ReactNode;
  className?: string;
}

export function WorkspaceChrome({
  title,
  subtitle,
  icon,
  navigation,
  search,
  actions,
  children,
  className = '',
}: WorkspaceChromeProps) {
  return (
    <header className={`workspace-chrome ${className}`.trim()}>
      <div className="workspace-chrome__identity">
        <span className="workspace-chrome__sigil" aria-hidden="true">{icon}</span>
        <span className="workspace-chrome__copy">
          <strong>{title}</strong>
          <small>{subtitle}</small>
        </span>
      </div>
      {children && <div className="workspace-chrome__body">{children}</div>}
      {navigation && <div className="workspace-chrome__navigation">{navigation}</div>}
      {search && <div className="workspace-chrome__search">{search}</div>}
      {actions && <div className="workspace-chrome__actions">{actions}</div>}
    </header>
  );
}
