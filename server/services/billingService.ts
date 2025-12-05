import { storage } from '../storage';
import type { InsertBillingPlan } from '@shared/schema';

const BILLING_PLANS: InsertBillingPlan[] = [
  // =====================================================
  // 여행자용 플랜 (Traveler Plans) - USD Pricing
  // =====================================================
  
  // Free 플랜 (기본)
  {
    id: 'traveler_free',
    name: 'Free',
    nameKo: '무료',
    nameJa: '無料',
    nameZh: '免费',
    nameFr: 'Gratuit',
    nameEs: 'Gratis',
    description: 'Basic features for casual travelers',
    descriptionKo: '가벼운 여행자를 위한 기본 기능',
    target: 'traveler',
    type: 'subscription',
    priceMonthlyUsd: '0',
    priceUsd: null,
    features: {
      ai_messages: 30,
      ai_messages_period: 'monthly',
      dm_translations: 50,
      dm_translations_period: 'monthly',
      mini_concierge: 5,
      mini_concierge_period: 'monthly',
      full_concierge: 0,
      cinemap_export: 1,
      cinemap_export_period: 'monthly',
      priority_matching: false,
      analytics: false,
      verified_badge: false
    },
    isActive: true,
    sortOrder: 1
  },
  
  // Explorer 플랜 (월간)
  {
    id: 'traveler_explorer_monthly',
    name: 'Explorer',
    nameKo: '익스플로러',
    nameJa: 'エクスプローラー',
    nameZh: '探索者',
    nameFr: 'Explorateur',
    nameEs: 'Explorador',
    description: 'Enhanced features for active travelers',
    descriptionKo: '활동적인 여행자를 위한 향상된 기능',
    target: 'traveler',
    type: 'subscription',
    priceMonthlyUsd: '14.99',
    priceUsd: null,
    features: {
      ai_messages: 100,
      ai_messages_period: 'monthly',
      dm_translations: 200,
      dm_translations_period: 'monthly',
      mini_concierge: 30,
      mini_concierge_period: 'monthly',
      full_concierge: 5,
      full_concierge_period: 'monthly',
      cinemap_export: 5,
      cinemap_export_period: 'monthly',
      priority_matching: true,
      analytics: false,
      verified_badge: false,
      billing_period: 'monthly'
    },
    isActive: true,
    sortOrder: 2
  },
  
  // Explorer 플랜 (연간)
  {
    id: 'traveler_explorer_yearly',
    name: 'Explorer (Yearly)',
    nameKo: '익스플로러 (연간)',
    nameJa: 'エクスプローラー (年間)',
    nameZh: '探索者 (年度)',
    nameFr: 'Explorateur (Annuel)',
    nameEs: 'Explorador (Anual)',
    description: 'Enhanced features for active travelers - yearly billing (17% off)',
    descriptionKo: '활동적인 여행자를 위한 향상된 기능 - 연간 결제 (17% 할인)',
    target: 'traveler',
    type: 'subscription',
    priceMonthlyUsd: null,
    priceUsd: '149.99',
    features: {
      ai_messages: 100,
      ai_messages_period: 'monthly',
      dm_translations: 200,
      dm_translations_period: 'monthly',
      mini_concierge: 30,
      mini_concierge_period: 'monthly',
      full_concierge: 5,
      full_concierge_period: 'monthly',
      cinemap_export: 5,
      cinemap_export_period: 'monthly',
      priority_matching: true,
      analytics: false,
      verified_badge: false,
      billing_period: 'yearly',
      discount_percent: 17
    },
    isActive: true,
    sortOrder: 3
  },
  
  // Voyager 플랜 (월간)
  {
    id: 'traveler_voyager_monthly',
    name: 'Voyager',
    nameKo: '보이저',
    nameJa: 'ボイジャー',
    nameZh: '旅行家',
    nameFr: 'Voyageur',
    nameEs: 'Viajero',
    description: 'Unlimited features for power travelers',
    descriptionKo: '파워 여행자를 위한 무제한 기능',
    target: 'traveler',
    type: 'subscription',
    priceMonthlyUsd: '29.99',
    priceUsd: null,
    features: {
      ai_messages: -1,
      ai_messages_period: 'unlimited',
      dm_translations: -1,
      dm_translations_period: 'unlimited',
      mini_concierge: -1,
      mini_concierge_period: 'unlimited',
      full_concierge: 20,
      full_concierge_period: 'monthly',
      cinemap_export: -1,
      cinemap_export_period: 'unlimited',
      priority_matching: true,
      analytics: true,
      verified_badge: true,
      billing_period: 'monthly'
    },
    isActive: true,
    sortOrder: 4
  },
  
  // Voyager 플랜 (연간)
  {
    id: 'traveler_voyager_yearly',
    name: 'Voyager (Yearly)',
    nameKo: '보이저 (연간)',
    nameJa: 'ボイジャー (年間)',
    nameZh: '旅行家 (年度)',
    nameFr: 'Voyageur (Annuel)',
    nameEs: 'Viajero (Anual)',
    description: 'Unlimited features for power travelers - yearly billing (17% off)',
    descriptionKo: '파워 여행자를 위한 무제한 기능 - 연간 결제 (17% 할인)',
    target: 'traveler',
    type: 'subscription',
    priceMonthlyUsd: null,
    priceUsd: '249.99',
    features: {
      ai_messages: -1,
      ai_messages_period: 'unlimited',
      dm_translations: -1,
      dm_translations_period: 'unlimited',
      mini_concierge: -1,
      mini_concierge_period: 'unlimited',
      full_concierge: 20,
      full_concierge_period: 'monthly',
      cinemap_export: -1,
      cinemap_export_period: 'unlimited',
      priority_matching: true,
      analytics: true,
      verified_badge: true,
      billing_period: 'yearly',
      discount_percent: 17
    },
    isActive: true,
    sortOrder: 5
  },
  
  // Trip Pass (1일권)
  {
    id: 'trip_pass_1day',
    name: '1-Day Pass',
    nameKo: '1일권',
    nameJa: '1日パス',
    nameZh: '1日通票',
    nameFr: 'Pass 1 Jour',
    nameEs: 'Pase 1 Día',
    description: 'Full AI features for 24 hours',
    descriptionKo: '24시간 전체 AI 기능 이용',
    target: 'traveler',
    type: 'one_time',
    priceMonthlyUsd: null,
    priceUsd: '4.99',
    features: {
      duration_days: 1,
      ai_messages: 50,
      dm_translations: 100,
      full_concierge: 3
    },
    isActive: true,
    sortOrder: 10
  },
  
  // Trip Pass (3일권)
  {
    id: 'trip_pass_3day',
    name: '3-Day Pass',
    nameKo: '3일권',
    nameJa: '3日パス',
    nameZh: '3日通票',
    nameFr: 'Pass 3 Jours',
    nameEs: 'Pase 3 Días',
    description: 'Full AI features for 72 hours - 30% savings',
    descriptionKo: '72시간 전체 AI 기능 이용 - 30% 할인',
    target: 'traveler',
    type: 'one_time',
    priceMonthlyUsd: null,
    priceUsd: '9.99',
    features: {
      duration_days: 3,
      ai_messages: 150,
      dm_translations: 300,
      full_concierge: 10,
      discount_percent: 30
    },
    isActive: true,
    sortOrder: 11
  },
  
  // Trip Pass (7일권)
  {
    id: 'trip_pass_7day',
    name: '7-Day Pass',
    nameKo: '7일권',
    nameJa: '7日パス',
    nameZh: '7日通票',
    nameFr: 'Pass 7 Jours',
    nameEs: 'Pase 7 Días',
    description: 'Full AI features for 1 week - 45% savings',
    descriptionKo: '1주일 전체 AI 기능 이용 - 45% 할인',
    target: 'traveler',
    type: 'one_time',
    priceMonthlyUsd: null,
    priceUsd: '19.99',
    features: {
      duration_days: 7,
      ai_messages: 400,
      dm_translations: 700,
      full_concierge: 25,
      discount_percent: 45
    },
    isActive: true,
    sortOrder: 12
  },

  // =====================================================
  // 호스트용 플랜 (Host Plans) - USD Pricing
  // =====================================================
  
  // Host Free 플랜
  {
    id: 'host_free',
    name: 'Host Free',
    nameKo: '호스트 무료',
    nameJa: 'ホスト無料',
    nameZh: '主人免费',
    nameFr: 'Hôte Gratuit',
    nameEs: 'Anfitrión Gratis',
    description: 'Basic features for new hosts',
    descriptionKo: '새로운 호스트를 위한 기본 기능',
    target: 'host',
    type: 'subscription',
    priceMonthlyUsd: '0',
    priceUsd: null,
    features: {
      service_listings: 3,
      platform_commission: 15,
      dm_translations: 50,
      dm_translations_period: 'monthly',
      priority_visibility: false,
      analytics_dashboard: false,
      verified_host_badge: false,
      instant_payout: false
    },
    isActive: true,
    sortOrder: 20
  },
  
  // Host Pro 플랜 (월간)
  {
    id: 'host_pro_monthly',
    name: 'Host Pro',
    nameKo: '호스트 프로',
    nameJa: 'ホストプロ',
    nameZh: '专业主人',
    nameFr: 'Hôte Pro',
    nameEs: 'Anfitrión Pro',
    description: 'Enhanced features for professional hosts',
    descriptionKo: '전문 호스트를 위한 향상된 기능',
    target: 'host',
    type: 'subscription',
    priceMonthlyUsd: '19.99',
    priceUsd: null,
    features: {
      service_listings: 15,
      platform_commission: 10,
      dm_translations: 300,
      dm_translations_period: 'monthly',
      priority_visibility: true,
      analytics_dashboard: true,
      verified_host_badge: true,
      instant_payout: false,
      billing_period: 'monthly'
    },
    isActive: true,
    sortOrder: 21
  },
  
  // Host Pro 플랜 (연간)
  {
    id: 'host_pro_yearly',
    name: 'Host Pro (Yearly)',
    nameKo: '호스트 프로 (연간)',
    nameJa: 'ホストプロ (年間)',
    nameZh: '专业主人 (年度)',
    nameFr: 'Hôte Pro (Annuel)',
    nameEs: 'Anfitrión Pro (Anual)',
    description: 'Enhanced features for professional hosts - yearly billing (17% off)',
    descriptionKo: '전문 호스트를 위한 향상된 기능 - 연간 결제 (17% 할인)',
    target: 'host',
    type: 'subscription',
    priceMonthlyUsd: null,
    priceUsd: '199.99',
    features: {
      service_listings: 15,
      platform_commission: 10,
      dm_translations: 300,
      dm_translations_period: 'monthly',
      priority_visibility: true,
      analytics_dashboard: true,
      verified_host_badge: true,
      instant_payout: false,
      billing_period: 'yearly',
      discount_percent: 17
    },
    isActive: true,
    sortOrder: 22
  },
  
  // Host Business 플랜 (월간)
  {
    id: 'host_business_monthly',
    name: 'Host Business',
    nameKo: '호스트 비즈니스',
    nameJa: 'ホストビジネス',
    nameZh: '商务主人',
    nameFr: 'Hôte Business',
    nameEs: 'Anfitrión Business',
    description: 'Premium features for business hosts',
    descriptionKo: '비즈니스 호스트를 위한 프리미엄 기능',
    target: 'host',
    type: 'subscription',
    priceMonthlyUsd: '49.99',
    priceUsd: null,
    features: {
      service_listings: -1,
      platform_commission: 7,
      dm_translations: -1,
      dm_translations_period: 'unlimited',
      priority_visibility: true,
      analytics_dashboard: true,
      verified_host_badge: true,
      instant_payout: true,
      dedicated_support: true,
      billing_period: 'monthly'
    },
    isActive: true,
    sortOrder: 23
  },
  
  // Host Business 플랜 (연간)
  {
    id: 'host_business_yearly',
    name: 'Host Business (Yearly)',
    nameKo: '호스트 비즈니스 (연간)',
    nameJa: 'ホストビジネス (年間)',
    nameZh: '商务主人 (年度)',
    nameFr: 'Hôte Business (Annuel)',
    nameEs: 'Anfitrión Business (Anual)',
    description: 'Premium features for business hosts - yearly billing (17% off)',
    descriptionKo: '비즈니스 호스트를 위한 프리미엄 기능 - 연간 결제 (17% 할인)',
    target: 'host',
    type: 'subscription',
    priceMonthlyUsd: null,
    priceUsd: '499.99',
    features: {
      service_listings: -1,
      platform_commission: 7,
      dm_translations: -1,
      dm_translations_period: 'unlimited',
      priority_visibility: true,
      analytics_dashboard: true,
      verified_host_badge: true,
      instant_payout: true,
      dedicated_support: true,
      billing_period: 'yearly',
      discount_percent: 17
    },
    isActive: true,
    sortOrder: 24
  }
];

export async function seedBillingPlans(): Promise<{ created: number; skipped: number; updated: number }> {
  let created = 0;
  let skipped = 0;
  let updated = 0;
  
  for (const plan of BILLING_PLANS) {
    const existing = await storage.getBillingPlanById(plan.id);
    if (existing) {
      // Update existing plan with new USD prices
      await storage.updateBillingPlan(plan.id, {
        priceMonthlyUsd: plan.priceMonthlyUsd,
        priceUsd: plan.priceUsd,
      });
      console.log(`[Billing Seed] Updated plan with USD pricing: ${plan.id}`);
      updated++;
      continue;
    }
    
    await storage.createBillingPlan(plan);
    console.log(`[Billing Seed] Created plan: ${plan.id}`);
    created++;
  }
  
  console.log(`[Billing Seed] Complete: ${created} created, ${updated} updated, ${skipped} skipped`);
  return { created, skipped, updated };
}

export function getBillingPlanDefinitions(): InsertBillingPlan[] {
  return BILLING_PLANS;
}
