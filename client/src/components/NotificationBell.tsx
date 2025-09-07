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
import { useNotifications, type Notification } from '@/hooks/useNotifications';

export default function NotificationBell() {
  const {
    notifications,
    counts,
    hasNewNotifications,
    markAllAsRead,
    clearNotifications,
  } = useNotifications();
  const [isOpen, setIsOpen] = useState(false);
  const [isAnimating, setIsAnimating] = useState(false);

  // 새 알림이 올 때 애니메이션 효과
  useEffect(() => {
    if (hasNewNotifications) {
      setIsAnimating(true);
      const timer = setTimeout(() => setIsAnimating(false), 2000);
      return () => clearTimeout(timer);
    }
  }, [hasNewNotifications]);

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
      default:
        return <Bell size={16} className="text-gray-500" />;
    }
  };

  const getTypeLabel = (type: Notification['type']) => {
    switch (type) {
      case 'feed':
        return '인근 피드';
      case 'help':
        return '도움 요청';
      case 'chat':
        return '새 메시지';
      case 'follow':
        return '팔로우';
      case 'reaction':
        return '반응';
      case 'promotion':
        return '프로모션';
      default:
        return '알림';
    }
  };

  const formatTimeAgo = (timestamp: Date) => {
    const now = new Date();
    const diff = now.getTime() - timestamp.getTime();
    const minutes = Math.floor(diff / 60000);

    if (minutes < 1) return '방금 전';
    if (minutes < 60) return `${minutes}분 전`;
    const hours = Math.floor(minutes / 60);
    if (hours < 24) return `${hours}시간 전`;
    return `${Math.floor(hours / 24)}일 전`;
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
                <h3 className="font-semibold text-gray-800">알림</h3>
                <div className="flex gap-2">
                  {counts.total > 0 && (
                    <button
                      onClick={markAllAsRead}
                      className="text-xs text-blue-500 hover:text-blue-700"
                    >
                      모두 읽음
                    </button>
                  )}
                  {notifications.length > 0 && (
                    <button
                      onClick={clearNotifications}
                      className="text-xs text-gray-500 hover:text-gray-700"
                    >
                      모두 삭제
                    </button>
                  )}
                </div>
              </div>

              {/* 알림 종류별 카운트 */}
              {counts.total > 0 && (
                <div className="flex flex-wrap gap-2 mt-2">
                  {counts.feed > 0 && (
                    <span className="px-2 py-1 bg-blue-100 text-blue-700 rounded-full text-xs">
                      인근 피드 {counts.feed}
                    </span>
                  )}
                  {counts.help > 0 && (
                    <span className="px-2 py-1 bg-red-100 text-red-700 rounded-full text-xs">
                      도움 요청 {counts.help}
                    </span>
                  )}
                  {counts.chat > 0 && (
                    <span className="px-2 py-1 bg-green-100 text-green-700 rounded-full text-xs">
                      메시지 {counts.chat}
                    </span>
                  )}
                  {counts.follow > 0 && (
                    <span className="px-2 py-1 bg-purple-100 text-purple-700 rounded-full text-xs">
                      팔로우 {counts.follow}
                    </span>
                  )}
                  {counts.reaction > 0 && (
                    <span className="px-2 py-1 bg-pink-100 text-pink-700 rounded-full text-xs">
                      반응 {counts.reaction}
                    </span>
                  )}
                  {counts.promotion > 0 && (
                    <span className="px-2 py-1 bg-orange-100 text-orange-700 rounded-full text-xs">
                      프로모션 {counts.promotion}
                    </span>
                  )}
                </div>
              )}
            </div>

            {/* 알림 목록 */}
            <div className="max-h-64 overflow-y-auto">
              {notifications.length === 0 ? (
                <div className="p-4 text-center text-gray-500">
                  새로운 알림이 없습니다
                </div>
              ) : (
                notifications.slice(0, 10).map((notification) => (
                  <div
                    key={notification.id}
                    className={`
                      p-3 border-b hover:bg-gray-50 cursor-pointer transition-colors
                      ${!notification.isRead ? 'bg-blue-50 border-l-4 border-l-blue-500' : ''}
                    `}
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

                        {notification.userName && (
                          <div className="flex items-center gap-2 mt-2">
                            <div className="w-4 h-4 bg-gray-300 rounded-full"></div>
                            <span className="text-xs text-gray-500">
                              {notification.userName}
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
                  더 많은 알림 보기 ({notifications.length - 10}개 더)
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
