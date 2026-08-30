# 급해요 화장실 — Service Frontend & Backend

사용자의 현재 위치를 기준으로 주변 화장실을 검색하고, 위치 정보와 도보 경로를 제공하는 지도 기반 웹 서비스입니다.

- 서비스 주소: https://geuphaeyo-hwajangsil-integration-fr.vercel.app
- 작업 브랜치: `feature/service-frontend-backend`
- 개발 인원 및 기간: 2명, 4주

## 핵심 기능

- 카카오맵 기반 화장실 장소 검색과 마커 클러스터링
- 브라우저 GPS를 이용한 현재 위치 표시
- 현재 지도 영역 재검색 및 지역명 검색
- 화장실 목록·마커·상세 팝업 연동
- 선택한 화장실까지 도보 경로, 거리, 예상 시간 표시
- 지도에서 실제 출발 위치 직접 조정
- 로그인·회원가입·Google 로그인 UI
- 화장실 제보 및 서비스 요청사항 입력
- 반응형 UI, 다크 모드, 일반지도·위성뷰 지원

## 사용 기술

| 영역 | 기술 |
| --- | --- |
| Frontend | React 18, Vite, TypeScript |
| Map | Kakao Map SDK, react-kakao-maps-sdk |
| Backend | Node.js, Express, TypeScript |
| Database | PostgreSQL, pg |
| Directions | Vercel Function, OSM/OSRM 기반 도보 경로 |
| Deployment | Vercel |
| Collaboration | Git, GitHub |

## 서비스 구조

```text
사용자 브라우저
└─ React + Vite + TypeScript
   ├─ Home
   │  ├─ SearchBar
   │  └─ Map
   │     ├─ Kakao Map SDK → 지도·장소 검색·마커
   │     └─ directionsService → /api/directions
   ├─ Auth
   │  └─ authService → 현재 localStorage 기반 세션
   └─ Service
      ├─ toiletService → 화장실 중복 확인용 임시 데이터
      └─ 화장실 제보·요청사항 → 현재 localStorage 임시 저장

/api/directions (Vercel Function)
└─ backend/src/services/directions-service.ts
   └─ 도보 경로 데이터 반환

Express REST API
└─ /toilets CRUD
   └─ PostgreSQL public.toilets
```

프론트엔드는 PostgreSQL에 직접 접근하지 않습니다. 실제 데이터 연결은 `src/services`에서 Express API를 호출하는 방식으로 진행합니다.

## 프로젝트 파일 구조

```text
.
├─ api/
│  └─ directions.ts                  # Vercel 도보 길찾기 함수
├─ backend/
│  ├─ src/
│  │  ├─ config/env.ts               # 백엔드 환경변수
│  │  ├─ db/
│  │  │  ├─ pool.ts                  # PostgreSQL 연결 풀
│  │  │  └─ test-connection.ts       # DB 연결 확인
│  │  ├─ routes/directions.ts        # 길찾기 라우터
│  │  ├─ services/directions-service.ts
│  │  └─ server.ts                   # Express 서버와 toilets CRUD
│  ├─ sql/
│  │  ├─ 001_create_database.sql
│  │  ├─ 002_create_tables.sql
│  │  ├─ 003_seed_restrooms.sql
│  │  └─ 004_migrate_to_toilets.sql
│  └─ package.json
├─ src/
│  ├─ components/
│  │  ├─ Header.tsx
│  │  ├─ Map.tsx                     # 지도 검색·마커·도보 길찾기
│  │  ├─ SearchBar.tsx
│  │  ├─ ToiletCard.tsx
│  │  ├─ ToiletLocationMap.tsx
│  │  └─ GoogleSignInButton.tsx
│  ├─ pages/
│  │  ├─ Home.tsx                    # 메인 지도 페이지
│  │  ├─ Auth.tsx                    # 로그인·회원가입
│  │  └─ Service.tsx                 # 고객센터·추천·제보
│  ├─ services/
│  │  ├─ authService.ts              # 현재 로컬 인증 처리
│  │  ├─ directionsService.ts        # 도보 경로 API 호출
│  │  ├─ locationService.ts          # 좌표 거리 계산
│  │  └─ toiletService.ts            # 현재 mock 화장실 데이터
│  ├─ styles/
│  ├─ types/
│  │  ├─ auth.ts
│  │  └─ toilet.ts
│  ├─ RootApp.tsx                    # map/auth/service 화면 전환
│  └─ main.tsx
├─ .env.example
├─ vercel.json
└─ package.json
```

루트에 남아 있는 기존 파일은 이전 구조와의 호환 및 개발 기록을 위해 유지합니다. 현재 프론트엔드 진입점과 주요 코드는 `src` 아래에 있습니다.

## 주요 데이터 구조

### 프론트엔드 Toilet

```ts
type Toilet = {
  id: string;
  name: string;
  address: string;
  latitude: number;
  longitude: number;
  distance: string;
  openAllDay: boolean;
  accessible: boolean;
  hours?: string;
  facilityType?: 'public' | 'building' | 'station' | 'park' | 'other';
  locationDetail?: string;
  genderType?: 'separated' | 'unisex' | 'unknown';
  babyFacility?: boolean;
  status?: 'pending' | 'approved';
};
```

### 프론트엔드와 DB 필드 대응

| Frontend | PostgreSQL | 설명 |
| --- | --- | --- |
| `id` | `id` | 고유 식별자 |
| `name` | `name` | 화장실 이름 |
| `address` | `address` | 주소 |
| `latitude` | `latitude` | 위도 |
| `longitude` | `longitude` | 경도 |
| `openAllDay` | `open_24h` | 24시간 운영 여부 |
| `hours` | `opening_hours` | 운영시간 |
| `accessible` | `accessible` | 장애인 접근 가능 여부 |
| `babyFacility` | `diaper_changing_table_available` | 기저귀 교환대 |

현재 위치에 따라 달라지는 `distance`는 고정 시설 정보가 아니므로 프론트엔드에서 실행 시 계산합니다. 사용자의 현재 위치는 데이터베이스에 영구 저장하지 않습니다.

PostgreSQL에는 계단 수, 비밀번호 필요 여부, 남녀 화장실 수, 비상벨 여부 등 추가 편의정보도 저장할 수 있습니다.

## API

### 화장실 API

| Method | Endpoint | 설명 |
| --- | --- | --- |
| `GET` | `/toilets` | 전체 화장실 조회 |
| `GET` | `/toilets/:id` | 화장실 상세 조회 |
| `POST` | `/toilets` | 화장실 등록 |
| `PATCH` | `/toilets/:id` | 화장실 수정 |
| `DELETE` | `/toilets/:id` | 화장실 삭제 |

### 도보 길찾기 API

`POST /api/directions`

```json
{
  "origin": { "latitude": 37.5665, "longitude": 126.9780 },
  "destination": {
    "latitude": 37.5663,
    "longitude": 126.9779,
    "name": "시청역 공중화장실"
  },
  "mode": "walk"
}
```

응답에는 도보 거리, 예상 시간, 지도에 표시할 경로 좌표가 포함됩니다.

## 실행 방법

### 프론트엔드

```bash
npm ci
npm run dev
```

프로덕션 빌드 검증:

```bash
npm run build
```

필요한 프론트엔드 환경변수:

```env
VITE_KAKAO_MAP_KEY=example
VITE_GOOGLE_CLIENT_ID=example
VITE_API_BASE_URL=http://localhost:3000
```

실제 비밀값이 들어 있는 `.env`, `.env.local` 파일은 Git에 커밋하지 않습니다.

### 백엔드

```bash
npm --prefix backend ci
npm --prefix backend run dev
```

타입 검사와 DB 연결 확인:

```bash
npm --prefix backend run typecheck
npm --prefix backend run db:test
```

PostgreSQL 초기 설정:

```bash
npm --prefix backend run db:setup
```

## 현재 구현 상태

### 완료

- 메인 지도, 검색, 마커, 목록과 상세정보
- 현재 위치 및 지도 검색 결과 거리 표시
- 도보 전용 길찾기와 경로 시각화
- 로그인·회원가입·Google 로그인 화면
- 화장실 제보와 요청사항 UI
- 모바일 반응형 UI와 다크 모드
- Vercel 프로덕션 배포
- Express 화장실 CRUD 및 PostgreSQL 스키마

### 임시 구현

- 화장실 중복 확인 데이터: `toiletService`의 mock 데이터
- 일반 로그인과 세션: 브라우저 `localStorage`
- 화장실 제보와 요청사항: 브라우저 `localStorage`

임시 구현은 백엔드 API가 준비되면 `src/services` 내부 구현만 교체할 수 있도록 UI와 분리했습니다.

## 개발 방향

### 3주차 — 프론트엔드·백엔드 통합

1. 프론트엔드 `camelCase`와 DB `snake_case` 변환 규칙 확정
2. `GET /toilets`를 연결해 mock 화장실 데이터를 실제 데이터로 교체
3. 화장실 상세조회와 신규 제보 `POST /toilets` 연결
4. 로그인·Google ID 토큰을 백엔드에서 검증하는 인증 구조 협의
5. 요청사항 저장 API의 요청·응답 형식 설계
6. 위치 권한 거부, API 장애, 빈 결과 등 예외 상황 테스트
7. PC·모바일 통합 테스트와 접근성 개선

### 4주차 — 안정화 및 발표 준비

1. 통합 오류와 UI 문제 수정
2. API 입력값 검증 및 보안 점검
3. 성능과 지도 검색 범위 최적화
4. 최종 배포, 시연 시나리오, PPT 및 발표 자료 완성

## 협업 원칙

- 프론트엔드와 백엔드는 독립된 폴더와 책임 영역을 유지합니다.
- 프론트엔드에서 PostgreSQL에 직접 접근하지 않습니다.
- API 연결 전 요청·응답 형식과 오류 코드를 먼저 합의합니다.
- 기능 브랜치에서 작업하고 Pull Request를 통해 병합합니다.
- 비밀 환경변수는 커밋하지 않고 `.env.example`에는 예시만 기록합니다.
- 프론트엔드 변경 후 `npm run build`를 실행합니다.
- 백엔드 변경 후 `npm --prefix backend run typecheck`를 실행합니다.

---

<details>
<summary>초기 프로젝트 README 기록</summary>

아래 내용은 프로젝트 초기 구조와 개발 기준을 보존하기 위한 기록입니다.

## 📁 프로젝트 구조

프로젝트/
├── dist/                         # 빌드 결과물
├── node_modules/                 # 설치된 npm 패키지
│
├── src/                          # React 소스 코드
│   ├── components/               # 재사용 가능한 React 컴포넌트
│   │   └── KakaoMap.tsx
│   │
│   ├── pages/                    # 페이지 단위 컴포넌트
│   │   ├── Login.tsx             # 로그인 페이지
│   │   ├── Signup.tsx            # 회원가입 페이지
│   │   └── Home.tsx              # 메인 페이지
│   │
│   ├── services/                 # API 및 외부 서비스 관련 코드
│   ├── styles/                   # CSS 및 스타일 관련 코드
│   ├── types/                    # TypeScript 타입 정의
│   │
│   ├── App.tsx                   # 메인 React 애플리케이션
│   ├── main.tsx                  # React 앱 진입점
│   └── vite-env.d.ts             # Vite 환경변수 타입 설정
│
├── .env                          # 카카오 API 키 등 환경변수
├── .gitignore                    # Git에서 제외할 파일 설정
├── AGENTS.md                     # AI 개발 및 프로젝트 작업 규칙
├── index.html                    # 웹 페이지 기본 HTML
├── main.js                       # 기존 JavaScript 파일
├── package.json                  # 프로젝트 정보 및 npm 패키지 관리
├── package-lock.json             # 설치된 패키지 버전 기록
├── PROJECT_NOTES.md              # 프로젝트 개발 및 협업 메모
├── style.css                     # 기존 전역 CSS 스타일
│
├── tsconfig.app.json             # 애플리케이션 TypeScript 설정
├── tsconfig.app.tsbuildinfo      # TypeScript 앱 빌드 정보
├── tsconfig.json                 # TypeScript 기본 설정
├── tsconfig.node.json            # Node 환경 TypeScript 설정
├── tsconfig.node.tsbuildinfo     # Node TypeScript 빌드 정보
└── vite.config.ts                # Vite 설정

## 🛠️ 사용 기술

* **React** — 사용자 인터페이스 개발
* **TypeScript** — 타입 안정성을 갖춘 JavaScript 개발
* **Vite** — 프론트엔드 개발 및 빌드 환경
* **HTML5** — 웹 페이지 구조
* **CSS3** — 웹 페이지 스타일링
* **npm** — 패키지 및 의존성 관리
* **Git / GitHub** — 버전 관리 및 협업

## 📂 `src` 폴더 구조

### `components/`

여러 페이지에서 공통으로 사용할 수 있는 재사용 가능한 React 컴포넌트를 관리합니다.

예를 들어 버튼, 카드, 네비게이션, 모달 등의 UI 요소를 이곳에 구성할 수 있습니다.

### `pages/`

웹 서비스의 각각의 페이지를 관리합니다.

페이지별 화면 구성과 해당 페이지에서 필요한 기능을 작성합니다.

### `services/`

백엔드 API나 외부 서비스와 통신하는 코드를 관리합니다.

데이터 조회, 등록, 수정, 삭제 등의 API 요청을 이곳에서 관리하는 것을 목표로 합니다.

### `styles/`

프로젝트에서 사용하는 CSS 및 스타일 관련 파일을 관리합니다.

페이지나 컴포넌트의 디자인과 화면 구성을 담당합니다.

### `types/`

TypeScript에서 사용하는 타입과 인터페이스를 관리합니다.

프로젝트에서 사용하는 데이터 구조를 명확하게 정의하여 코드의 안정성을 높입니다.

### `App.tsx`

React 애플리케이션의 주요 화면과 전체적인 구조를 담당하는 메인 컴포넌트입니다.

### `main.tsx`

React 애플리케이션을 실제 HTML 문서에 연결하는 진입점입니다.

## 📄 주요 파일 설명

### `index.html`

웹 애플리케이션의 기본 HTML 문서입니다.

React 애플리케이션이 실행될 기본 DOM 구조를 제공합니다.

### `package.json`

프로젝트에서 사용하는 npm 패키지와 실행 명령어를 관리합니다.

### `package-lock.json`

설치된 npm 패키지의 정확한 버전을 기록하여 개발 환경의 차이를 줄입니다.

### `vite.config.ts`

Vite 개발 서버와 프로젝트 빌드 환경을 설정합니다.

### `tsconfig.json`

TypeScript 프로젝트의 기본 설정을 관리합니다.

### `AGENTS.md`

AI 도구를 이용해 프로젝트를 개발할 때 필요한 규칙과 작업 기준을 정리한 파일입니다.

### `PROJECT_NOTES.md`

프로젝트 진행 과정에서 필요한 개발 내용과 협업 관련 메모를 기록합니다.

### `.gitignore`

Git에 업로드하지 않을 파일과 폴더를 지정합니다.

## 🚀 실행 방법

### 1. 프로젝트 클론

```bash
git clone [Repository URL]
```

### 2. 프로젝트 폴더 이동

```bash
cd [프로젝트 폴더]
```

### 3. 패키지 설치

```bash
npm install
```

### 4. 개발 서버 실행

```bash
npm run dev
```

실행 후 터미널에 표시되는 로컬 주소로 접속하면 프로젝트를 확인할 수 있습니다.

## 🔄 Git 협업

최신 코드를 받은 후 작업합니다.

```bash
git pull
```

작업이 끝난 후 변경 사항을 업로드합니다.

```bash
git add .
git commit -m "작업 내용"
git push
```

## 👥 프로젝트 개발 방향

본 프로젝트는 React와 TypeScript를 기반으로 프론트엔드를 개발합니다.

새로운 UI 요소는 `components`, 새로운 페이지는 `pages`, API 및 외부 서비스 관련 기능은 `services`, 타입은 `types`, 스타일은 `styles`에서 관리하여 프로젝트 구조를 명확하게 유지합니다.

프로젝트 진행 상황과 개발 관련 내용은 `PROJECT_NOTES.md`에서 관리합니다.

## 📝 참고

프로젝트가 발전하면서 새로운 컴포넌트와 페이지가 추가될 수 있으며, 프로젝트 구조가 변경될 경우 README도 함께 업데이트합니다.

## 백엔드 통합

백엔드 코드는 프론트엔드 실행 코드와 충돌하지 않도록 `backend/` 폴더에 분리되어 있습니다.

```text
backend/
├── src/
│   ├── config/env.ts          # 데이터베이스 환경변수 설정
│   ├── db/pool.ts             # PostgreSQL 연결 풀
│   ├── db/test-connection.ts  # DB 연결 확인
│   └── server.ts              # Express REST API 서버
├── sql/                       # 데이터베이스 생성·테이블·시드·마이그레이션 SQL
├── .env.example               # 백엔드 환경변수 예시
├── package.json               # 백엔드 의존성 및 실행 명령
└── tsconfig.json              # 백엔드 TypeScript 설정
```

### 백엔드 기술

- Node.js, Express, TypeScript
- PostgreSQL, `pg`
- `dotenv`

### 제공 API

| Method | Endpoint | 설명 |
| --- | --- | --- |
| `GET` | `/toilets` | 전체 화장실 목록 조회 |
| `GET` | `/toilets/:id` | 화장실 상세 조회 |
| `POST` | `/toilets` | 화장실 등록 |
| `PATCH` | `/toilets/:id` | 화장실 정보 수정 |
| `DELETE` | `/toilets/:id` | 화장실 삭제 |

### 백엔드 실행

`backend/.env.example`을 참고해 `backend/.env`를 로컬에서만 만들고, PostgreSQL 연결 정보를 설정합니다. `.env` 파일은 Git에 올리지 않습니다.

```bash
cd backend
npm ci
npm run dev
```

서버 기본 포트는 `3000`이며, 배포 환경에서는 `PORT` 환경변수를 사용합니다.

### 프론트엔드와 백엔드 연결

프론트엔드는 루트의 React/Vite 프로젝트로 실행하고, 백엔드는 `backend/`에서 별도 실행합니다. 실제 API 연결 시 프론트엔드의 `src/services/`에서 백엔드 REST API를 호출하며, PostgreSQL에는 프론트엔드가 직접 접근하지 않습니다.

</details>
