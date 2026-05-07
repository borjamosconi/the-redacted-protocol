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
      const timer = setTimeout(() => {
        this.setState({ hasError: false, error: undefined })
      }, 8000)
      return () => clearTimeout(timer)
    }
  }

  handleReset = () => {
    this.setState({ hasError: false, error: undefined })
  }

  render() {
    if (this.state.hasError) {
      return this.props.fallback || (
        <div className="min-h-screen flex items-center justify-center p-8 bg-black">
          <div className="rd-card text-center max-w-md p-8">
            <div className="text-4xl mb-4 text-red-500">⚠️</div>
            <h2 className="text-xl font-bold text-white mb-2">Protocol Error</h2>
            <p className="text-gray-400 mb-6 text-sm">
              {this.state.error?.message || 'An unexpected error occurred. Check console for details.'}
            </p>
            <div className="flex gap-3">
              <button 
                onClick={this.handleReset} 
                className="flex-1 px-4 py-2 bg-gray-800 hover:bg-gray-700 text-white rounded text-sm font-mono"
              >
                Retry
              </button>
              <button 
                onClick={() => window.location.reload()} 
                className="flex-1 px-4 py-2 bg-red-950/50 hover:bg-red-950 text-red-400 rounded text-sm font-mono"
              >
                Reload
              </button>
            </div>
            <details className="mt-6 text-left text-xs font-mono text-gray-500 p-3 bg-black/50 rounded border border-gray-800">
              <summary className="cursor-pointer hover:text-gray-400">Dev: Show error details</summary>
              <pre className="mt-2 overflow-auto max-h-40 text-gray-600">{this.state.error?.stack || this.state.error?.toString()}</pre>
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

