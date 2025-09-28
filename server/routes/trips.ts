import express from 'express';
import multer from 'multer';
import path from 'path';
import { randomUUID } from 'crypto';
import fs from 'fs';
import exifr from 'exifr';
import { authenticateHybrid } from '../auth';
import { storage } from '../storage';
import { insertPostSchema } from '@shared/schema';

const router = express.Router();

// 업로드 디렉토리 설정
const UPLOAD_DIR = path.join(process.cwd(), 'uploads');
if (!fs.existsSync(UPLOAD_DIR)) {
  fs.mkdirSync(UPLOAD_DIR, { recursive: true });
}

// Multer 설정 - 보안 강화된 MIME 타입 및 크기 제한
const upload = multer({ 
  storage: multer.memoryStorage(),
  limits: { 
    fileSize: 15 * 1024 * 1024, // 15MB
    files: 100 // 최대 100개 파일
  },
  fileFilter: (req, file, cb) => {
    // MIME 타입 화이트리스트 - 이미지와 비디오만 허용
    const allowedTypes = [
      'image/jpeg',
      'image/png', 
      'image/webp',
      'image/heic',
      'video/mp4',
      'video/quicktime'
    ];
    
    if (!allowedTypes.includes(file.mimetype)) {
      const error = new Error(`허용되지 않는 파일 형식입니다. 허용 형식: ${allowedTypes.join(', ')}`);
      return cb(error as any);
    }
    
    // 파일 확장자 추가 검증
    const allowedExtensions = ['.jpg', '.jpeg', '.png', '.webp', '.heic', '.mp4', '.mov'];
    const fileExtension = path.extname(file.originalname).toLowerCase();
    
    if (!allowedExtensions.includes(fileExtension)) {
      const error = new Error(`허용되지 않는 파일 확장자입니다. 허용 확장자: ${allowedExtensions.join(', ')}`);
      return cb(error as any);
    }
    
    cb(null, true);
  }
});

// EXIF 데이터에서 정보 추출
async function extractExifData(buffer: Buffer): Promise<{
  takenAt: Date | null;
  latitude: number | null;
  longitude: number | null;
}> {
  try {
    const exif = await exifr.parse(buffer, {
      gps: true,
      pick: ['DateTimeOriginal', 'CreateDate', 'DateTime', 'GPS']
    });

    let takenAt: Date | null = null;
    let latitude: number | null = null;
    let longitude: number | null = null;

    // 촬영 날짜 추출 (우선순위: DateTimeOriginal > CreateDate > DateTime)
    if (exif?.DateTimeOriginal) {
      takenAt = new Date(exif.DateTimeOriginal);
    } else if (exif?.CreateDate) {
      takenAt = new Date(exif.CreateDate);
    } else if (exif?.DateTime) {
      takenAt = new Date(exif.DateTime);
    }

    // GPS 좌표 추출
    if (exif?.latitude && exif?.longitude) {
      latitude = exif.latitude;
      longitude = exif.longitude;
    }

    return { takenAt, latitude, longitude };
  } catch (error) {
    console.log('EXIF 추출 실패:', error);
    return { takenAt: null, latitude: null, longitude: null };
  }
}

// 날짜로 Day 그룹 생성
function groupByDay(files: Array<{ 
  filename: string; 
  takenAt: Date | null; 
  latitude: number | null; 
  longitude: number | null;
}>): Array<{
  dayId: number;
  date: string;
  files: typeof files;
}> {
  const dayGroups = new Map<string, typeof files>();
  
  files.forEach(file => {
    let dateKey: string;
    
    if (file.takenAt) {
      // EXIF 날짜가 있으면 해당 날짜로 그룹화
      dateKey = file.takenAt.toISOString().split('T')[0];
    } else {
      // EXIF 날짜가 없으면 오늘 날짜로 그룹화
      dateKey = new Date().toISOString().split('T')[0];
    }
    
    if (!dayGroups.has(dateKey)) {
      dayGroups.set(dateKey, []);
    }
    dayGroups.get(dateKey)!.push(file);
  });

  // 날짜순으로 정렬하여 Day ID 부여
  const sortedDays = Array.from(dayGroups.entries())
    .sort(([dateA], [dateB]) => dateA.localeCompare(dateB))
    .map(([date, files], index) => ({
      dayId: index + 1,
      date,
      files
    }));

  return sortedDays;
}

// POST /api/trips/import-media - 미디어 파일 가져오기
router.post('/import-media', authenticateHybrid, upload.array('files', 100), async (req: any, res) => {
  try {
    const userId = req.user.id;
    const files = req.files as Express.Multer.File[];
    
    if (!files || files.length === 0) {
      return res.status(400).json({ 
        error: '파일이 선택되지 않았습니다.',
        code: 'NO_FILES'
      });
    }

    console.log(`${files.length}개 파일 처리 시작`);
    
    // 각 파일 처리
    const processedFiles = [];
    
    for (const file of files) {
      try {
        // 파일 저장
        const fileExtension = path.extname(file.originalname) || '.jpg';
        const filename = `${randomUUID()}${fileExtension}`;
        const filePath = path.join(UPLOAD_DIR, filename);
        
        fs.writeFileSync(filePath, file.buffer);
        
        // EXIF 데이터 추출
        const exifData = await extractExifData(file.buffer);
        
        processedFiles.push({
          originalName: file.originalname,
          filename: filename,
          path: filePath,
          size: file.size,
          mimetype: file.mimetype,
          takenAt: exifData.takenAt,
          latitude: exifData.latitude,
          longitude: exifData.longitude
        });
        
        console.log(`파일 처리 완료: ${file.originalname} -> ${filename}`);
      } catch (error) {
        console.error(`파일 처리 실패: ${file.originalname}`, error);
        // 개별 파일 실패는 무시하고 계속 진행
      }
    }
    
    // Day별로 그룹화
    const dayGroups = groupByDay(processedFiles.map(f => ({
      filename: f.filename,
      takenAt: f.takenAt,
      latitude: f.latitude,
      longitude: f.longitude
    })));
    
    console.log(`${dayGroups.length}개 Day 그룹 생성됨`);
    
    res.json({
      message: `${processedFiles.length}개 파일이 ${dayGroups.length}개 Day로 그룹화되었습니다.`,
      totalFiles: processedFiles.length,
      processedFiles,
      dayGroups,
      uploadPath: '/uploads'
    });
    
  } catch (error) {
    console.error('미디어 가져오기 실패:', error);
    res.status(500).json({ 
      error: '파일 처리 중 오류가 발생했습니다.',
      code: 'PROCESSING_ERROR'
    });
  }
});

export { router as tripsRouter };