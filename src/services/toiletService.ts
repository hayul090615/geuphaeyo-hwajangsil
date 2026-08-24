import type { Toilet } from '../types/toilet';
const mockToilets: Toilet[] = [
  {id:'1',name:'시청역 공중화장실',address:'서울 중구 세종대로 110',distance:'120m',openAllDay:true,accessible:true,latitude:37.5663,longitude:126.9779},
  {id:'2',name:'서울광장 화장실',address:'서울 중구 을지로 12',distance:'350m',openAllDay:true,accessible:false,latitude:37.5658,longitude:126.9781},
  {id:'3',name:'덕수궁 돌담길 화장실',address:'서울 중구 세종대로 99',distance:'520m',openAllDay:false,accessible:true,latitude:37.5657,longitude:126.9753},
  {id:'4',name:'을지로입구역 화장실',address:'서울 중구 을지로 42',distance:'680m',openAllDay:true,accessible:true,latitude:37.5660,longitude:126.9822},
  {id:'5',name:'명동입구 공중화장실',address:'서울 중구 남대문로 84',distance:'790m',openAllDay:false,accessible:false,latitude:37.5638,longitude:126.9833},
  {id:'6',name:'청계광장 화장실',address:'서울 중구 태평로1가 1',distance:'860m',openAllDay:true,accessible:true,latitude:37.5691,longitude:126.9785},
  {id:'7',name:'서울도서관 화장실',address:'서울 중구 세종대로 110',distance:'920m',openAllDay:false,accessible:true,latitude:37.5665,longitude:126.9780},
  {id:'8',name:'남대문시장 화장실',address:'서울 중구 남대문시장4길 21',distance:'1.1km',openAllDay:false,accessible:false,latitude:37.5595,longitude:126.9770},
  {id:'9',name:'광화문광장 화장실',address:'서울 종로구 세종대로 175',distance:'1.2km',openAllDay:true,accessible:true,latitude:37.5718,longitude:126.9764},
  {id:'10',name:'종각역 화장실',address:'서울 종로구 종로 33',distance:'1.3km',openAllDay:true,accessible:true,latitude:37.5702,longitude:126.9830},
  {id:'11',name:'회현역 화장실',address:'서울 중구 퇴계로 54',distance:'1.4km',openAllDay:true,accessible:false,latitude:37.5588,longitude:126.9781},
  {id:'12',name:'한국은행 앞 화장실',address:'서울 중구 남대문로 39',distance:'1.5km',openAllDay:false,accessible:true,latitude:37.5628,longitude:126.9807},
  {id:'13',name:'인사동 문화화장실',address:'서울 종로구 인사동길 12',distance:'1.6km',openAllDay:false,accessible:false,latitude:37.5722,longitude:126.9856},
  {id:'14',name:'서소문공원 화장실',address:'서울 중구 칠패로 5',distance:'1.7km',openAllDay:true,accessible:true,latitude:37.5606,longitude:126.9721},
  {id:'15',name:'서울역 광장 화장실',address:'서울 용산구 한강대로 405',distance:'1.8km',openAllDay:true,accessible:true,latitude:37.5559,longitude:126.9707},
  {id:'16',name:'정동길 화장실',address:'서울 중구 정동길 21',distance:'1.9km',openAllDay:false,accessible:true,latitude:37.5651,longitude:126.9730},
];
// 추후 백엔드 API 호출로 교체할 수 있도록 데이터 접근을 별도 서비스로 분리합니다.
export async function getNearbyToilets(): Promise<Toilet[]> { return Promise.resolve(mockToilets); }
