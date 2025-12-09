import { useEffect, useState } from 'react';
import { ExternalLink, Copy, CheckCircle } from 'lucide-react';
import { Button } from '@/components/ui/button';

type BrowserType = 'kakaotalk' | 'naver' | 'line' | 'instagram' | 'facebook' | 'samsung' | 'other' | null;

function detectInAppBrowser(): BrowserType {
  const ua = navigator.userAgent.toLowerCase();
  
  if (ua.includes('kakaotalk')) return 'kakaotalk';
  if (ua.includes('naver')) return 'naver';
  if (ua.includes('line')) return 'line';
  if (ua.includes('instagram')) return 'instagram';
  if (ua.includes('fban') || ua.includes('fbav') || ua.includes('fb_iab')) return 'facebook';
  
  // 삼성 인터넷 브라우저는 실제 브라우저이므로 제외
  // 하지만 삼성 앱 내 웹뷰는 감지
  if (ua.includes('samsungbrowser')) return null; // 삼성 브라우저는 OK
  
  // 기타 인앱 브라우저 감지
  if (ua.includes('wv') || // Android WebView
      ua.includes('webview') ||
      (ua.includes('android') && !ua.includes('chrome') && !ua.includes('firefox'))) {
    return 'other';
  }
  
  return null;
}

function isIOS(): boolean {
  return /iPad|iPhone|iPod/.test(navigator.userAgent);
}

function isAndroid(): boolean {
  return /Android/.test(navigator.userAgent);
}

function getBrowserName(type: BrowserType): string {
  switch (type) {
    case 'kakaotalk': return '카카오톡';
    case 'naver': return '네이버';
    case 'line': return '라인';
    case 'instagram': return '인스타그램';
    case 'facebook': return '페이스북';
    case 'samsung': return '삼성';
    default: return '앱';
  }
}

export default function InAppBrowserRedirect() {
  const [inAppBrowser, setInAppBrowser] = useState<BrowserType>(null);
  const [dismissed, setDismissed] = useState(false);
  const [copied, setCopied] = useState(false);
  
  useEffect(() => {
    // 이미 무시했으면 다시 표시하지 않음
    const wasDismissed = sessionStorage.getItem('inapp-browser-dismissed');
    if (wasDismissed) {
      setDismissed(true);
      return;
    }
    
    const browser = detectInAppBrowser();
    setInAppBrowser(browser);
  }, []);
  
  const handleOpenExternal = () => {
    const currentUrl = window.location.href;
    
    if (isAndroid()) {
      // Android: Intent URL 사용하여 Chrome으로 열기
      const intentUrl = `intent://${currentUrl.replace(/^https?:\/\//, '')}#Intent;scheme=https;package=com.android.chrome;end`;
      window.location.href = intentUrl;
      
      // 대체: 일반 브라우저 열기 시도
      setTimeout(() => {
        window.open(currentUrl, '_system');
      }, 500);
    } else if (isIOS()) {
      // iOS: Safari로 열기 시도 (제한적)
      // 대부분의 인앱 브라우저는 이 방법이 작동하지 않아 URL 복사 안내
      window.open(currentUrl, '_blank');
    }
  };
  
  const handleCopyUrl = async () => {
    try {
      await navigator.clipboard.writeText(window.location.href);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch (err) {
      // 클립보드 권한이 없을 경우 대체 방법
      const textArea = document.createElement('textarea');
      textArea.value = window.location.href;
      document.body.appendChild(textArea);
      textArea.select();
      document.execCommand('copy');
      document.body.removeChild(textArea);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  };
  
  const handleDismiss = () => {
    sessionStorage.setItem('inapp-browser-dismissed', 'true');
    setDismissed(true);
  };
  
  if (!inAppBrowser || dismissed) {
    return null;
  }
  
  const browserName = getBrowserName(inAppBrowser);
  const targetBrowser = isIOS() ? 'Safari' : 'Chrome';
  
  return (
    <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-[9999] flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl shadow-2xl max-w-sm w-full overflow-hidden animate-in fade-in zoom-in duration-300">
        {/* Header */}
        <div className="bg-gradient-to-r from-blue-500 to-purple-600 p-6 text-white text-center">
          <div className="w-16 h-16 bg-white/20 rounded-full flex items-center justify-center mx-auto mb-4">
            <ExternalLink className="w-8 h-8" />
          </div>
          <h2 className="text-xl font-bold mb-2">
            외부 브라우저에서 열기
          </h2>
          <p className="text-sm text-white/90">
            더 나은 경험을 위해 {targetBrowser}에서 열어주세요
          </p>
        </div>
        
        {/* Content */}
        <div className="p-6 space-y-4">
          <p className="text-gray-600 text-sm text-center">
            현재 <strong>{browserName}</strong> 앱 내 브라우저에서 접속 중입니다.
            <br />
            앱 설치 및 모든 기능을 사용하려면 {targetBrowser}에서 열어주세요.
          </p>
          
          {/* Action Buttons */}
          <div className="space-y-3">
            {isAndroid() && (
              <Button 
                onClick={handleOpenExternal}
                className="w-full bg-blue-600 hover:bg-blue-700"
                data-testid="button-open-chrome"
              >
                <ExternalLink className="w-4 h-4 mr-2" />
                Chrome에서 열기
              </Button>
            )}
            
            <Button 
              onClick={handleCopyUrl}
              variant="outline"
              className="w-full"
              data-testid="button-copy-url"
            >
              {copied ? (
                <>
                  <CheckCircle className="w-4 h-4 mr-2 text-green-500" />
                  복사됨!
                </>
              ) : (
                <>
                  <Copy className="w-4 h-4 mr-2" />
                  URL 복사하기
                </>
              )}
            </Button>
          </div>
          
          {/* iOS Instructions */}
          {isIOS() && (
            <div className="bg-gray-50 rounded-lg p-4 text-sm text-gray-600">
              <p className="font-medium mb-2">Safari에서 여는 방법:</p>
              <ol className="list-decimal list-inside space-y-1 text-xs">
                <li>위의 "URL 복사하기" 버튼 탭</li>
                <li>Safari 앱 열기</li>
                <li>주소창에 붙여넣기</li>
              </ol>
            </div>
          )}
          
          {/* Dismiss Button */}
          <button
            onClick={handleDismiss}
            className="w-full text-center text-sm text-gray-400 hover:text-gray-600 py-2"
            data-testid="button-dismiss-inapp-warning"
          >
            이대로 계속하기
          </button>
        </div>
      </div>
    </div>
  );
}
