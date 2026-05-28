// 신고 API 라우터 — 신고 접수 + 관리자 처리 (D 카테고리 신고 시스템 구현)
import { Router, Response } from 'express';
import { authenticateHybrid, requireAdmin, type AuthRequest } from '../auth';
import { db } from '../db';
import { reports, insertReportSchema } from '@shared/schema';
import { eq, desc, and } from 'drizzle-orm';
import { z } from 'zod';

const router = Router();

// 신고 접수 (인증된 사용자)
router.post('/', authenticateHybrid, async (req: AuthRequest, res: Response) => {
  try {
    if (!req.user?.id) return res.status(401).json({ message: 'Unauthorized' });
    const parsed = insertReportSchema.parse({ ...req.body, reporterId: req.user.id });
    const inserted = await db.insert(reports).values(parsed).returning();
    const created = inserted[0];
    if (!created) return res.status(500).json({ message: 'Failed to create report' });
    console.log(`[Reports] 신고 접수: id=${created.id} reporter=${req.user.id} target=${parsed.targetType}/${parsed.targetId}`);
    res.status(201).json({ success: true, report: created });
  } catch (err: any) {
    if (err instanceof z.ZodError) return res.status(400).json({ message: 'Invalid input', errors: err.errors });
    console.error('[Reports] 접수 오류:', err);
    res.status(500).json({ message: 'Failed to create report' });
  }
});

// 본인이 작성한 신고 목록
router.get('/mine', authenticateHybrid, async (req: AuthRequest, res: Response) => {
  try {
    if (!req.user?.id) return res.status(401).json({ message: 'Unauthorized' });
    const rows = await db.select().from(reports).where(eq(reports.reporterId, req.user.id)).orderBy(desc(reports.createdAt));
    res.json(rows);
  } catch (err) {
    console.error('[Reports] 조회 오류:', err);
    res.status(500).json({ message: 'Failed to fetch reports' });
  }
});

// 관리자: 전체 신고 목록
router.get('/admin/all', authenticateHybrid, requireAdmin, async (req: AuthRequest, res: Response) => {
  try {
    const status = req.query.status as string | undefined;
    const rows = status && status.length > 0
      ? await db.select().from(reports).where(eq(reports.status, status)).orderBy(desc(reports.createdAt))
      : await db.select().from(reports).orderBy(desc(reports.createdAt));
    res.json(rows);
  } catch (err) {
    console.error('[Reports] 관리자 조회 오류:', err);
    res.status(500).json({ message: 'Failed to fetch reports' });
  }
});

// 관리자: 신고 상태 변경
router.patch('/admin/:id', authenticateHybrid, requireAdmin, async (req: AuthRequest, res: Response) => {
  try {
    const id = parseInt(req.params.id || '0', 10);
    if (!id) return res.status(400).json({ message: 'Invalid id' });
    const { status, adminNote } = req.body;
    if (!['pending', 'reviewing', 'resolved', 'dismissed'].includes(status)) {
      return res.status(400).json({ message: 'Invalid status' });
    }
    const updateData: any = { status, adminNote, adminId: req.user!.id };
    if (status === 'resolved' || status === 'dismissed') updateData.resolvedAt = new Date();
    const [updated] = await db.update(reports).set(updateData).where(eq(reports.id, id)).returning();
    if (!updated) return res.status(404).json({ message: 'Report not found' });
    console.log(`[Reports] 처리: id=${id} status=${status} admin=${req.user!.id}`);
    res.json(updated);
  } catch (err) {
    console.error('[Reports] 처리 오류:', err);
    res.status(500).json({ message: 'Failed to update report' });
  }
});

export default router;
