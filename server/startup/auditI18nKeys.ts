// i18n 키 감사 — 서버 시작 시 프론트엔드 코드의 t() 키와 DB를 비교하여 누락 키 경고를 출력한다 (논블로킹, 운영·개발 모두 실행).
import { auditI18nKeys } from '../services/i18nAuditService';

export async function runI18nAudit(): Promise<void> {
  try {
    const result = await auditI18nKeys();

    if (result.missingKeys.length === 0) {
      console.log('[i18n Audit] ✅ 모든 번역 키 정상 (코드 키: ' + result.totalCodeKeys + '개, DB 키: ' + result.totalDbKeys + '개)');
      return;
    }

    const totalMissing = result.missingKeys.reduce((sum, m) => sum + m.missingLocales.length, 0);
    console.log(`[i18n Audit] ⚠️ ${result.missingKeys.length}개 키에서 ${totalMissing}개 번역 누락 발견`);

    const fullyMissing = result.missingKeys.filter(m => m.missingLocales.length === 6);
    if (fullyMissing.length > 0) {
      const sample = fullyMissing.slice(0, 5).map(m => `${m.namespace}::${m.key}`).join(', ');
      const more = fullyMissing.length > 5 ? ` 외 ${fullyMissing.length - 5}개` : '';
      console.log(`[i18n Audit]   완전 누락: ${sample}${more}`);
    }

    console.log('[i18n Audit] 💡 수정: 관리자 페이지 > 시스템 > "번역 키 동기화" 버튼 또는 node scripts/i18n-sync.mjs 실행');
  } catch (err) {
    console.error('[i18n Audit] 감사 실행 오류 (무시):', (err as Error).message);
  }
}
