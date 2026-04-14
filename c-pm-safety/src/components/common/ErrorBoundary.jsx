import React from 'react';

class ErrorBoundary extends React.Component {
    constructor(props) {
        super(props);
        this.state = { hasError: false };
    }

    static getDerivedStateFromError(error) {
        return { hasError: true };
    }

    componentDidCatch(error, errorInfo) {
        console.error("ErrorBoundary caught an error", error, errorInfo);
    }

    render() {
        if (this.state.hasError) {
            return (
                <div className="flex flex-col items-center justify-center min-h-screen bg-gray-50 p-6 text-center">
                    <div className="bg-white p-8 rounded-2xl shadow-xl max-w-md">
                        <h1 className="text-2xl font-bold text-red-600 mb-4">잠시 문제가 생겼어요</h1>
                        <p className="text-gray-600 mb-6">
                            앱을 실행하는 중에 예상치 못한 오류가 발생했습니다.<br />
                            새로고침을 하거나 잠시 후 다시 시도해 주세요.
                        </p>
                        <button
                            onClick={() => window.location.reload()}
                            className="w-full py-3 bg-blue-600 text-white rounded-xl font-semibold hover:bg-blue-700 transition"
                        >
                            새로고침하기
                        </button>
                    </div>
                </div>
            );
        }

        return this.props.children;
    }
}

export default ErrorBoundary;
