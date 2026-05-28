// 계약 전자서명 HMAC 서비스 — contract_signatures 테이블에 위변조 방지 해시 + 감사 메타데이터 저장
import crypto from 'crypto';
import { db } from '../db';
import { contractSignatures } from '@shared/schema';
import { eq } from 'drizzle-orm';

const SIG_SECRET = process.env.SIG_SECRET || process.env.JWT_SECRET || process.env.SESSION_SECRET || '';
if (!SIG_SECRET) {
  if (process.env.NODE_ENV === 'production') {
    throw new Error('[signatureService] SIG_SECRET (or JWT_SECRET/SESSION_SECRET) must be set in production');
  }
  console.warn('[signatureService] ⚠️ SIG_SECRET 미설정 — 개발 환경 폴백 키 사용 (운영 배포 시 반드시 설정)');
}
const EFFECTIVE_SIG_SECRET = SIG_SECRET || 'dev-only-fallback-sig-secret';

export interface SignatureMeta {
  ipAddress?: string;
  userAgent?: string;
  signedTermsSnapshot?: string;
}

// 서명 해시 생성: HMAC-SHA256(secret, "contractId|signerId|role|terms|timestamp")
function computeSignatureHash(contractId: number, signerId: string, role: string, terms: string, timestamp: number): string {
  const payload = `${contractId}|${signerId}|${role}|${terms}|${timestamp}`;
  return crypto.createHmac('sha256', EFFECTIVE_SIG_SECRET).update(payload).digest('hex');
}

export async function signContract(
  contractId: number,
  signerId: string,
  signerRole: 'guide' | 'traveler',
  meta: SignatureMeta = {}
): Promise<{ signatureHash: string; signedAt: Date }> {
  const signedAt = new Date();
  const terms = meta.signedTermsSnapshot || `contract_${contractId}_terms_v1`;
  const signatureHash = computeSignatureHash(contractId, signerId, signerRole, terms, signedAt.getTime());

  await db.insert(contractSignatures).values({
    contractId,
    signerId,
    signerRole,
    signatureHash,
    signedTermsSnapshot: terms,
    ipAddress: meta.ipAddress,
    userAgent: meta.userAgent,
    signedAt,
  });

  console.log(`[Signature] contract=${contractId} signer=${signerId} role=${signerRole} hash=${signatureHash.substring(0, 12)}...`);
  return { signatureHash, signedAt };
}

export async function getSignaturesByContract(contractId: number) {
  return await db.select().from(contractSignatures).where(eq(contractSignatures.contractId, contractId));
}

// 서명 무결성 검증
export function verifySignature(
  contractId: number,
  signerId: string,
  role: string,
  terms: string,
  signedAt: Date,
  signatureHash: string
): boolean {
  const expected = computeSignatureHash(contractId, signerId, role, terms, signedAt.getTime());
  return crypto.timingSafeEqual(Buffer.from(expected), Buffer.from(signatureHash));
}
