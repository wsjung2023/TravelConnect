// 나의 상태 배너 — open-to-meet 상태를 v3 카드로 래핑, OpenToMeetToggle 로직 재사용
import { useQuery } from '@tanstack/react-query';
import { useTranslation } from 'react-i18next';
import OpenToMeetToggle from '@/components/OpenToMeetToggle';

export default function MeetStatusBanner() {
  const { t } = useTranslation('ui');
  const { data: openStatus } = useQuery<any>({ queryKey: ['/api/profile/open'] });
  const isOpen = openStatus?.openToMeet ?? false;

  return (
    <div
      className="mx-4 mb-3 px-4 py-3 rounded-2xl"
      style={{
        background: isOpen ? 'rgba(124,231,214,0.08)' : 'var(--surface-1)',
        border: `1px solid ${isOpen ? 'rgba(124,231,214,0.35)' : 'var(--stroke)'}`,
      }}
    >
      <p
        className="text-xs font-semibold mb-2"
        style={{ color: isOpen ? 'var(--accent-mint)' : 'var(--text-secondary)' }}
      >
        {t('meet.myStatus')}
      </p>
      <OpenToMeetToggle />
    </div>
  );
}
