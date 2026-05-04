"use client";

import React from "react";
import { AlertTriangle, RefreshCw } from "lucide-react";

interface Props {
  children: React.ReactNode;
  fallback?: React.ReactNode;
}

interface State {
  hasError: boolean;
}

export class ErrorBoundary extends React.Component<Props, State> {
  state: State = { hasError: false };

  static getDerivedStateFromError(): State {
    return { hasError: true };
  }

  render() {
    if (this.state.hasError) {
      return (
        this.props.fallback ?? (
          <div className="card p-8 text-center space-y-3">
            <div className="w-10 h-10 rounded-full bg-amber-500/10 flex items-center justify-center mx-auto">
              <AlertTriangle className="w-5 h-5 text-amber-400" />
            </div>
            <p className="text-sm font-medium text-white">Something went wrong</p>
            <p className="text-xs text-zinc-500">This section failed to load.</p>
            <button
              onClick={() => this.setState({ hasError: false })}
              className="flex items-center gap-1.5 text-xs text-brand-400 hover:text-brand-300 transition-colors mx-auto"
            >
              <RefreshCw className="w-3 h-3" />
              Try again
            </button>
          </div>
        )
      );
    }
    return this.props.children;
  }
}
