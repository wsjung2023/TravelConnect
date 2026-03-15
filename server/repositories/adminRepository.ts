// @ts-nocheck
// adminRepository.ts - 시스템 설정, POI, 번역, 세션 및 메트릭 관련 DB 접근 로직을 담당한다.
import {
  systemSettings,
  translations,
  systemConfig,
  configAuditLogs,
  poiCategories,
  poiTypes,
  poiCategoryTranslations,
  poiTypeTranslations,
  userSessions,
  userEvents,
  userDailyMetrics,
  type SystemSetting,
  type InsertSystemSetting,
  type PoiCategory,
  type InsertPoiCategory,
  type PoiType,
  type InsertPoiType,
  type PoiCategoryTranslation,
  type InsertPoiCategoryTranslation,
  type PoiTypeTranslation,
  type InsertPoiTypeTranslation,
  type SystemConfig,
  type InsertSystemConfig,
  type ConfigAuditLog,
  type UserSession,
  type UserEvent,
  type InsertUserEvent,
  type UserDailyMetric,
} from '@shared/schema';
import { db } from '../db';
import { eq, and, sql, asc, desc, gte, lte } from 'drizzle-orm';

// System Settings operations
export async function getSystemSetting(
  category: string,
  key: string
): Promise<string | undefined> {
  const [setting] = await db
    .select()
    .from(systemSettings)
    .where(
      and(
        eq(systemSettings.category, category),
        eq(systemSettings.key, key),
        eq(systemSettings.isActive, true)
      )
    );
  return setting?.value;
}

export async function setSystemSetting(setting: InsertSystemSetting): Promise<SystemSetting> {
  const [newSetting] = await db
    .insert(systemSettings)
    .values(setting)
    .onConflictDoUpdate({
      target: [systemSettings.category, systemSettings.key],
      set: {
        value: setting.value,
        description: setting.description,
        isActive: setting.isActive,
        updatedAt: new Date(),
      },
    })
    .returning();
  return newSetting;
}

export async function getAllSystemSettings(category?: string): Promise<SystemSetting[]> {
  const query = db.select().from(systemSettings);
  if (category) {
    return await query.where(eq(systemSettings.category, category));
  }
  return await query;
}

export async function updateSystemSetting(
  id: string,
  updates: Partial<InsertSystemSetting>
): Promise<SystemSetting | undefined> {
  const [setting] = await db
    .update(systemSettings)
    .set({ ...updates, updatedAt: new Date() })
    .where(eq(systemSettings.id, id))
    .returning();
  return setting;
}

// SQL 실행 함수 (DB Admin용)
export async function executeSQL(query: string): Promise<any> {
  try {
    const result = await db.execute(sql.raw(query));
    return {
      rows: result.rows || [],
      rowCount: result.rowCount || 0,
    };
  } catch (error: any) {
    throw new Error(`SQL 실행 오류: \${error.message}`);
  }
}

// POI (Point of Interest) 시스템 메서드
export async function getPoiCategories(): Promise<PoiCategory[]> {
  return db.query.poiCategories.findMany({
    where: eq(poiCategories.isActive, true),
    orderBy: [asc(poiCategories.sortOrder)],
  });
}

export async function getPoiCategoriesWithTypes(languageCode: string = 'en'): Promise<any[]> {
  const categories = await db.query.poiCategories.findMany({
    where: eq(poiCategories.isActive, true),
    orderBy: [asc(poiCategories.sortOrder)],
    with: {
      types: {
        where: eq(poiTypes.isActive, true),
        orderBy: [asc(poiTypes.sortOrder)],
        with: {
          translations: {
            where: eq(poiTypeTranslations.languageCode, languageCode),
          },
        },
      },
      translations: {
        where: eq(poiCategoryTranslations.languageCode, languageCode),
      },
    },
  });

  return categories.map(cat => ({
    id: cat.id,
    code: cat.code,
    icon: cat.icon,
    isSystem: cat.isSystem,
    name: cat.translations[0]?.name || cat.code,
    description: cat.translations[0]?.description || '',
    types: cat.types.map(type => ({
      id: type.id,
      code: type.code,
      googlePlaceType: type.googlePlaceType,
      icon: type.icon || cat.icon,
      name: type.translations[0]?.name || type.code,
    })),
  }));
}

export async function createPoiCategory(category: InsertPoiCategory): Promise<PoiCategory> {
  const [newCategory] = await db.insert(poiCategories).values(category).returning();
  return newCategory;
}

export async function createPoiType(type: InsertPoiType): Promise<PoiType> {
  const [newType] = await db.insert(poiTypes).values(type).returning();
  return newType;
}

export async function createPoiCategoryTranslation(translation: InsertPoiCategoryTranslation): Promise<PoiCategoryTranslation> {
  const [newTranslation] = await db.insert(poiCategoryTranslations).values(translation).returning();
  return newTranslation;
}

export async function createPoiTypeTranslation(translation: InsertPoiTypeTranslation): Promise<PoiTypeTranslation> {
  const [newTranslation] = await db.insert(poiTypeTranslations).values(translation).returning();
  return newTranslation;
}

export async function bulkInsertPoiCategories(categories: InsertPoiCategory[]): Promise<PoiCategory[]> {
  if (categories.length === 0) return [];
  return db.insert(poiCategories).values(categories).returning();
}

export async function bulkInsertPoiTypes(types: InsertPoiType[]): Promise<PoiType[]> {
  if (types.length === 0) return [];
  return db.insert(poiTypes).values(types).returning();
}

export async function bulkInsertPoiCategoryTranslations(translations: InsertPoiCategoryTranslation[]): Promise<PoiCategoryTranslation[]> {
  if (translations.length === 0) return [];
  return db.insert(poiCategoryTranslations).values(translations).returning();
}

export async function bulkInsertPoiTypeTranslations(translations: InsertPoiTypeTranslation[]): Promise<PoiTypeTranslation[]> {
  if (translations.length === 0) return [];
  return db.insert(poiTypeTranslations).values(translations).returning();
}

export async function getPoiCategoryCount(): Promise<number> {
  const result = await db.select({ count: sql<number>`count(*)` }).from(poiCategories);
  return Number(result[0]?.count || 0);
}

// Translations (DB 기반 i18n)
export async function getTranslationsByNamespace(namespace: string, locale: string): Promise<Record<string, string>> {
  const results = await db
    .select({ key: translations.key, value: translations.value })
    .from(translations)
    .where(and(
      eq(translations.namespace, namespace),
      eq(translations.locale, locale)
    ));
  
  return results.reduce((acc, row) => {
    acc[row.key] = row.value;
    return acc;
  }, {} as Record<string, string>);
}

export async function getAllTranslationsForExport(): Promise<Array<{namespace: string; key: string; locale: string; value: string; is_reviewed: boolean; version: number}>> {
  const results = await db
    .select({
      namespace: translations.namespace,
      key: translations.key,
      locale: translations.locale,
      value: translations.value,
      is_reviewed: translations.isReviewed,
      version: translations.version
    })
    .from(translations)
    .orderBy(translations.namespace, translations.locale, translations.key);
  
  return results.map(r => ({
    namespace: r.namespace,
    key: r.key,
    locale: r.locale,
    value: r.value,
    is_reviewed: r.is_reviewed ?? false,
    version: r.version ?? 1
  }));
}

// System Config (시스템 설정)
export async function getSystemConfigByKey(category: string, key: string): Promise<SystemConfig | undefined> {
  const [config] = await db
    .select()
    .from(systemConfig)
    .where(and(
      eq(systemConfig.category, category),
      eq(systemConfig.key, key),
      eq(systemConfig.isActive, true)
    ));
  return config;
}

export async function getSystemConfigsByCategory(category: string): Promise<SystemConfig[]> {
  return await db
    .select()
    .from(systemConfig)
    .where(and(
      eq(systemConfig.category, category),
      eq(systemConfig.isActive, true)
    ))
    .orderBy(asc(systemConfig.sortOrder), asc(systemConfig.key));
}

export async function getAllSystemConfigs(): Promise<SystemConfig[]> {
  return await db
    .select()
    .from(systemConfig)
    .where(eq(systemConfig.isActive, true))
    .orderBy(asc(systemConfig.category), asc(systemConfig.sortOrder), asc(systemConfig.key));
}

export async function createSystemConfig(config: InsertSystemConfig): Promise<SystemConfig> {
  const [created] = await db
    .insert(systemConfig)
    .values(config)
    .returning();
  return created;
}

export async function updateSystemConfig(id: number, updates: Partial<InsertSystemConfig>, updatedBy?: string): Promise<SystemConfig | undefined> {
  const [updated] = await db
    .update(systemConfig)
    .set({ ...updates, updatedAt: new Date(), updatedBy })
    .where(eq(systemConfig.id, id))
    .returning();
  return updated;
}

export async function deleteSystemConfig(id: number): Promise<boolean> {
  const result = await db
    .update(systemConfig)
    .set({ isActive: false, updatedAt: new Date() })
    .where(eq(systemConfig.id, id));
  return true;
}

// Config Audit Logs (설정 변경 감사 로그)
export async function createConfigAuditLog(log: { configId: number; configKey: string; configCategory: string; action: string; previousValue?: string; newValue?: string; changedBy: string; changedByIp?: string; changeReason?: string }): Promise<ConfigAuditLog> {
  const [created] = await db
    .insert(configAuditLogs)
    .values(log)
    .returning();
  return created;
}

export async function getConfigAuditLogs(configId?: number, limit: number = 100): Promise<ConfigAuditLog[]> {
  if (configId) {
    return await db
      .select()
      .from(configAuditLogs)
      .where(eq(configAuditLogs.configId, configId))
      .orderBy(desc(configAuditLogs.createdAt))
      .limit(limit);
  }
  return await db
    .select()
    .from(configAuditLogs)
    .orderBy(desc(configAuditLogs.createdAt))
    .limit(limit);
}

// User Sessions (유저 세션)
export async function createUserSession(session: Partial<UserSession>): Promise<UserSession> {
  const [created] = await db
    .insert(userSessions)
    .values(session as any)
    .returning();
  return created;
}

export async function updateUserSession(sessionId: string, updates: Partial<UserSession>): Promise<UserSession | undefined> {
  const [updated] = await db
    .update(userSessions)
    .set(updates)
    .where(eq(userSessions.id, sessionId))
    .returning();
  return updated;
}

export async function getUserSession(sessionId: string): Promise<UserSession | undefined> {
  const [session] = await db
    .select()
    .from(userSessions)
    .where(eq(userSessions.id, sessionId));
  return session;
}

// User Events (유저 이벤트)
export async function createUserEvent(event: InsertUserEvent): Promise<UserEvent> {
  const [created] = await db
    .insert(userEvents)
    .values(event)
    .returning();
  return created;
}

export async function getUserEventsBySession(sessionId: string, limit: number = 100): Promise<UserEvent[]> {
  return await db
    .select()
    .from(userEvents)
    .where(eq(userEvents.sessionId, sessionId))
    .orderBy(asc(userEvents.sequenceNumber))
    .limit(limit);
}

// User Daily Metrics (유저 일별 메트릭)
export async function getUserDailyMetrics(userId: string, startDate: Date, endDate: Date): Promise<UserDailyMetric[]> {
  return await db
    .select()
    .from(userDailyMetrics)
    .where(and(
      eq(userDailyMetrics.userId, userId),
      gte(userDailyMetrics.metricDate, startDate),
      lte(userDailyMetrics.metricDate, endDate)
    ))
    .orderBy(asc(userDailyMetrics.metricDate));
}

export async function upsertUserDailyMetric(userId: string, date: Date, updates: Partial<UserDailyMetric>): Promise<UserDailyMetric> {
  // 먼저 기존 레코드 확인
  const startOfDay = new Date(date);
  startOfDay.setHours(0, 0, 0, 0);
  
  const [existing] = await db
    .select()
    .from(userDailyMetrics)
    .where(and(
      eq(userDailyMetrics.userId, userId),
      eq(userDailyMetrics.metricDate, startOfDay)
    ));
  
  if (existing) {
    const [updated] = await db
      .update(userDailyMetrics)
      .set({ ...updates, updatedAt: new Date() })
      .where(eq(userDailyMetrics.id, existing.id))
      .returning();
    return updated;
  }
  
  const [created] = await db
    .insert(userDailyMetrics)
    .values({ userId, metricDate: startOfDay, ...updates } as any)
    .returning();
  return created;
}
