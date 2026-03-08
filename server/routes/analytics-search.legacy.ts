// 분석·검색 라우터 — 관리자용 Analytics Data Warehouse ETL(전체/일별), 일별·거래·예약·대시보드 지표 조회, 차원 동기화, 그리고 콘텐츠/위치 검색 API를 담당한다.
import type { Express } from 'express';
import type { Request, Response } from 'express';
import type { AuthRequest } from '../auth';

export function registerLegacyAnalyticsSearchRoutes(
  app: Express,
  deps: { storage: any; authenticateToken: any; authenticateHybrid: any; requireAdmin: any }
) {
  const { storage, authenticateToken, authenticateHybrid, requireAdmin } = deps;

  // Analytics Data Warehouse API (Phase 15)
  // =====================================================

  // ETL 전체 실행 (초기화용)
  app.post('/api/admin/analytics/etl/full', authenticateHybrid, requireAdmin, async (req: AuthRequest, res: Response) => {
    try {
      const { runFullETL } = await import('../services/analyticsETLService');
      
      const startDate = req.body.startDate ? new Date(req.body.startDate) : new Date(Date.now() - 90 * 24 * 60 * 60 * 1000);
      const endDate = req.body.endDate ? new Date(req.body.endDate) : new Date();
      
      const result = await runFullETL(startDate, endDate);
      
      res.json({
        success: true,
        message: 'Full ETL completed',
        result,
      });
    } catch (error) {
      console.error('Error running full ETL:', error);
      res.status(500).json({ message: 'Failed to run full ETL' });
    }
  });

  // 일별 ETL 실행
  app.post('/api/admin/analytics/etl/daily', authenticateHybrid, requireAdmin, async (req: AuthRequest, res: Response) => {
    try {
      const { runDailyETL } = await import('../services/analyticsETLService');
      const result = await runDailyETL();
      
      res.json({
        success: true,
        message: 'Daily ETL completed',
        result,
      });
    } catch (error) {
      console.error('Error running daily ETL:', error);
      res.status(500).json({ message: 'Failed to run daily ETL' });
    }
  });

  // 일별 메트릭 조회
  app.get('/api/admin/analytics/daily-metrics', authenticateHybrid, requireAdmin, async (req: AuthRequest, res: Response) => {
    try {
      const { factDailyMetrics } = await import('@shared/schema');
      const { db } = await import('../db');
      const { desc } = await import('drizzle-orm');
      
      const limit = parseInt(req.query.limit as string) || 30;
      
      const metrics = await db.select()
        .from(factDailyMetrics)
        .orderBy(desc(factDailyMetrics.dateKey))
        .limit(limit);
      
      res.json({ metrics });
    } catch (error) {
      console.error('Error fetching daily metrics:', error);
      res.status(500).json({ message: 'Failed to fetch metrics' });
    }
  });

  // 거래 팩트 조회
  app.get('/api/admin/analytics/transactions', authenticateHybrid, requireAdmin, async (req: AuthRequest, res: Response) => {
    try {
      const { factTransactions } = await import('@shared/schema');
      const { db } = await import('../db');
      const { desc, eq, gte, lte, and } = await import('drizzle-orm');
      
      const limit = parseInt(req.query.limit as string) || 100;
      const transactionType = req.query.type as string;
      const startDate = req.query.startDate ? parseInt(req.query.startDate as string) : null;
      const endDate = req.query.endDate ? parseInt(req.query.endDate as string) : null;
      
      let query = db.select().from(factTransactions);
      
      const conditions = [];
      if (transactionType) {
        conditions.push(eq(factTransactions.transactionType, transactionType));
      }
      if (startDate) {
        conditions.push(gte(factTransactions.dateKey, startDate));
      }
      if (endDate) {
        conditions.push(lte(factTransactions.dateKey, endDate));
      }
      
      if (conditions.length > 0) {
        query = query.where(and(...conditions)) as any;
      }
      
      const transactions = await query
        .orderBy(desc(factTransactions.createdAt))
        .limit(limit);
      
      res.json({ transactions });
    } catch (error) {
      console.error('Error fetching transactions:', error);
      res.status(500).json({ message: 'Failed to fetch transactions' });
    }
  });

  // 예약 팩트 조회
  app.get('/api/admin/analytics/bookings', authenticateHybrid, requireAdmin, async (req: AuthRequest, res: Response) => {
    try {
      const { factBookings } = await import('@shared/schema');
      const { db } = await import('../db');
      const { desc, eq, gte, lte, and } = await import('drizzle-orm');
      
      const limit = parseInt(req.query.limit as string) || 100;
      const status = req.query.status as string;
      const startDate = req.query.startDate ? parseInt(req.query.startDate as string) : null;
      const endDate = req.query.endDate ? parseInt(req.query.endDate as string) : null;
      
      let query = db.select().from(factBookings);
      
      const conditions = [];
      if (status) {
        conditions.push(eq(factBookings.bookingStatus, status));
      }
      if (startDate) {
        conditions.push(gte(factBookings.dateKey, startDate));
      }
      if (endDate) {
        conditions.push(lte(factBookings.dateKey, endDate));
      }
      
      if (conditions.length > 0) {
        query = query.where(and(...conditions)) as any;
      }
      
      const bookings = await query
        .orderBy(desc(factBookings.createdAt))
        .limit(limit);
      
      res.json({ bookings });
    } catch (error) {
      console.error('Error fetching bookings:', error);
      res.status(500).json({ message: 'Failed to fetch bookings' });
    }
  });

  // 대시보드 요약 조회
  app.get('/api/admin/analytics/dashboard', authenticateHybrid, requireAdmin, async (req: AuthRequest, res: Response) => {
    try {
      const { factDailyMetrics, dimUsers, factTransactions, factBookings } = await import('@shared/schema');
      const { db } = await import('../db');
      const { desc, sql, count, sum, eq, gte } = await import('drizzle-orm');
      
      const last7Days = await db.select()
        .from(factDailyMetrics)
        .orderBy(desc(factDailyMetrics.dateKey))
        .limit(7);
      
      const last30Days = await db.select()
        .from(factDailyMetrics)
        .orderBy(desc(factDailyMetrics.dateKey))
        .limit(30);
      
      const totalUsers = await db.select({ count: count() })
        .from(dimUsers)
        .where(eq(dimUsers.isCurrent, true));
      
      const totalGMV = last30Days.reduce((sum, m) => sum + parseFloat(m.gmv || '0'), 0);
      const totalBookings = last30Days.reduce((sum, m) => sum + (m.newBookingCount || 0), 0);
      const avgDAU = last7Days.reduce((sum, m) => sum + (m.dauCount || 0), 0) / 7;
      
      res.json({
        summary: {
          totalUsers: totalUsers[0]?.count || 0,
          avgDAU: Math.round(avgDAU),
          last30DaysGMV: totalGMV,
          last30DaysBookings: totalBookings,
        },
        last7Days,
        trends: {
          newUsers: last7Days.map(m => ({ date: m.metricDate, value: m.newUserCount })),
          bookings: last7Days.map(m => ({ date: m.metricDate, value: m.newBookingCount })),
          gmv: last7Days.map(m => ({ date: m.metricDate, value: parseFloat(m.gmv || '0') })),
        },
      });
    } catch (error) {
      console.error('Error fetching dashboard:', error);
      res.status(500).json({ message: 'Failed to fetch dashboard' });
    }
  });

  // 차원 테이블 동기화
  app.post('/api/admin/analytics/sync-dimensions', authenticateHybrid, requireAdmin, async (req: AuthRequest, res: Response) => {
    try {
      const { 
        generateDateDimension, 
        syncUserDimension, 
        syncLocationDimension, 
        syncServiceTypeDimension 
      } = await import('../services/analyticsETLService');
      
      const currentYear = new Date().getFullYear();
      const dateResult = await generateDateDimension(currentYear, currentYear + 1);
      const userResult = await syncUserDimension();
      const locationResult = await syncLocationDimension();
      const serviceTypeResult = await syncServiceTypeDimension();
      
      res.json({
        success: true,
        message: 'Dimensions synchronized',
        result: {
          datesGenerated: dateResult.generated,
          usersSynced: userResult.synced,
          usersUpdated: userResult.updated,
          locationsSynced: locationResult.synced,
          serviceTypesSynced: serviceTypeResult.synced,
        },
      });
    } catch (error) {
      console.error('Error syncing dimensions:', error);
      res.status(500).json({ message: 'Failed to sync dimensions' });
    }
  });

  // 분쟁 분석 조회
  app.get('/api/admin/analytics/disputes', authenticateHybrid, requireAdmin, async (req: AuthRequest, res: Response) => {
    try {
      const { factDisputes } = await import('@shared/schema');
      const { db } = await import('../db');
      const { desc, eq, sql } = await import('drizzle-orm');
      
      const limit = parseInt(req.query.limit as string) || 100;
      
      const disputes = await db.select()
        .from(factDisputes)
        .orderBy(desc(factDisputes.createdAt))
        .limit(limit);
      
      const byType = await db.select({
        disputeType: factDisputes.disputeType,
        count: sql<number>`count(*)::int`,
        totalAmount: sql<string>`COALESCE(sum(${factDisputes.disputedAmount}), 0)`,
        avgResolutionDays: sql<number>`COALESCE(avg(${factDisputes.resolutionTimeDays}), 0)::int`,
      })
        .from(factDisputes)
        .groupBy(factDisputes.disputeType);
      
      res.json({ disputes, byType });
    } catch (error) {
      console.error('Error fetching dispute analytics:', error);
      res.status(500).json({ message: 'Failed to fetch dispute analytics' });
    }
  });

  // =====================================================
  // 검색 API (Search API)
  // =====================================================
  // 포스트 및 체험(Experience) 검색 - ILIKE 패턴 매칭

  // 포스트 검색
  // GET /api/search/posts?term=검색어&location=위치&limit=20&offset=0
  app.get('/api/search/posts', async (req: Request, res: Response) => {
    try {
      const term = req.query.term as string;
      const location = req.query.location as string | undefined;
      const limit = parseInt(req.query.limit as string) || 20;
      const offset = parseInt(req.query.offset as string) || 0;

      if (!term || term.trim().length === 0) {
        return res.status(400).json({ error: 'Search term is required' });
      }

      if (term.trim().length < 2) {
        return res.status(400).json({ error: 'Search term must be at least 2 characters' });
      }

      const posts = await storage.searchPosts(term.trim(), { location, limit, offset });
      
      res.json({
        results: posts,
        term: term.trim(),
        count: posts.length,
        limit,
        offset,
      });
    } catch (error) {
      console.error('포스트 검색 오류:', error);
      res.status(500).json({ error: 'Failed to search posts' });
    }
  });

  // 체험(Experience) 검색
  // GET /api/search/experiences?term=검색어&category=카테고리&location=위치&limit=20&offset=0
  app.get('/api/search/experiences', async (req: Request, res: Response) => {
    try {
      const term = req.query.term as string;
      const category = req.query.category as string | undefined;
      const location = req.query.location as string | undefined;
      const limit = parseInt(req.query.limit as string) || 20;
      const offset = parseInt(req.query.offset as string) || 0;

      if (!term || term.trim().length === 0) {
        return res.status(400).json({ error: 'Search term is required' });
      }

      if (term.trim().length < 2) {
        return res.status(400).json({ error: 'Search term must be at least 2 characters' });
      }

      const experiences = await storage.searchExperiences(term.trim(), { category, location, limit, offset });
      
      res.json({
        results: experiences,
        term: term.trim(),
        count: experiences.length,
        limit,
        offset,
      });
    } catch (error) {
      console.error('체험 검색 오류:', error);
      res.status(500).json({ error: 'Failed to search experiences' });
    }
  });

  // 통합 검색 (포스트 + 체험)
  // GET /api/search?term=검색어&type=all|posts|experiences&limit=10&offset=0
  app.get('/api/search', async (req: Request, res: Response) => {
    try {
      const term = req.query.term as string;
      const type = (req.query.type as string) || 'all';
      const limit = parseInt(req.query.limit as string) || 10;
      const offset = parseInt(req.query.offset as string) || 0;

      if (!term || term.trim().length === 0) {
        return res.status(400).json({ error: 'Search term is required' });
      }

      if (term.trim().length < 2) {
        return res.status(400).json({ error: 'Search term must be at least 2 characters' });
      }

      const results: { posts?: any[]; experiences?: any[] } = {};

      // 타입에 따라 검색 수행
      if (type === 'all' || type === 'posts') {
        results.posts = await storage.searchPosts(term.trim(), { limit, offset });
      }

      if (type === 'all' || type === 'experiences') {
        results.experiences = await storage.searchExperiences(term.trim(), { limit, offset });
      }

      res.json({
        term: term.trim(),
        type,
        ...results,
      });
    } catch (error) {
      console.error('통합 검색 오류:', error);
      res.status(500).json({ error: 'Failed to search' });
    }
  });

}
