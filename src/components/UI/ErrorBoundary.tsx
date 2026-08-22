import React, { Component, ErrorInfo, ReactNode } from 'react';
import { AlertTriangle, RefreshCw } from 'lucide-react';

interface Props {
  children?: ReactNode;
  fallback?: ReactNode;
  fallbackMessage?: string;
  componentName?: string;
}

interface State {
  hasError: boolean;
  error: Error | null;
}

export class ErrorBoundary extends Component<Props, State> {
  public state: State = {
    hasError: false,
    error: null
  };

  public static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error };
  }

  public componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    const name = this.props.componentName || this.props.fallbackMessage || '';
    console.error(`[ErrorBoundary] Erro capturado${name ? ` em ${name}` : ''}:`, error, errorInfo);
  }

  private handleReset = () => {
    this.setState({ hasError: false, error: null });
  };

  public render() {
    if (this.state.hasError) {
      if (this.props.fallback) {
        return this.props.fallback;
      }

      const title = this.props.fallbackMessage || (this.props.componentName ? `Falha no Módulo (${this.props.componentName})` : 'Falha no Componente');

      return (
        <div style={{
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
          padding: '24px',
          background: 'rgba(15, 23, 42, 0.95)',
          border: '1px solid rgba(239, 68, 68, 0.3)',
          borderRadius: '12px',
          color: '#f87171',
          width: '100%',
          height: '100%',
          minHeight: '200px',
          fontFamily: 'Inter, sans-serif'
        }}>
          <AlertTriangle size={48} strokeWidth={1.5} style={{ opacity: 0.8, marginBottom: '16px' }} />
          <h3 style={{ margin: '0 0 8px 0', fontSize: '18px', fontWeight: 600, color: '#fca5a5' }}>
            {title}
          </h3>
          <p style={{ margin: '0 0 20px 0', fontSize: '13px', opacity: 0.8, textAlign: 'center', maxWidth: '400px' }}>
            {this.state.error?.message || 'Um erro inesperado impediu a renderização desta parte da interface.'}
          </p>
          <button
            onClick={this.handleReset}
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '8px',
              padding: '10px 16px',
              background: '#ef4444',
              color: 'white',
              border: 'none',
              borderRadius: '6px',
              cursor: 'pointer',
              fontWeight: 600,
              transition: 'background 0.2s'
            }}
            onMouseOver={(e) => e.currentTarget.style.background = '#dc2626'}
            onMouseOut={(e) => e.currentTarget.style.background = '#ef4444'}
          >
            <RefreshCw size={16} /> Tentar Novamente
          </button>
        </div>
      );
    }

    return this.props.children;
  }
}
