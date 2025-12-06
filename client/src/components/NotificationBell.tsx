import { useState, useEffect } from 'react';
import {
  Bell,
  MapPin,
  MessageCircle,
  Heart,
  UserPlus,
  HelpCircle,
  Gift,
} from 'lucide-react';
import { useLocation } from 'wouter';
import { useTranslation } from 'react-i18next';
import { useNotifications, type Notification } from '@/hooks/useNotifications';

export default function NotificationBell() {
  const { t } = useTranslation('ui');
  const {
    notifications,
    counts,
    hasNewNotifications,
    markAsRead,
    markAllAsRead,
    clearNotifications,
  } = useNotifications();
  const [isOpen, setIsOpen] = useState(false);
  const [isAnimating, setIsAnimating] = useState(false);
  const [, setLocation] = useLocation();

  // 새 알림이 올 때 애니메이션 효과
  useEffect(() => {
    if (hasNewNotifications) {
      setIsAnimating(true);
      const timer = setTimeout(() => setIsAnimating(false), 2000);
      return () => clearTimeout(timer);
    }
  }, [hasNewNotifications]);

  // 알림 클릭 핸들러
  const handleNotificationClick = (notification: Notification) => {
    // 알림을 읽음 상태로 표시
    markAsRead(notification.id);
    
    // 알림 패널 닫기
    setIsOpen(false);
    
    // 알림 타입에 따른 네비게이션
    switch (notification.type) {
      case 'feed':
        // 피드 관련 알림 - 피드 페이지로 이동
        if (notification.relatedPostId) {
          setLocation(`/feed?postId=${notification.relatedPostId}`);
        } else {
          setLocation('/feed');
        }
        break;
        
      case 'chat':
        // 채팅 알림 - 채팅 페이지로 이동
        if (notification.relatedConversationId) {
          setLocation(`/chat?conversationId=${notification.relatedConversationId}`);
        } else {
          setLocation('/chat');
        }
        break;
        
      case 'follow':
        // 팔로우 알림 - 프로필 페이지로 이동
        if (notification.relatedUserId) {
          setLocation(`/profile?userId=${notification.relatedUserId}`);
        } else {
          setLocation('/profile');
        }
        break;
        
      case 'reaction':
        // 반응 알림 - 해당 포스트로 이동
        if (notification.relatedPostId) {
          setLocation(`/feed?postId=${notification.relatedPostId}`);
        } else {
          setLocation('/feed');
        }
        break;
        
      case 'help':
        // 도움 요청 알림 - 맵 페이지로 이동 (위치 기반)
        if (notification.location) {
          setLocation(`/map?location=${encodeURIComponent(notification.location)}`);
        } else {
          setLocation('/map');
        }
        break;
        
      case 'promotion':
        // 프로모션 알림 - 해당 포스트나 피드로 이동
        if (notification.relatedPostId) {
          setLocation(`/feed?postId=${notification.relatedPostId}`);
        } else {
          setLocation('/feed');
        }
        break;

      case 'comment':
        // 댓글 알림 - 해당 포스트로 이동
        if (notification.relatedPostId) {
          setLocation(`/feed?postId=${notification.relatedPostId}`);
        } else {
          setLocation('/feed');
        }
        break;

      case 'timeline_followed':
        // 타임라인 팔로우 알림 - 타임라인 페이지로 이동
        setLocation('/timeline');
        break;
        
      default:
        // 기본값 - 피드로 이동
        setLocation('/feed');
        break;
    }
  };

  const getNotificationIcon = (type: Notification['type']) => {
    switch (type) {
      case 'feed':
        return <MapPin size={16} className="text-blue-500" />;
      case 'help':
        return <HelpCircle size={16} className="text-red-500" />;
      case 'chat':
        return <MessageCircle size={16} className="text-green-500" />;
      case 'follow':
        return <UserPlus size={16} className="text-purple-500" />;
      case 'reaction':
        return <Heart size={16} className="text-pink-500" />;
      case 'promotion':
        return <Gift size={16} className="text-orange-500" />;
      case 'comment':
        return <MessageCircle size={16} className="text-blue-400" />;
      case 'timeline_followed':
        return <span className="text-base">🗺️</span>;
      default:
        return <Bell size={16} className="text-gray-500" />;
    }
  };

  const getTypeLabel = (type: Notification['type']) => {
    switch (type) {
      case 'feed':
        return t('notification.feed');
      case 'help':
        return t('notification.help');
      case 'chat':
        return t('notification.chat');
      case 'follow':
        return t('notification.follow');
      case 'reaction':
        return t('notification.reaction');
      case 'promotion':
        return t('notification.promotion');
      case 'comment':
        return t('notification.comment');
      case 'timeline_followed':
        return t('notification.timeline_followed');
      default:
        return t('notification.title');
    }
  };

  const formatTimeAgo = (timestamp: Date) => {
    const now = new Date();
    const diff = now.getTime() - timestamp.getTime();
    const minutes = Math.floor(diff / 60000);

    if (minutes < 1) return t('timeago.justNow');
    if (minutes < 60) return t('timeago.minutesAgo', { count: minutes });
    const hours = Math.floor(minutes / 60);
    if (hours < 24) return t('timeago.hoursAgo', { count: hours });
    return t('timeago.daysAgo', { count: Math.floor(hours / 24) });
  };

  return (
    <div className="relative">
      {/* 알림 벨 아이콘 */}
      <button
        onClick={() => setIsOpen(!isOpen)}
        className={`
          relative p-2 rounded-full transition-all duration-200
          ${isAnimating ? 'animate-bounce bg-red-100' : 'hover:bg-gray-100'}
          ${hasNewNotifications ? 'text-red-500' : 'text-gray-600'}
        `}
        style={{
          animation: isAnimating
            ? 'pulse 0.5s ease-in-out infinite alternate'
            : undefined,
        }}
      >
        <Bell size={20} />

        {/* 알림 카운트 배지 */}
        {counts.total > 0 && (
          <span
            className={`
              absolute -top-1 -right-1 min-w-[18px] h-[18px] 
              text-xs font-bold text-white rounded-full 
              flex items-center justify-center
              ${isAnimating ? 'bg-red-500 animate-pulse' : 'bg-red-500'}
            `}
            style={{
              animation: isAnimating
                ? 'bounce 0.6s ease-in-out infinite'
                : undefined,
            }}
          >
            {counts.total > 99 ? '99+' : counts.total}
          </span>
        )}
      </button>

      {/* 알림 드롭다운 */}
      {isOpen && (
        <>
          {/* 배경 클릭으로 닫기 */}
          <div
            className="fixed inset-0 z-40"
            onClick={() => setIsOpen(false)}
          />

          {/* 알림 패널 */}
          <div className="absolute right-0 top-full mt-2 w-80 bg-white rounded-lg shadow-lg border z-50 max-h-96 overflow-hidden">
            {/* 헤더 */}
            <div className="p-4 border-b bg-gray-50">
              <div className="flex items-center justify-between">
                <h3 className="font-semibold text-gray-800">{t('notification.title')}</h3>
                <div className="flex gap-2">
                  {counts.total > 0 && (
                    <button
                      onClick={markAllAsRead}
                      className="text-xs text-blue-500 hover:text-blue-700"
                    >
                      {t('notification.markAllRead')}
                    </button>
                  )}
                  {notifications.length > 0 && (
                    <button
                      onClick={clearNotifications}
                      className="text-xs text-gray-500 hover:text-gray-700"
                    >
                      {t('notification.clearAll')}
                    </button>
                  )}
                </div>
              </div>

              {/* 알림 종류별 카운트 */}
              {counts.total > 0 && (
                <div className="flex flex-wrap gap-2 mt-2">
                  {counts.feed > 0 && (
                    <span className="px-2 py-1 bg-blue-100 text-blue-700 rounded-full text-xs">
                      {t('notification.feed')} {counts.feed}
                    </span>
                  )}
                  {counts.help > 0 && (
                    <span className="px-2 py-1 bg-red-100 text-red-700 rounded-full text-xs">
                      {t('notification.help')} {counts.help}
                    </span>
                  )}
                  {counts.chat > 0 && (
                    <span className="px-2 py-1 bg-green-100 text-green-700 rounded-full text-xs">
                      {t('notification.chat')} {counts.chat}
                    </span>
                  )}
                  {counts.follow > 0 && (
                    <span className="px-2 py-1 bg-purple-100 text-purple-700 rounded-full text-xs">
                      {t('notification.follow')} {counts.follow}
                    </span>
                  )}
                  {counts.reaction > 0 && (
                    <span className="px-2 py-1 bg-pink-100 text-pink-700 rounded-full text-xs">
                      {t('notification.reaction')} {counts.reaction}
                    </span>
                  )}
                  {counts.promotion > 0 && (
                    <span className="px-2 py-1 bg-orange-100 text-orange-700 rounded-full text-xs">
                      {t('notification.promotion')} {counts.promotion}
                    </span>
                  )}
                </div>
              )}
            </div>

            {/* 알림 목록 */}
            <div className="max-h-64 overflow-y-auto">
              {notifications.length === 0 ? (
                <div className="p-4 text-center text-gray-500">
                  {t('notification.empty')}
                </div>
              ) : (
                notifications.slice(0, 10).map((notification) => (
                  <div
                    key={notification.id}
                    className={`
                      p-3 border-b hover:bg-gray-50 cursor-pointer transition-colors
                      ${!notification.isRead ? 'bg-blue-50 border-l-4 border-l-blue-500' : ''}
                    `}
                    onClick={() => handleNotificationClick(notification)}
                    data-testid={`notification-item-${notification.id}`}
                  >
                    <div className="flex items-start gap-3">
                      {/* 아이콘 */}
                      <div className="flex-shrink-0 mt-1">
                        {getNotificationIcon(notification.type)}
                      </div>

                      {/* 내용 */}
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center justify-between">
                          <span className="text-xs font-medium text-gray-500 uppercase">
                            {getTypeLabel(notification.type)}
                          </span>
                          <span className="text-xs text-gray-400">
                            {formatTimeAgo(new Date(notification.createdAt))}
                          </span>
                        </div>

                        <h4 className="font-medium text-sm text-gray-800 mt-1">
                          {notification.title}
                        </h4>

                        <p className="text-sm text-gray-600 mt-1 line-clamp-2">
                          {notification.message}
                        </p>

                        {notification.location && (
                          <div className="flex items-center gap-1 mt-2">
                            <MapPin size={12} className="text-gray-400" />
                            <span className="text-xs text-gray-500">
                              {notification.location}
                            </span>
                          </div>
                        )}

                        {notification.relatedUserId && (
                          <div className="flex items-center gap-2 mt-2">
                            <div className="w-4 h-4 bg-gray-300 rounded-full"></div>
                            <span className="text-xs text-gray-500">
                              {t('notification.user')} {notification.relatedUserId}
                            </span>
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                ))
              )}
            </div>

            {/* 더 보기 버튼 */}
            {notifications.length > 10 && (
              <div className="p-3 bg-gray-50 text-center">
                <button className="text-sm text-blue-500 hover:text-blue-700">
                  {t('notification.viewMore')} ({notifications.length - 10}{t('notification.moreItems')})
                </button>
              </div>
            )}
          </div>
        </>
      )}

      {/* 애니메이션 스타일 */}
      <style>{`
        @keyframes bounce {
          0%, 20%, 53%, 80%, 100% {
            transform: translate3d(0,0,0);
          }
          40%, 43% {
            transform: translate3d(0,-8px,0);
          }
          70% {
            transform: translate3d(0,-4px,0);
          }
          90% {
            transform: translate3d(0,-2px,0);
          }
        }
        
        @keyframes pulse {
          0% {
            box-shadow: 0 0 0 0 rgba(239, 68, 68, 0.7);
          }
          70% {
            box-shadow: 0 0 0 6px rgba(239, 68, 68, 0);
          }
          100% {
            box-shadow: 0 0 0 0 rgba(239, 68, 68, 0);
          }
        }
      `}</style>
    </div>
  );
}
