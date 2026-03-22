import React, { Component, ErrorInfo, ReactNode } from 'react';

interface Props {
  children: ReactNode;
  fallback?: ReactNode;
}

interface State {
  hasError: boolean;
  error?: Error;
}

export default class ErrorBoundary extends Component<Props, State> {
  constructor(props: Props) {
    super(props);
    this.state = { hasError: false };
  }

  static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    console.error('Uncaught error:', error, errorInfo);
  }

  render() {
    if (this.state.hasError) {
      return this.props.fallback || (
        <div style={{ 
          height: '100%', 
          display: 'flex', 
          flexDirection: 'column', 
          alignItems: 'center', 
          justifyContent: 'center',
          padding: '24px',
          textAlign: 'center',
          background: 'var(--bg-deep)',
          color: 'var(--text-primary)'
        }}>
          <div style={{ fontSize: '48px', marginBottom: '16px' }}>⚠️</div>
          <h2 className="text-h2" style={{ marginBottom: '8px' }}>Something went wrong</h2>
          <p className="text-body" style={{ color: 'var(--text-secondary)', marginBottom: '24px', maxWidth: '400px' }}>
            The application encountered an unexpected error. 
            {this.state.error?.message && <code style={{ display: 'block', marginTop: '12px', padding: '8px', background: 'var(--bg-surface)', borderRadius: '4px', fontSize: '12px' }}>{this.state.error.message}</code>}
          </p>
          <button 
            className="btn-primary" 
            onClick={() => window.location.reload()}
          >
            Reload Application
          </button>
        </div>
      );
    }

    return this.props.children;
  }
}
