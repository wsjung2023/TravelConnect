// 레이더 래퍼 — RadarView를 감싸서 기존 import 경로(meet.tsx)를 유지한다
import RadarView from './RadarView';

interface Props { users?: any[] }

export default function MeetRadar({ users = [] }: Props) {
  return <RadarView users={users} />;
}
