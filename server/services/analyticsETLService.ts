/**
 * ============================================
 * 분석 ETL 서비스 (Analytics ETL Service)
 * ============================================
 * 
 * 이 서비스는 분석 데이터 웨어하우스를 위한 ETL(추출-변환-적재) 작업을 담당합니다.
 * 
 * 아키텍처: Star Schema (스타 스키마)
 * - Dimension Tables (차원 테이블):
 *   - dimDate: 날짜 차원 (연, 월, 주, 요일 등)
 *   - dimUsers: 사용자 차원 (SCD Type 2 적용)
 *   - dimLocations: 위치 차원 (도시, 국가)
 *   - dimServiceTypes: 서비스 유형 차원
 * 
 * - Fact Tables (팩트 테이블):
 *   - factTransactions: 결제 거래 팩트
 *   - factUserActivities: 사용자 활동 팩트
 *   - factBookings: 예약 팩트
 *   - factDailyMetrics: 일별 집계 메트릭스
 *   - factDisputes: 분쟁 처리 팩트
 * 
 * ETL 작업 유형:
 * 1. Full ETL (전체 동기화): 모든 차원 및 팩트 테이블 동기화
 * 2. Daily ETL (일일 증분): 전일 데이터만 처리 (매일 실행)
 * 
 * 실행 주기:
 * - Full ETL: 초기 설정 또는 재구축 시
 * - Daily ETL: 매일 새벽 04:00 KST 권장
 * 
 * 성능 고려사항:
 * - 대용량 데이터는 청크 단위로 처리
 * - 중복 방지를 위한 upsert 패턴 사용
 * - 인덱스 최적화된 쿼리 사용
 */

import { db } from '../db';
import {
  dimDate,
  dimUsers,
  dimLocations,
  dimServiceTypes,
  factTransactions,
  factUserActivities,
  factBookings,
  factDailyMetrics,
  factDisputes,
  users,
  payments,
  bookings,
  contracts,
  escrowTransactions,
  posts,
  comments,
  likes,
  messages,
  experiences,
  disputeCases,
  userSubscriptions,
  userTripPasses,
} from '@shared/schema';
import { eq, and, gte, lte, sql, desc, count, sum } from 'drizzle-orm';

// ============================================
// 상수 정의
// ============================================
const MONTH_NAMES = ['', 'January', 'February', 'March', 'April', 'May', 'June',
  'July', 'August', 'September', 'October', 'November', 'December'];

const DAY_NAMES = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];

// 배치 처리 청크 크기 (성능 최적화)
const BATCH_CHUNK_SIZE = 100;

export async function generateDateDimension(startYear: number, endYear: number): Promise<{ generated: number }> {
  let generated = 0;

  for (let year = startYear; year <= endYear; year++) {
    for (let month = 1; month <= 12; month++) {
      const daysInMonth = new Date(year, month, 0).getDate();

      for (let day = 1; day <= daysInMonth; day++) {
        const date = new Date(year, month - 1, day);
        const dateKey = year * 10000 + month * 100 + day;
        const fullDate = date.toISOString().split('T')[0];

        const dayOfWeek = date.getDay();
        const startOfYear = new Date(year, 0, 1);
        const dayOfYear = Math.ceil((date.getTime() - startOfYear.getTime()) / (24 * 60 * 60 * 1000)) + 1;

        const firstDayOfYear = new Date(year, 0, 1);
        const pastDaysOfYear = (date.getTime() - firstDayOfYear.getTime()) / 86400000;
        const weekNumber = Math.ceil((pastDaysOfYear + firstDayOfYear.getDay() + 1) / 7);

        const existing = await db.select()
          .from(dimDate)
          .where(eq(dimDate.dateKey, dateKey))
          .limit(1);

        if (existing.length === 0) {
          await db.insert(dimDate).values({
            dateKey,
            fullDate,
            year,
            quarter: Math.ceil(month / 3),
            month,
            monthName: MONTH_NAMES[month],
            week: weekNumber,
            dayOfMonth: day,
            dayOfWeek: dayOfWeek + 1,
            dayOfWeekName: DAY_NAMES[dayOfWeek],
            dayOfYear,
            isWeekend: dayOfWeek === 0 || dayOfWeek === 6,
            isHoliday: false,
            fiscalYear: month >= 4 ? year : year - 1,
            fiscalQuarter: Math.ceil(((month + 8) % 12 + 1) / 3),
          });
          generated++;
        }
      }
    }
  }

  return { generated };
}

export function getDateKey(date: Date): number {
  return date.getFullYear() * 10000 + (date.getMonth() + 1) * 100 + date.getDate();
}

export async function syncUserDimension(): Promise<{ synced: number; updated: number }> {
  let synced = 0;
  let updated = 0;

  const allUsers = await db.select().from(users);

  for (const user of allUsers) {
    const existing = await db.select()
      .from(dimUsers)
      .where(and(
        eq(dimUsers.userId, user.id),
        eq(dimUsers.isCurrent, true)
      ))
      .limit(1);

    const displayName = [user.firstName, user.lastName].filter(Boolean).join(' ') || user.email?.split('@')[0];
    const locationParts = user.location?.split(',').map(s => s.trim()) || [];
    const city = locationParts[0] || null;
    const country = locationParts[locationParts.length - 1] || null;

    const verificationLevel = user.isEmailVerified ? 'email_verified' : 'basic';
    const userTypeVal = user.userType || 'traveler';
    const roleVal = user.role || 'user';
    const languagesStr = JSON.stringify(user.languages || []);

    if (existing.length === 0) {
      const version = 1;
      const surrogateKey = `user_${user.id}_v${version}`;

      await db.insert(dimUsers).values({
        userId: user.id,
        surrogateKey,
        username: displayName,
        email: user.email,
        userType: userTypeVal,
        role: roleVal,
        tier: 'free',
        regionCode: user.regionCode,
        country,
        city,
        languagesSpoken: user.languages,
        verificationLevel,
        registrationDate: user.createdAt ? user.createdAt.toISOString().split('T')[0] : null,
        effectiveDate: user.createdAt || new Date(),
        isCurrent: true,
        version,
      });
      synced++;
    } else {
      const existingRow = existing[0];
      const existingLanguagesStr = JSON.stringify(existingRow.languagesSpoken || []);

      const hasChanged =
        existingRow.username !== displayName ||
        existingRow.email !== user.email ||
        existingRow.userType !== userTypeVal ||
        existingRow.role !== roleVal ||
        existingRow.regionCode !== user.regionCode ||
        existingRow.country !== country ||
        existingRow.city !== city ||
        existingLanguagesStr !== languagesStr ||
        existingRow.verificationLevel !== verificationLevel;

      if (hasChanged) {
        const now = new Date();

        await db.update(dimUsers)
          .set({
            isCurrent: false,
            expirationDate: now,
          })
          .where(eq(dimUsers.id, existingRow.id));

        const newVersion = (existingRow.version || 1) + 1;
        const surrogateKey = `user_${user.id}_v${newVersion}`;

        await db.insert(dimUsers).values({
          userId: user.id,
          surrogateKey,
          username: displayName,
          email: user.email,
          userType: userTypeVal,
          role: roleVal,
          tier: 'free',
          regionCode: user.regionCode,
          country,
          city,
          languagesSpoken: user.languages,
          verificationLevel,
          registrationDate: user.createdAt ? user.createdAt.toISOString().split('T')[0] : null,
          effectiveDate: now,
          isCurrent: true,
          version: newVersion,
        });
        synced++;
        updated++;
      }
    }
  }

  return { synced, updated };
}

export async function syncLocationDimension(): Promise<{ synced: number }> {
  let synced = 0;

  const locations = await db.execute(sql`
    SELECT DISTINCT 
      COALESCE(location, 'Unknown') as location_name,
      latitude as lat,
      longitude as lng
    FROM posts 
    WHERE location IS NOT NULL AND location != ''
  `);

  for (const loc of locations.rows) {
    const locationName = (loc.location_name as string) || 'Unknown';
    const locationParts = locationName.split(',').map(s => s.trim());
    const city = locationParts[0] || 'Unknown';
    const country = locationParts.length > 1 ? locationParts[locationParts.length - 1] : 'Unknown';
    
    const locationKey = `${country}_${city}`.replace(/\s+/g, '_').toLowerCase().substring(0, 100);

    const existing = await db.select()
      .from(dimLocations)
      .where(eq(dimLocations.locationKey, locationKey))
      .limit(1);

    if (existing.length === 0) {
      await db.insert(dimLocations).values({
        locationKey,
        country,
        city,
        latitude: loc.lat as string,
        longitude: loc.lng as string,
      });
      synced++;
    }
  }

  return { synced };
}

export async function syncServiceTypeDimension(): Promise<{ synced: number }> {
  const defaultServiceTypes = [
    { key: 'experience_tour', category: 'experience', subcategory: 'tour', name: 'Guided Tour', nameKo: '가이드 투어' },
    { key: 'experience_food', category: 'experience', subcategory: 'food', name: 'Food Experience', nameKo: '음식 체험' },
    { key: 'experience_culture', category: 'experience', subcategory: 'culture', name: 'Cultural Experience', nameKo: '문화 체험' },
    { key: 'experience_activity', category: 'experience', subcategory: 'activity', name: 'Activity', nameKo: '액티비티' },
    { key: 'guide_local', category: 'guide', subcategory: 'local', name: 'Local Guide', nameKo: '로컬 가이드' },
    { key: 'guide_interpreter', category: 'guide', subcategory: 'interpreter', name: 'Interpreter', nameKo: '통역' },
    { key: 'transport_driver', category: 'transport', subcategory: 'driver', name: 'Private Driver', nameKo: '개인 드라이버' },
    { key: 'shopping_agent', category: 'shopping', subcategory: 'agent', name: 'Shopping Agent', nameKo: '쇼핑 에이전트' },
    { key: 'accommodation_host', category: 'accommodation', subcategory: 'host', name: 'Accommodation Host', nameKo: '숙소 호스트' },
    { key: 'subscription_basic', category: 'subscription', subcategory: 'basic', name: 'Basic Subscription', nameKo: '베이직 구독' },
    { key: 'subscription_premium', category: 'subscription', subcategory: 'premium', name: 'Premium Subscription', nameKo: '프리미엄 구독' },
    { key: 'trip_pass', category: 'trip_pass', subcategory: 'credit', name: 'Trip Pass', nameKo: '트립 패스' },
  ];

  let synced = 0;

  for (const st of defaultServiceTypes) {
    const existing = await db.select()
      .from(dimServiceTypes)
      .where(eq(dimServiceTypes.serviceTypeKey, st.key))
      .limit(1);

    if (existing.length === 0) {
      await db.insert(dimServiceTypes).values({
        serviceTypeKey: st.key,
        category: st.category,
        subcategory: st.subcategory,
        serviceName: st.name,
        serviceNameKo: st.nameKo,
        isOnline: st.category === 'subscription' || st.category === 'trip_pass',
        isActive: true,
      });
      synced++;
    }
  }

  return { synced };
}

export async function etlTransactions(targetDate: Date): Promise<{ processed: number }> {
  const dateKey = getDateKey(targetDate);
  const startOfDay = new Date(targetDate);
  startOfDay.setHours(0, 0, 0, 0);
  const endOfDay = new Date(targetDate);
  endOfDay.setHours(23, 59, 59, 999);

  let processed = 0;

  const dayPayments = await db.select()
    .from(payments)
    .where(and(
      gte(payments.createdAt, startOfDay),
      lte(payments.createdAt, endOfDay)
    ));

  for (const payment of dayPayments) {
    const transactionKey = `payment_${payment.id}`;

    const existing = await db.select()
      .from(factTransactions)
      .where(eq(factTransactions.transactionKey, transactionKey))
      .limit(1);

    if (existing.length === 0) {
      const userDim = await db.select()
        .from(dimUsers)
        .where(and(eq(dimUsers.userId, payment.userId), eq(dimUsers.isCurrent, true)))
        .limit(1);

      await db.insert(factTransactions).values({
        transactionKey,
        dateKey,
        userDimId: userDim[0]?.id,
        originalPaymentId: payment.id,
        transactionType: payment.type || 'payment',
        grossAmount: payment.amount,
        netAmount: payment.amount,
        currency: payment.currency || 'USD',
        status: payment.status,
        paymentMethod: payment.paymentMethod,
        paymentGateway: payment.pgProvider,
        transactionTimestamp: payment.createdAt || new Date(),
      });
      processed++;
    }
  }

  const dayEscrows = await db.select()
    .from(escrowTransactions)
    .where(and(
      gte(escrowTransactions.createdAt, startOfDay),
      lte(escrowTransactions.createdAt, endOfDay)
    ));

  for (const escrow of dayEscrows) {
    const transactionKey = `escrow_${escrow.id}`;

    const existing = await db.select()
      .from(factTransactions)
      .where(eq(factTransactions.transactionKey, transactionKey))
      .limit(1);

    if (existing.length === 0) {
      const travelerId = escrow.travelerId;
      const hostId = escrow.hostId;

      const travelerDim = travelerId ? await db.select()
        .from(dimUsers)
        .where(and(eq(dimUsers.userId, travelerId), eq(dimUsers.isCurrent, true)))
        .limit(1) : [];

      const hostDim = hostId ? await db.select()
        .from(dimUsers)
        .where(and(eq(dimUsers.userId, hostId), eq(dimUsers.isCurrent, true)))
        .limit(1) : [];

      await db.insert(factTransactions).values({
        transactionKey,
        dateKey,
        userDimId: travelerDim[0]?.id,
        hostDimId: hostDim[0]?.id,
        originalEscrowId: escrow.id,
        originalContractId: escrow.contractId,
        transactionType: `escrow_${escrow.status}`,
        grossAmount: escrow.amount,
        netAmount: escrow.amount,
        platformFee: escrow.platformFee,
        hostEarnings: escrow.hostAmount,
        currency: escrow.currency || 'USD',
        status: escrow.status,
        transactionTimestamp: escrow.createdAt || new Date(),
      });
      processed++;
    }
  }

  return { processed };
}

export async function etlBookings(targetDate: Date): Promise<{ processed: number }> {
  const dateKey = getDateKey(targetDate);
  const startOfDay = new Date(targetDate);
  startOfDay.setHours(0, 0, 0, 0);
  const endOfDay = new Date(targetDate);
  endOfDay.setHours(23, 59, 59, 999);

  let processed = 0;

  const dayBookings = await db.select()
    .from(bookings)
    .where(and(
      gte(bookings.createdAt, startOfDay),
      lte(bookings.createdAt, endOfDay)
    ));

  for (const booking of dayBookings) {
    const bookingKey = `booking_${booking.id}`;

    const existing = await db.select()
      .from(factBookings)
      .where(eq(factBookings.bookingKey, bookingKey))
      .limit(1);

    if (existing.length === 0) {
      const userDim = await db.select()
        .from(dimUsers)
        .where(and(eq(dimUsers.userId, booking.userId), eq(dimUsers.isCurrent, true)))
        .limit(1);

      let hostDim: any[] = [];
      if (booking.experienceId) {
        const exp = await db.select().from(experiences).where(eq(experiences.id, booking.experienceId)).limit(1);
        if (exp[0]) {
          hostDim = await db.select()
            .from(dimUsers)
            .where(and(eq(dimUsers.userId, exp[0].hostId), eq(dimUsers.isCurrent, true)))
            .limit(1);
        }
      }

      const serviceDateKey = booking.bookingDate
        ? getDateKey(new Date(booking.bookingDate))
        : null;

      await db.insert(factBookings).values({
        bookingKey,
        dateKey,
        serviceDateKey,
        userDimId: userDim[0]?.id || 0,
        hostDimId: hostDim[0]?.id || 0,
        originalBookingId: booking.id,
        originalExperienceId: booking.experienceId,
        bookingStatus: booking.status,
        guestCount: booking.guestCount || 1,
        totalPrice: booking.totalPrice,
        finalPrice: booking.totalPrice,
        currency: 'USD',
        bookingTimestamp: booking.createdAt || new Date(),
        serviceTimestamp: booking.bookingDate ? new Date(booking.bookingDate) : null,
      });
      processed++;
    }
  }

  return { processed };
}

export async function etlDailyMetrics(targetDate: Date): Promise<{ success: boolean }> {
  const dateKey = getDateKey(targetDate);
  const metricDate = targetDate.toISOString().split('T')[0];
  const startOfDay = new Date(targetDate);
  startOfDay.setHours(0, 0, 0, 0);
  const endOfDay = new Date(targetDate);
  endOfDay.setHours(23, 59, 59, 999);

  const existing = await db.select()
    .from(factDailyMetrics)
    .where(eq(factDailyMetrics.dateKey, dateKey))
    .limit(1);

  const newUsers = await db.select({ count: count() })
    .from(users)
    .where(and(
      gte(users.createdAt, startOfDay),
      lte(users.createdAt, endOfDay)
    ));

  const newPosts = await db.select({ count: count() })
    .from(posts)
    .where(and(
      gte(posts.createdAt, startOfDay),
      lte(posts.createdAt, endOfDay)
    ));

  const newComments = await db.select({ count: count() })
    .from(comments)
    .where(and(
      gte(comments.createdAt, startOfDay),
      lte(comments.createdAt, endOfDay)
    ));

  const newLikes = await db.select({ count: count() })
    .from(likes)
    .where(and(
      gte(likes.createdAt, startOfDay),
      lte(likes.createdAt, endOfDay)
    ));

  const newMessages = await db.select({ count: count() })
    .from(messages)
    .where(and(
      gte(messages.createdAt, startOfDay),
      lte(messages.createdAt, endOfDay)
    ));

  const newBookings = await db.select({ count: count() })
    .from(bookings)
    .where(and(
      gte(bookings.createdAt, startOfDay),
      lte(bookings.createdAt, endOfDay)
    ));

  const completedBookings = await db.select({ count: count() })
    .from(bookings)
    .where(and(
      eq(bookings.status, 'completed'),
      gte(bookings.updatedAt, startOfDay),
      lte(bookings.updatedAt, endOfDay)
    ));

  const cancelledBookings = await db.select({ count: count() })
    .from(bookings)
    .where(and(
      eq(bookings.status, 'cancelled'),
      gte(bookings.updatedAt, startOfDay),
      lte(bookings.updatedAt, endOfDay)
    ));

  const dayPayments = await db.select({
    total: sql<string>`COALESCE(SUM(${payments.amount}), 0)`,
    count: count(),
  })
    .from(payments)
    .where(and(
      eq(payments.status, 'completed'),
      gte(payments.createdAt, startOfDay),
      lte(payments.createdAt, endOfDay)
    ));

  const refunds = await db.select({
    total: sql<string>`COALESCE(SUM(${payments.amount}), 0)`,
  })
    .from(payments)
    .where(and(
      eq(payments.type, 'refund'),
      gte(payments.createdAt, startOfDay),
      lte(payments.createdAt, endOfDay)
    ));

  const newDisputes = await db.select({ count: count() })
    .from(disputeCases)
    .where(and(
      gte(disputeCases.createdAt, startOfDay),
      lte(disputeCases.createdAt, endOfDay)
    ));

  const resolvedDisputes = await db.select({ count: count() })
    .from(disputeCases)
    .where(and(
      gte(disputeCases.resolvedAt, startOfDay),
      lte(disputeCases.resolvedAt, endOfDay)
    ));

  const metrics = {
    dateKey,
    metricDate,
    newUserCount: newUsers[0]?.count || 0,
    newPostCount: newPosts[0]?.count || 0,
    newCommentCount: newComments[0]?.count || 0,
    newLikeCount: newLikes[0]?.count || 0,
    newMessageCount: newMessages[0]?.count || 0,
    newBookingCount: newBookings[0]?.count || 0,
    completedBookingCount: completedBookings[0]?.count || 0,
    cancelledBookingCount: cancelledBookings[0]?.count || 0,
    totalPaymentAmount: dayPayments[0]?.total || '0',
    totalTransactionCount: dayPayments[0]?.count || 0,
    refundAmount: refunds[0]?.total || '0',
    newDisputeCount: newDisputes[0]?.count || 0,
    resolvedDisputeCount: resolvedDisputes[0]?.count || 0,
    lastUpdatedAt: new Date(),
  };

  if (existing.length > 0) {
    await db.update(factDailyMetrics)
      .set(metrics)
      .where(eq(factDailyMetrics.dateKey, dateKey));
  } else {
    await db.insert(factDailyMetrics).values(metrics);
  }

  return { success: true };
}

export async function etlDisputes(targetDate: Date): Promise<{ processed: number }> {
  const dateKey = getDateKey(targetDate);
  const startOfDay = new Date(targetDate);
  startOfDay.setHours(0, 0, 0, 0);
  const endOfDay = new Date(targetDate);
  endOfDay.setHours(23, 59, 59, 999);

  let processed = 0;

  const dayDisputes = await db.select()
    .from(disputeCases)
    .where(and(
      gte(disputeCases.createdAt, startOfDay),
      lte(disputeCases.createdAt, endOfDay)
    ));

  for (const dispute of dayDisputes) {
    const disputeKey = `dispute_${dispute.id}`;

    const existing = await db.select()
      .from(factDisputes)
      .where(eq(factDisputes.disputeKey, disputeKey))
      .limit(1);

    if (existing.length === 0) {
      const complainantDim = await db.select()
        .from(dimUsers)
        .where(and(eq(dimUsers.userId, dispute.complainantId), eq(dimUsers.isCurrent, true)))
        .limit(1);

      const respondentDim = await db.select()
        .from(dimUsers)
        .where(and(eq(dimUsers.userId, dispute.respondentId), eq(dimUsers.isCurrent, true)))
        .limit(1);

      await db.insert(factDisputes).values({
        disputeKey,
        createdDateKey: dateKey,
        resolvedDateKey: dispute.resolvedAt ? getDateKey(dispute.resolvedAt) : null,
        complainantDimId: complainantDim[0]?.id || 0,
        respondentDimId: respondentDim[0]?.id || 0,
        originalDisputeId: dispute.id,
        originalContractId: dispute.contractId,
        disputeType: dispute.disputeType,
        priority: dispute.priority || 'normal',
        status: dispute.status,
        resolutionType: dispute.resolutionType,
        favoredParty: dispute.favoredParty,
        disputedAmount: dispute.disputedAmount,
        refundedAmount: dispute.refundAmount,
        slaMet: !dispute.slaBreached,
        createdTimestamp: dispute.createdAt || new Date(),
        resolvedTimestamp: dispute.resolvedAt,
      });
      processed++;
    }
  }

  return { processed };
}

export async function runFullETL(startDate: Date, endDate: Date): Promise<{
  dateDimGenerated: number;
  usersSynced: number;
  locationsSynced: number;
  serviceTypesSynced: number;
  transactionsProcessed: number;
  bookingsProcessed: number;
  dailyMetricsProcessed: number;
  disputesProcessed: number;
}> {
  console.log('[Analytics ETL] Starting full ETL process...');

  const dateResult = await generateDateDimension(
    startDate.getFullYear(),
    endDate.getFullYear()
  );
  console.log(`[Analytics ETL] Date dimension: ${dateResult.generated} generated`);

  const userResult = await syncUserDimension();
  console.log(`[Analytics ETL] User dimension: ${userResult.synced} synced, ${userResult.updated} updated`);

  const locationResult = await syncLocationDimension();
  console.log(`[Analytics ETL] Location dimension: ${locationResult.synced} synced`);

  const serviceTypeResult = await syncServiceTypeDimension();
  console.log(`[Analytics ETL] Service type dimension: ${serviceTypeResult.synced} synced`);

  let transactionsProcessed = 0;
  let bookingsProcessed = 0;
  let dailyMetricsProcessed = 0;
  let disputesProcessed = 0;

  const currentDate = new Date(startDate);
  while (currentDate <= endDate) {
    const transResult = await etlTransactions(new Date(currentDate));
    transactionsProcessed += transResult.processed;

    const bookingResult = await etlBookings(new Date(currentDate));
    bookingsProcessed += bookingResult.processed;

    await etlDailyMetrics(new Date(currentDate));
    dailyMetricsProcessed++;

    const disputeResult = await etlDisputes(new Date(currentDate));
    disputesProcessed += disputeResult.processed;

    currentDate.setDate(currentDate.getDate() + 1);
  }

  console.log('[Analytics ETL] Full ETL process completed');

  return {
    dateDimGenerated: dateResult.generated,
    usersSynced: userResult.synced,
    locationsSynced: locationResult.synced,
    serviceTypesSynced: serviceTypeResult.synced,
    transactionsProcessed,
    bookingsProcessed,
    dailyMetricsProcessed,
    disputesProcessed,
  };
}

export async function runDailyETL(): Promise<{
  date: string;
  transactions: number;
  bookings: number;
  disputes: number;
  dailyMetrics: boolean;
}> {
  const yesterday = new Date();
  yesterday.setDate(yesterday.getDate() - 1);

  console.log(`[Analytics ETL] Running daily ETL for ${yesterday.toISOString().split('T')[0]}`);

  await syncUserDimension();

  const transResult = await etlTransactions(yesterday);
  const bookingResult = await etlBookings(yesterday);
  const disputeResult = await etlDisputes(yesterday);
  await etlDailyMetrics(yesterday);

  return {
    date: yesterday.toISOString().split('T')[0],
    transactions: transResult.processed,
    bookings: bookingResult.processed,
    disputes: disputeResult.processed,
    dailyMetrics: true,
  };
}
