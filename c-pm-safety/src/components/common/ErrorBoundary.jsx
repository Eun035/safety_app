import React from 'react';

class ErrorBoundary extends React.Component {
    constructor(props) {
        super(props);
        this.state = { hasError: false, error: null };
    }

    static getDerivedStateFromError(error) {
        return { hasError: true, error };
    }

    componentDidCatch(error, errorInfo) {
        console.error("[C-Safe] Critical Error Caught:", error, errorInfo);
    }

    render() {
        if (this.state.hasError) {
            return (
                <div className="flex flex-col items-center justify-center min-h-[100dvh] bg-black p-6 text-center font-sans selection:bg-red-500/30">
                    {/* Background Glitch Effect */}
                    <div className="absolute inset-0 z-0 pointer-events-none opacity-10 bg-[linear-gradient(to_right,#80808012_1px,transparent_1px),linear-gradient(to_bottom,#80808012_1px,transparent_1px)] bg-[size:20px_20px]"></div>
                    
                    <div className="relative z-10 w-full max-w-sm bg-cyber-panel/90 border border-red-500/30 rounded-[2.5rem] p-10 shadow-[0_0_50px_rgba(239,68,68,0.15)] backdrop-blur-xl">
                        <div className="w-20 h-20 bg-red-500/10 rounded-full flex items-center justify-center mx-auto mb-6 border border-red-500/50 shadow-[0_0_20px_rgba(239,68,68,0.3)]">
                            <span className="text-4xl">⚠️</span>
                        </div>
                        
                        <h1 className="text-2xl font-black text-white mb-3 tracking-tighter italic uppercase">System Failure</h1>
                        <p className="text-gray-400 mb-8 text-sm leading-relaxed font-medium">
                            시스템 초기화 중 오류가 발생했습니다.<br />
                            네트워크 상태를 확인하고 다시 시도해 주세요.
                        </p>

                        {/* Debug Info (Visible but subtle) */}
                        <div className="bg-black/50 rounded-2xl p-4 mb-8 border border-white/5 text-left">
                            <p className="text-[10px] text-red-400 font-black tracking-widest uppercase mb-2 opacity-60">Error Log</p>
                            <p className="text-[11px] font-mono text-gray-500 break-all leading-tight">
                                {this.state.error?.toString() || "Unknown reference error"}
                            </p>
                        </div>

                        <button
                            onClick={() => window.location.reload()}
                            className="w-full py-4 bg-white text-black rounded-2xl font-black text-lg shadow-xl hover:scale-[1.02] active:scale-95 transition-all"
                        >
                            REBOOT SYSTEM
                        </button>

                        <p className="mt-6 text-[10px] font-bold text-gray-600 tracking-widest uppercase">C-Safe Security Protocol v2.4</p>
                    </div>
                </div>
            );
        }

        return this.props.children;
    }
}

export default ErrorBoundary;
