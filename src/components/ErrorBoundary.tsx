import React, { Component, ErrorInfo, ReactNode } from 'react';
import { AlertTriangle } from 'lucide-react';

interface Props {
  children: ReactNode;
  fallbackMessage?: string;
}

interface State {
  hasError: boolean;
  error?: Error;
}

export class ErrorBoundary extends Component<Props, State> {
  public state: State = {
    hasError: false
  };

  public static getDerivedStateFromError(error: Error): State {
    // Update state so the next render will show the fallback UI.
    return { hasError: true, error };
  }

  public componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    console.error("Uncaught error in widget:", error, errorInfo);
  }

  public render() {
    if (this.state.hasError) {
      return (
        <div style={{
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
          padding: '1rem',
          background: 'rgba(239, 68, 68, 0.1)',
          border: '1px solid rgba(239, 68, 68, 0.3)',
          borderRadius: '8px',
          color: '#fca5a5',
          fontFamily: 'var(--font-mono, monospace)',
          fontSize: '0.8rem',
          textAlign: 'center',
          height: '100%',
          width: '100%'
        }}>
          <AlertTriangle size={24} style={{ marginBottom: '8px' }} color="#ef4444" />
          <h4 style={{ margin: '0 0 4px 0', color: '#ef4444' }}>Widget Crashed</h4>
          <span style={{ fontSize: '0.7rem', opacity: 0.8 }}>
            {this.props.fallbackMessage || this.state.error?.message || "Ocorreu um erro interno neste módulo."}
          </span>
          <button 
            onClick={() => this.setState({ hasError: false, error: undefined })}
            style={{ 
              marginTop: '10px', 
              background: 'transparent', 
              border: '1px solid #ef4444', 
              color: '#ef4444', 
              padding: '2px 8px', 
              borderRadius: '4px',
              cursor: 'pointer' 
            }}
          >
            Tentar Novamente
          </button>
        </div>
      );
    }

    return this.props.children;
  }
}
