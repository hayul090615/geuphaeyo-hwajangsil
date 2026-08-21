# React 프론트엔드 프로젝트

React와 TypeScript를 기반으로 제작하는 프론트엔드 프로젝트입니다.

## 📁 프로젝트 구조

```text
프로젝트/
├── dist/                         # 빌드 결과물
├── node_modules/                 # 설치된 npm 패키지
│
├── src/                          # React 소스 코드
│   ├── components/               # 재사용 가능한 React 컴포넌트
│   ├── pages/                    # 페이지 단위 컴포넌트
│   ├── services/                 # API 및 외부 서비스 관련 코드
│   ├── styles/                   # CSS 및 스타일 관련 코드
│   ├── types/                    # TypeScript 타입 정의
│   ├── App.tsx                   # 메인 React 애플리케이션
│   └── main.tsx                  # React 앱 진입점
│
├── .gitignore                    # Git에서 제외할 파일 설정
├── AGENTS.md                     # AI 개발 및 프로젝트 작업 규칙
├── index.html                    # 웹 페이지 기본 HTML
├── main.js                       # JavaScript 관련 파일
├── package.json                  # 프로젝트 정보 및 npm 패키지 관리
├── package-lock.json             # 설치된 패키지 버전 기록
├── PROJECT_NOTES.md              # 프로젝트 개발 및 협업 메모
├── style.css                     # 전역 CSS 스타일
│
├── tsconfig.app.json             # 애플리케이션 TypeScript 설정
├── tsconfig.app.tsbuildinfo      # TypeScript 앱 빌드 정보
├── tsconfig.json                 # TypeScript 기본 설정
├── tsconfig.node.json            # Node 환경 TypeScript 설정
├── tsconfig.node.tsbuildinfo     # Node TypeScript 빌드 정보
└── vite.config.ts                # Vite 설정
```

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
