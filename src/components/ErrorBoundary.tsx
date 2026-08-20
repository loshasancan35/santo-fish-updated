import { Component, ReactNode } from 'react';

interface Props {
  children: ReactNode;
}

interface State {
  hasError: boolean;
  message: string;
}

export class ErrorBoundary extends Component<Props, State> {
  state: State = { hasError: false, message: '' };

  static getDerivedStateFromError(error: unknown): State {
    return {
      hasError: true,
      message: error instanceof Error ? error.message : 'Bilinmeyen bir hata oluştu',
    };
  }

  render() {
    if (this.state.hasError) {
      return (
        <div className="ocean-bg flex h-[100dvh] flex-col items-center justify-center gap-4 px-8 text-center">
          <div className="glass-card rounded-2xl p-6">
            <p className="text-sm font-semibold text-white">Bir şeyler ters gitti</p>
            <p className="mt-2 text-xs text-slate-300">{this.state.message}</p>
          </div>
        </div>
      );
    }
    return this.props.children;
  }
}
