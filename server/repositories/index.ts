/**
 * ============================================
 * 저장소 모듈 진입점
 * Repository Module Entry Point
 * ============================================
 * 
 * 서브 인터페이스를 내보내는 진입점 파일입니다.
 * 각 라우터는 필요한 인터페이스만 import하여 사용할 수 있습니다.
 * 
 * 사용 예시:
 * ```typescript
 * import type { IUserRepository, IPaymentsRepository } from '@/repositories';
 * 
 * function createUserHandler(userRepo: IUserRepository) {
 *   // 사용자 관련 로직만 의존
 * }
 * ```
 * 
 * 이점:
 * 1. 의존성 최소화 - 필요한 기능만 주입
 * 2. 테스트 용이 - 모킹 범위 축소
 * 3. 타입 안전성 - 컴파일 타임 검증
 * 4. 코드 가독성 - 명확한 의존성 표현
 */

export type {
  IUserRepository,
  ISocialRepository,
  IPaymentsRepository,
  IBookingRepository,
  IChatRepository,
  IAIRepository,
  IAdminRepository,
  IFeedRepository,
  IAuxiliaryRepository,
  IStorageUnified,
} from './interfaces';

export {
  isUserRepository,
  isSocialRepository,
  isPaymentsRepository,
  isBookingRepository,
  isChatRepository,
  isAIRepository,
  isAdminRepository,
  isFeedRepository,
  isAuxiliaryRepository,
} from './interfaces';
