import type { Toilet } from '../types/toilet';
const mockToilets: Toilet[] = [
  {id:'1',name:'시청역 공중화장실',address:'서울 중구 세종대로 110',distance:'120m',openAllDay:true,accessible:true,latitude:37.5663,longitude:126.9779},
  {id:'2',name:'서울광장 화장실',address:'서울 중구 을지로 12',distance:'350m',openAllDay:true,accessible:false,latitude:37.5658,longitude:126.9781},
  {id:'3',name:'덕수궁 돌담길 화장실',address:'서울 중구 세종대로 99',distance:'520m',openAllDay:false,accessible:true,latitude:37.5657,longitude:126.9753},
];
// 추후 백엔드 API 호출로 교체할 수 있도록 데이터 접근을 별도 서비스로 분리합니다.
export async function getNearbyToilets(): Promise<Toilet[]> { return Promise.resolve(mockToilets); }
