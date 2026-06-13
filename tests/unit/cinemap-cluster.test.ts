// clusterPhotos 단위 테스트 — GPS 클러스터링 로직 검증
import { describe, it, expect } from 'vitest';
import { clusterPhotos, type PhotoWithExif } from '../../server/ai/cinemap';

const SEOUL = { lat: 37.5665, lng: 126.9780 };
const BUSAN = { lat: 35.1796, lng: 129.0756 };
const NEAR_SEOUL = { lat: 37.5674, lng: 126.9780 }; // ~100m from Seoul

function makePhoto(
  id: number,
  lat: number,
  lng: number,
  minutesOffset = 0,
): PhotoWithExif {
  return {
    id,
    url: `https://example.com/photo${id}.jpg`,
    datetime: new Date(2024, 0, 1, 12, minutesOffset),
    latitude: lat,
    longitude: lng,
    metadata: null,
  };
}

describe('clusterPhotos', () => {
  it('빈 배열 → 빈 배열 반환', () => {
    expect(clusterPhotos([])).toEqual([]);
  });

  it('사진 1장 → 클러스터 1개', () => {
    const photos = [makePhoto(1, SEOUL.lat, SEOUL.lng)];
    const clusters = clusterPhotos(photos);
    expect(clusters).toHaveLength(1);
    expect(clusters[0]!.photos).toHaveLength(1);
  });

  it('같은 위치 2장 (100m 이내, 5분 차이) → 클러스터 1개', () => {
    const photos = [
      makePhoto(1, SEOUL.lat, SEOUL.lng, 0),
      makePhoto(2, NEAR_SEOUL.lat, NEAR_SEOUL.lng, 5),
    ];
    const clusters = clusterPhotos(photos);
    expect(clusters).toHaveLength(1);
    expect(clusters[0]!.photos).toHaveLength(2);
  });

  it('서울·부산 (400km 이상) → 클러스터 2개', () => {
    const photos = [
      makePhoto(1, SEOUL.lat, SEOUL.lng, 0),
      makePhoto(2, BUSAN.lat, BUSAN.lng, 10),
    ];
    const clusters = clusterPhotos(photos);
    expect(clusters).toHaveLength(2);
  });

  it('같은 위치여도 시간 차이 65분 초과 → 클러스터 2개', () => {
    const photos = [
      makePhoto(1, SEOUL.lat, SEOUL.lng, 0),
      makePhoto(2, NEAR_SEOUL.lat, NEAR_SEOUL.lng, 65),
    ];
    const clusters = clusterPhotos(photos);
    expect(clusters).toHaveLength(2);
  });

  it('날짜 역순 입력 → 클러스터 내 사진이 날짜순 정렬', () => {
    const photos = [
      makePhoto(2, SEOUL.lat, SEOUL.lng, 10),
      makePhoto(1, SEOUL.lat, SEOUL.lng, 0),
    ];
    const clusters = clusterPhotos(photos);
    expect(clusters).toHaveLength(1);
    const times = clusters[0]!.photos.map((p) => p.datetime.getTime());
    expect(times[0]).toBeLessThan(times[1]!);
  });

  it('3개 독립 위치 → 클러스터 3개', () => {
    const FAR_FROM_SEOUL = { lat: 37.6700, lng: 127.0900 }; // ~13km from Seoul
    const photos = [
      makePhoto(1, SEOUL.lat, SEOUL.lng, 0),
      makePhoto(2, BUSAN.lat, BUSAN.lng, 120),
      makePhoto(3, FAR_FROM_SEOUL.lat, FAR_FROM_SEOUL.lng, 240),
    ];
    const clusters = clusterPhotos(photos);
    expect(clusters).toHaveLength(3);
  });
});
