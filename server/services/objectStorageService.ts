// Object Storage 서비스 — uploads/ 로컬 디스크를 대체하는 GCS Object Storage 래퍼.
// [2026-03-08] 신규 생성: multer diskStorage → Object Storage 마이그레이션 (T002)

import { objectStorageClient } from '../replit_integrations/object_storage/objectStorage';

const REPLIT_SIDECAR_ENDPOINT = 'http://127.0.0.1:1106';

// PUBLIC_OBJECT_SEARCH_PATHS 환경변수에서 버킷명/공개 디렉터리 추출
function getPublicStoragePath(): { bucketName: string; publicDir: string } {
  const paths = process.env.PUBLIC_OBJECT_SEARCH_PATHS || '';
  const firstPath = paths.split(',')[0].trim();
  if (!firstPath) {
    throw new Error('PUBLIC_OBJECT_SEARCH_PATHS 환경변수가 설정되지 않았습니다.');
  }
  // 형식: /<bucket_name>/<public_dir>
  const parts = firstPath.replace(/^\//, '').split('/');
  return {
    bucketName: parts[0],
    publicDir: parts.slice(1).join('/') || 'public',
  };
}

// Object Storage에 파일 업로드 → Object Storage 내부 경로 반환
export async function uploadFile(
  filename: string,
  buffer: Buffer,
  mimetype: string
): Promise<string> {
  const { bucketName, publicDir } = getPublicStoragePath();
  const objectName = `${publicDir}/uploads/${filename}`;

  const bucket = objectStorageClient.bucket(bucketName);
  const file = bucket.file(objectName);

  await file.save(buffer, {
    contentType: mimetype,
    resumable: false,
  });

  // 내부 경로 반환 (외부 URL은 getSignedReadUrl로 별도 생성)
  return `/${bucketName}/${objectName}`;
}

// 파일명으로 서명된 읽기 URL 생성 (TTL: 1시간)
export async function getSignedReadUrl(filename: string): Promise<string> {
  const { bucketName, publicDir } = getPublicStoragePath();
  const objectName = `${publicDir}/uploads/${filename}`;

  const expiresAt = new Date(Date.now() + 3600 * 1000).toISOString();

  const response = await fetch(
    `${REPLIT_SIDECAR_ENDPOINT}/object-storage/signed-object-url`,
    {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        bucket_name: bucketName,
        object_name: objectName,
        method: 'GET',
        expires_at: expiresAt,
      }),
    }
  );

  if (!response.ok) {
    throw new Error(`서명 URL 생성 실패: ${response.status}`);
  }

  const { signed_url } = await response.json();
  return signed_url;
}

// 파일 존재 여부 확인
export async function fileExists(filename: string): Promise<boolean> {
  try {
    const { bucketName, publicDir } = getPublicStoragePath();
    const objectName = `${publicDir}/uploads/${filename}`;
    const bucket = objectStorageClient.bucket(bucketName);
    const file = bucket.file(objectName);
    const [exists] = await file.exists();
    return exists;
  } catch {
    return false;
  }
}

// 파일 삭제
export async function deleteFile(filename: string): Promise<void> {
  const { bucketName, publicDir } = getPublicStoragePath();
  const objectName = `${publicDir}/uploads/${filename}`;
  const bucket = objectStorageClient.bucket(bucketName);
  const file = bucket.file(objectName);
  await file.delete({ ignoreNotFound: true });
}

// 기존 로컬 파일을 Object Storage에 마이그레이션
export async function migrateLocalFile(
  localBuffer: Buffer,
  filename: string,
  mimetype: string
): Promise<string> {
  return uploadFile(filename, localBuffer, mimetype);
}
