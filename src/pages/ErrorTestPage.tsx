import React from 'react';

const ErrorTestPage = () => {
  const triggerError = () => {
    throw new Error('Test error for Sentry integration!');
  };
  
  const triggerServerError = async () => {
    try {
      const response = await fetch('/api/test-error');
      if (!response.ok) {
        console.error('Server error triggered successfully');
      }
    } catch (error) {
      console.error('Failed to trigger server error:', error);
    }
  };

  return (
    <div className="p-8 space-y-6">
      <div className="max-w-md mx-auto bg-white dark:bg-gray-800 rounded-xl shadow-lg p-6">
        <h1 className="text-2xl font-bold mb-6 text-center text-gray-900 dark:text-white">
          에러 테스트
        </h1>
        
        <div className="space-y-4">
          <button
            onClick={triggerError}
            className="w-full bg-red-500 hover:bg-red-600 text-white py-3 px-4 rounded-lg font-medium transition-colors"
            data-testid="button-trigger-client-error"
          >
            🚨 클라이언트 에러 발생시키기
          </button>
          
          <button
            onClick={triggerServerError}
            className="w-full bg-orange-500 hover:bg-orange-600 text-white py-3 px-4 rounded-lg font-medium transition-colors"
            data-testid="button-trigger-server-error"
          >
            🔧 서버 에러 발생시키기
          </button>
        </div>
        
        <div className="mt-6 p-4 bg-yellow-50 dark:bg-yellow-900/20 rounded-lg">
          <p className="text-sm text-yellow-700 dark:text-yellow-300">
            💡 이 버튼들을 클릭하면 의도적으로 에러가 발생하여 Sentry로 전송되고, 
            사용자에게는 친화적인 오류 화면이 표시됩니다.
          </p>
        </div>
      </div>
    </div>
  );
};

export default ErrorTestPage;