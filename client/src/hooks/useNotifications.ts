import { useState, useEffect, useCallback } from 'react';

export interface Notification {
  id: string;
  type: 'feed' | 'help' | 'chat' | 'follow' | 'reaction' | 'promotion';
  title: string;
  message: string;
  location?: string;
  timestamp: Date;
  read: boolean;
  userId?: string;
  userName?: string;
  userAvatar?: string;
}

export interface NotificationCounts {
  feed: number;
  help: number;
  chat: number;
  follow: number;
  reaction: number;
  promotion: number;
  total: number;
}

export function useNotifications() {
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [counts, setCounts] = useState<NotificationCounts>({
    feed: 0,
    help: 0,
    chat: 0,
    follow: 0,
    reaction: 0,
    promotion: 0,
    total: 0,
  });
  const [hasNewNotifications, setHasNewNotifications] = useState(false);

  // 실시간 알림 시뮬레이션 (데모용 - 제한적)
  useEffect(() => {
    let notificationCount = 0;
    const maxNotifications = 10; // 최대 10개 알림만 생성

    const interval = setInterval(() => {
      if (notificationCount >= maxNotifications) {
        clearInterval(interval);
        console.log('알림 데모 완료 - 더 이상 새 알림이 생성되지 않습니다');
        return;
      }

      // 랜덤하게 새로운 알림 생성 (개발 시연용)
      if (Math.random() < 0.4) {
        // 40% 확률로 알림 생성
        addRandomNotification();
        notificationCount++;
      }
    }, 6000); // 6초마다 체크

    return () => clearInterval(interval);
  }, []);

  const addRandomNotification = useCallback(() => {
    const notificationTypes = [
      {
        type: 'feed' as const,
        titles: ['새로운 여행 피드', '인근 장소 추천', '현지 맛집 정보'],
        messages: [
          '같은 지역에서 새로운 여행 경험이 공유되었습니다',
          '파리 근처에서 숨은 맛집을 발견했다는 피드가 올라왔어요',
          '도쿄 시부야에서 새로운 카페 추천 글이 올라왔습니다',
        ],
        locations: ['파리, 프랑스', '도쿄, 일본', '바르셀로나, 스페인'],
      },
      {
        type: 'help' as const,
        titles: ['도움 요청', '긴급 도움', '여행 조언 요청'],
        messages: [
          '같은 호텔에 머무는 여행자가 도움을 요청했습니다',
          '방콕 근처에서 길을 잃었다는 도움 요청이 있어요',
          '터키 이스탄불에서 현지 교통편 도움을 요청했습니다',
        ],
        locations: ['방콕, 태국', '이스탄불, 터키', '리우, 브라질'],
      },
      {
        type: 'chat' as const,
        titles: ['새 메시지', '채팅 요청', '대화 초대'],
        messages: [
          '새로운 메시지가 도착했습니다',
          '여행 가이드가 메시지를 보냈어요',
          '현지인이 채팅을 걸어왔습니다',
        ],
        locations: [],
      },
      {
        type: 'follow' as const,
        titles: ['새 팔로워', '팔로우 요청'],
        messages: [
          '새로운 여행자가 당신을 팔로우했습니다',
          '현지 가이드가 팔로우 요청을 보냈어요',
        ],
        locations: [],
      },
      {
        type: 'reaction' as const,
        titles: ['좋아요', '댓글', '반응'],
        messages: [
          '내 여행 피드에 좋아요가 달렸어요',
          '경복궁 야경 사진에 댓글이 달렸습니다',
          '내 추천 맛집 글에 많은 반응이 있어요',
        ],
        locations: [],
      },
      {
        type: 'promotion' as const,
        titles: ['특별 이벤트', '할인 정보', '맛집 프로모션'],
        messages: [
          '근처 레스토랑에서 20% 할인 이벤트를 진행중입니다',
          '인근 호텔에서 특가 이벤트가 시작되었어요',
          '현지 투어 업체에서 한정 할인을 제공합니다',
        ],
        locations: ['근처 맛집', '인근 호텔', '현지 투어'],
      },
    ];

    const randomType =
      notificationTypes[Math.floor(Math.random() * notificationTypes.length)];
    const randomTitle =
      randomType.titles[Math.floor(Math.random() * randomType.titles.length)];
    const randomMessage =
      randomType.messages[
        Math.floor(Math.random() * randomType.messages.length)
      ];
    const randomLocation =
      randomType.locations.length > 0
        ? randomType.locations[
            Math.floor(Math.random() * randomType.locations.length)
          ]
        : undefined;

    const newNotification: Notification = {
      id: `notif_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      type: randomType.type,
      title: randomTitle,
      message: randomMessage,
      location: randomLocation,
      timestamp: new Date(),
      read: false,
      userName: [
        '여행러김씨',
        '파리가이드',
        '도쿄포토그래퍼',
        '바르셀로나로컬',
      ][Math.floor(Math.random() * 4)],
      userAvatar: '/api/placeholder/40/40',
    };

    setNotifications((prev) => [newNotification, ...prev]);
    setHasNewNotifications(true);

    // 카운트 업데이트
    setCounts((prev) => ({
      ...prev,
      [randomType.type]: prev[randomType.type] + 1,
      total: prev.total + 1,
    }));

    console.log('새 알림:', newNotification.title, '-', newNotification.type);
  }, []);

  const markAsRead = useCallback((notificationId: string) => {
    setNotifications((prev) =>
      prev.map((notif) =>
        notif.id === notificationId ? { ...notif, read: true } : notif
      )
    );
  }, []);

  const markAllAsRead = useCallback(() => {
    setNotifications((prev) => prev.map((notif) => ({ ...notif, read: true })));
    setCounts({
      feed: 0,
      help: 0,
      chat: 0,
      follow: 0,
      reaction: 0,
      promotion: 0,
      total: 0,
    });
    setHasNewNotifications(false);
  }, []);

  const clearNotifications = useCallback(() => {
    setNotifications([]);
    setCounts({
      feed: 0,
      help: 0,
      chat: 0,
      follow: 0,
      reaction: 0,
      promotion: 0,
      total: 0,
    });
    setHasNewNotifications(false);
  }, []);

  return {
    notifications,
    counts,
    hasNewNotifications,
    markAsRead,
    markAllAsRead,
    clearNotifications,
    addRandomNotification, // 테스트용
  };
}
