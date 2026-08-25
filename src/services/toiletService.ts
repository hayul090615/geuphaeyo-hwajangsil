import type { Toilet } from '../types/toilet';

const places = [
  ['시청역 공중화장실', '서울 중구 세종대로 110', '120m', true, true],
  ['서울광장 화장실', '서울 중구 을지로 12', '350m', true, false],
  ['덕수궁 돌담길 화장실', '서울 중구 세종대로 99', '520m', false, true],
  ['을지로입구역 화장실', '서울 중구 을지로 42', '680m', true, true],
  ['명동입구 공중화장실', '서울 중구 남대문로 84', '790m', false, false],
  ['청계광장 화장실', '서울 중구 태평로1가 1', '860m', true, true],
  ['서울도서관 화장실', '서울 중구 세종대로 110', '920m', false, true],
  ['남대문시장 화장실', '서울 중구 남대문시장길 21', '1.1km', false, false],
  ['광화문광장 화장실', '서울 종로구 세종대로 175', '1.2km', true, true],
  ['종각역 화장실', '서울 종로구 종로 33', '1.3km', true, true],
  ['회현역 화장실', '서울 중구 퇴계로 54', '1.4km', true, false],
  ['한국은행 앞 화장실', '서울 중구 남대문로 39', '1.5km', false, true],
  ['인사동 문화화장실', '서울 종로구 인사동길 12', '1.6km', false, false],
  ['서소문공원 화장실', '서울 중구 칠패로 5', '1.7km', true, true],
  ['서울역 광장 화장실', '서울 용산구 한강대로 405', '1.8km', true, true],
  ['정동길 화장실', '서울 중구 정동길 21', '1.9km', false, true],
] as const;

const mockToilets: Toilet[] = places.map(([name, address, distance, openAllDay, accessible], index) => ({
  id: String(index + 1),
  name,
  address,
  distance,
  openAllDay,
  accessible,
  latitude: 37.5663 + index * 0.0004,
  longitude: 126.9779 + index * 0.0003,
}));

export async function getNearbyToilets(): Promise<Toilet[]> {
  return Promise.resolve(mockToilets);
}
