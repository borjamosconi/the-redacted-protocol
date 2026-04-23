'use client'

import React from 'react'

interface Props {
  children: React.ReactNode
  fallback?: React.ReactNode
}

interface State {
  hasError: boolean
  error?: Error
}

class ErrorBoundaryClass extends React.Component<Props, State> {
  constructor(props: Props) {
    super(props)
    this.state = { hasError: false }
  }

  static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error }
  }

  componentDidCatch(error: Error, errorInfo: React.ErrorInfo) {
    console.error('ErrorBoundary caught error:', error, errorInfo)
  }

  componentDidUpdate() {
    if (this.state.hasError) {
      // Reset after user interaction or timeout
      setTimeout(() => this.setState({ hasError: false }), 5000)
    }
  }

  render() {
    if (this.state.hasError) {
      return this.props.fallback || (
        <div className="min-h-screen flex items-center justify-center p-8">
          <div className="rd-card text-center max-w-md p-8">
            <div className="text-4xl mb-4 text-red-500">⚠️</div>
            <h2 className="text-xl font-bold text-rd-text mb-2">Something broke</h2>
            <p className="text-rd-muted mb-6">Try refreshing or check console for details.</p>
            <button 
              onClick={() => window.location.reload()} 
              className="btn-premium w-full"
            >
              Reload Page
            </button>
            <details className="mt-6 text-left text-xs font-mono text-rd-muted/50 p-3 bg-rd-black/20 rounded">
              <summary>Dev: Show error</summary>
              <pre className="mt-2">{this.state.error?.message}</pre>
            </details>
          </div>
        </div>
      )
    }

    return this.props.children
  }
}

export function ErrorBoundary(props: Props) {
  return <ErrorBoundaryClass {...props} />
}

