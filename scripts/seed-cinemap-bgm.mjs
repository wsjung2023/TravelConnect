// CineMap BGM 사전 목록을 system_config에 시드
import { db } from '../server/db.ts';
import { systemConfig } from '../shared/schema.ts';
import { eq, and } from 'drizzle-orm';

const BGM_TRACKS = [
  { id: 'calm',      label: '잔잔한 여행',  filename: 'bgm_calm.mp3'      },
  { id: 'upbeat',   label: '활기찬 탐험',  filename: 'bgm_upbeat.mp3'    },
  { id: 'cinematic', label: '시네마틱',     filename: 'bgm_cinematic.mp3' },
];

const existing = await db.query.systemConfig.findFirst({
  where: and(
    eq(systemConfig.category, 'cinemap'),
    eq(systemConfig.key, 'bgm_tracks')
  ),
});

if (existing) {
  console.log('BGM tracks already seeded, skipping.');
} else {
  await db.insert(systemConfig).values({
    category: 'cinemap',
    key: 'bgm_tracks',
    valueType: 'json',
    valueJson: BGM_TRACKS,
    displayName: 'CineMap BGM Tracks',
    displayNameKo: 'CineMap 배경음악 목록',
    description: 'CineMap 영상 배경음악 목록',
    updatedBy: 'seed',
  });
  console.log('BGM tracks seeded successfully.');
}
process.exit(0);
