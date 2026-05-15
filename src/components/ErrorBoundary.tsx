import React, { Component, ErrorInfo, ReactNode } from "react";
import { AlertCircle, RotateCcw, Home } from "lucide-react";
import { Button } from "./ui/button";

interface Props {
  children: ReactNode;
}

interface State {
  hasError: boolean;
  error: Error | null;
}

class ErrorBoundary extends Component<Props, State> {
  public state: State = {
    hasError: false,
    error: null
  };

  public static getDerivedStateFromError(error: Error): State {
    // Update state so the next render will show the fallback UI.
    return { hasError: true, error };
  }

  public componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    console.error("Uncaught error:", error, errorInfo);
  }

  private handleReset = () => {
    this.setState({ hasError: false, error: null });
    window.location.reload();
  };

  private handleGoHome = () => {
    this.setState({ hasError: false, error: null });
    window.location.href = "/";
  };

  public render() {
    if (this.state.hasError) {
      return (
        <div className="min-h-screen bg-slate-50 flex items-center justify-center p-4">
          <div className="max-w-md w-full bg-white rounded-3xl shadow-2xl border border-orange-100 overflow-hidden">
            <div className="bg-orange-600 p-8 flex justify-center">
              <div className="w-20 h-20 bg-white/20 rounded-full flex items-center justify-center animate-pulse">
                <AlertCircle className="w-10 h-10 text-white" />
              </div>
            </div>
            
            <div className="p-8 text-center">
              <h1 className="text-2xl font-black text-slate-900 uppercase tracking-tight mb-2">
                System Encountered an Error
              </h1>
              <p className="text-slate-500 text-sm mb-8 leading-relaxed">
                Something went wrong while processing the application data. Our team has been notified.
              </p>
              
              {process.env.NODE_ENV === 'development' && this.state.error && (
                <div className="mb-8 p-4 bg-slate-900 rounded-xl text-left overflow-hidden">
                  <p className="text-rose-400 font-mono text-[10px] uppercase font-bold mb-2">Error Details:</p>
                  <pre className="text-slate-300 font-mono text-[11px] overflow-x-auto whitespace-pre-wrap max-h-40">
                    {this.state.error.toString()}
                  </pre>
                </div>
              )}

              <div className="flex flex-col gap-3">
                <Button 
                  onClick={this.handleReset}
                  className="w-full h-12 bg-orange-600 hover:bg-black text-white font-black uppercase tracking-widest rounded-xl transition-all shadow-lg shadow-orange-200"
                >
                  <RotateCcw className="w-4 h-4 mr-2" /> Try Again
                </Button>
                
                <Button 
                  onClick={this.handleGoHome}
                  variant="outline"
                  className="w-full h-12 border-2 border-slate-200 hover:bg-slate-50 text-slate-600 font-black uppercase tracking-widest rounded-xl transition-all"
                >
                  <Home className="w-4 h-4 mr-2" /> Back to Dashboard
                </Button>
              </div>
            </div>
            
            <div className="px-8 py-4 bg-slate-50 border-t border-slate-100 text-center">
              <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">
                VisionPulse Clinical Suite • v1.0
              </p>
            </div>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}

export default ErrorBoundary;
