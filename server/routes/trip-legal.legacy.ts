// 여행 일정·법무 라우터 — 여행 플랜(TripPlan) 생성·조회·수정·삭제, 타임라인 항목 관리, 여행 관련 법적 문서(TripLegal) 조회 엔드포인트를 담당한다.
import type { Express } from 'express';

export function registerLegacyTripLegalRoutes(
  app: Express,
  deps: { storage: any; authenticateToken: any; apiLimiter: any; requireAdmin: any }
) {
  const { storage, authenticateToken, apiLimiter, requireAdmin } = deps;

  // 여행 일정 복제 API
  app.post('/api/trips/:id/clone', authenticateToken, apiLimiter, async (req: any, res) => {
    try {
      const userId = req.user!.id;
      const tripId = parseInt(req.params.id);
      const { days } = req.query; // days=1-3,5 형식
      
      if (isNaN(tripId)) {
        return res.status(400).json({ message: '올바른 여행 ID를 입력해주세요' });
      }

      // 원본 여행 정보 가져오기
      const originalTrip = await storage.getTripById(tripId);
      if (!originalTrip) {
        return res.status(404).json({ message: '여행을 찾을 수 없습니다' });
      }

      // 선택한 일자 파싱 (예: "1-3,5" → [1,2,3,5])
      let selectedDays: number[] = [];
      if (days) {
        const dayParts = (days as string).split(',');
        for (const part of dayParts) {
          if (part.includes('-')) {
            const [start, end] = part.split('-').map(Number);
            if (start && end) {
              for (let i = start; i <= end; i++) {
                selectedDays.push(i);
              }
            }
          } else {
            selectedDays.push(parseInt(part));
          }
        }
      }

      const clonedTrip = await storage.cloneTrip(tripId, userId, selectedDays);
      
      res.status(201).json({
        message: '일정이 성공적으로 복제되었습니다',
        trip: clonedTrip
      });
    } catch (error) {
      console.error('여행 복제 오류:', error);
      res.status(500).json({ message: '일정 복제에 실패했습니다' });
    }
  });

  // 법적 문서 편집 API (관리자 전용)
  app.put('/api/legal/:documentType', authenticateToken, requireAdmin, async (req: AuthRequest, res) => {
    try {
      const { documentType } = req.params;
      const { content } = req.body;

      if (!content || typeof content !== 'string') {
        return res.status(400).json({ message: '올바른 내용을 입력해주세요.' });
      }

      const validDocuments = {
        'privacy': 'privacy_ko.md',
        'terms': 'terms_ko.md', 
        'location': 'location_terms_ko.md',
        'cookies': 'cookie_notice_ko.md',
        'oss': 'oss_licenses_ko.md'
      };

      if (!validDocuments[documentType as keyof typeof validDocuments]) {
        return res.status(400).json({ message: '유효하지 않은 문서 타입입니다.' });
      }

      const fileName = validDocuments[documentType as keyof typeof validDocuments];
      const filePath = path.join(process.cwd(), 'client', 'public', 'legal', fileName);

      // 디렉토리가 존재하지 않으면 생성
      const dir = path.dirname(filePath);
      if (!fs.existsSync(dir)) {
        fs.mkdirSync(dir, { recursive: true });
      }

      // 백업 파일 생성
      if (fs.existsSync(filePath)) {
        const backupPath = filePath + `.backup.${Date.now()}`;
        fs.copyFileSync(filePath, backupPath);
      }

      // 새 내용 저장
      fs.writeFileSync(filePath, content, 'utf8');

      console.log(`✅ 법적 문서 업데이트 완료: ${documentType} by ${req.user?.email}`);

      res.json({ 
        message: '문서가 성공적으로 업데이트되었습니다.',
        documentType,
        updatedAt: new Date().toISOString()
      });

    } catch (error) {
      console.error('❌ 법적 문서 저장 실패:', error);
      res.status(500).json({ message: '문서 저장 중 오류가 발생했습니다.' });
    }
  });
}
