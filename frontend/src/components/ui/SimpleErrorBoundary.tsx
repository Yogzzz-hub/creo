import { Component, ErrorInfo, ReactNode } from "react";
import { recoverStaleChunk } from "@/lib/chunk-recovery";
import { RefreshCw, AlertTriangle } from "lucide-react";

interface Props {
  children?: ReactNode;
  name: string;
}

interface State {
  hasError: boolean;
  error: Error | null;
}

export class SimpleErrorBoundary extends Component<Props, State> {
  public override state: State = {
    hasError: false,
    error: null,
  };

  public static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error };
  }

  public override componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    console.error("SimpleErrorBoundary caught error:", error, errorInfo);
    recoverStaleChunk(error);
  }

  public override render() {
    if (this.state.hasError) {
      const isChunkError = /dynamically imported module|module script|Loading chunk|Failed to fetch/i.test(
        this.state.error?.message || ""
      );

      return (
        <div className="p-6 sm:p-8 m-4 sm:m-6 bg-app-surface border border-amber-500/40 rounded-2xl text-hi shadow-xl max-w-2xl mx-auto space-y-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-amber-500/20 text-amber-400 flex items-center justify-center shrink-0">
              <AlertTriangle className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-base font-bold text-hi">Temporary load issue in {this.props.name}</h2>
              <p className="text-xs text-app-mist">
                {isChunkError
                  ? "A module update was received while loading this view."
                  : "An unexpected error occurred while rendering this section."}
              </p>
            </div>
          </div>

          <div className="p-3 bg-app-base rounded-xl border border-app-line text-xs font-mono text-amber-300 overflow-x-auto">
            {this.state.error?.message || "Unknown error"}
          </div>

          <div className="flex items-center gap-3 pt-2">
            <button
              type="button"
              onClick={() => {
                this.setState({ hasError: false, error: null });
                window.location.reload();
              }}
              className="px-4 py-2.5 rounded-xl bg-app-accent hover:bg-blue-600 text-app-on-accent! font-bold text-xs flex items-center gap-2 cursor-pointer shadow-md transition-all active:scale-95"
            >
              <RefreshCw className="w-3.5 h-3.5" />
              <span>Reload Section</span>
            </button>
            <button
              type="button"
              onClick={() => this.setState({ hasError: false, error: null })}
              className="px-4 py-2.5 rounded-xl bg-app-base hover:bg-app-line border border-app-line text-app-mist hover:text-hi font-bold text-xs cursor-pointer transition-all"
            >
              <span>Dismiss</span>
            </button>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}

