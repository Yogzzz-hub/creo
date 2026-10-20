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
        <div className="p-6 sm:p-8 m-4 sm:m-6 bg-[#161F2D] border border-amber-500/40 rounded-2xl text-white shadow-xl max-w-2xl mx-auto space-y-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-amber-500/20 text-amber-400 flex items-center justify-center shrink-0">
              <AlertTriangle className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-base font-bold text-white">Temporary load issue in {this.props.name}</h2>
              <p className="text-xs text-[#97A0B3]">
                {isChunkError
                  ? "A module update was received while loading this view."
                  : "An unexpected error occurred while rendering this section."}
              </p>
            </div>
          </div>

          <div className="p-3 bg-[#0B111C] rounded-xl border border-[#2A3446] text-xs font-mono text-amber-300 overflow-x-auto">
            {this.state.error?.message || "Unknown error"}
          </div>

          <div className="flex items-center gap-3 pt-2">
            <button
              type="button"
              onClick={() => {
                this.setState({ hasError: false, error: null });
                window.location.reload();
              }}
              className="px-4 py-2.5 rounded-xl bg-[#7FA0D6] hover:bg-blue-600 text-white font-bold text-xs flex items-center gap-2 cursor-pointer shadow-md transition-all active:scale-95"
            >
              <RefreshCw className="w-3.5 h-3.5" />
              <span>Reload Section</span>
            </button>
            <button
              type="button"
              onClick={() => this.setState({ hasError: false, error: null })}
              className="px-4 py-2.5 rounded-xl bg-[#0B111C] hover:bg-[#2A3446] border border-[#2A3446] text-[#97A0B3] hover:text-white font-bold text-xs cursor-pointer transition-all"
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

