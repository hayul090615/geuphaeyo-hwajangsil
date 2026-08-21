# React 프론트엔드 프로젝트

React와 TypeScript를 기반으로 제작하는 프론트엔드 프로젝트입니다.

## 📁 프로젝트 구조

```text
프로젝트/
├── src/                         # React 소스 코드
│   └── ...                      # 컴포넌트 및 페이지 코드
│
├── index.html                   # 웹 페이지 기본 HTML
├── main.js                      # JavaScript 실행 파일
├── style.css                    # 전역 스타일 및 CSS
│
├── package.json                 # 프로젝트 정보 및 의존성 관리
├── package-lock.json            # 설치된 패키지 버전 관리
│
├── vite.config.ts               # Vite 설정
│
├── tsconfig.json                # TypeScript 기본 설정
├── tsconfig.app.json            # 애플리케이션 TypeScript 설정
├── tsconfig.node.json           # Node 환경 TypeScript 설정
├── tsconfig.app.tsbuildinfo     # TypeScript 빌드 정보
├── tsconfig.node.tsbuildinfo    # Node TypeScript 빌드 정보
│
├── AGENTS.md                    # AI 개발 및 프로젝트 작업 규칙
├── PROJECT_NOTES.md             # 프로젝트 관련 협업 및 개발 메모
└── .gitignore                   # Git에서 제외할 파일 설정
```

## 🛠️ 사용 기술

* **React** - 사용자 인터페이스 개발
* **TypeScript** - 타입 기반 JavaScript 개발
* **Vite** - 빠른 프론트엔드 개발 환경
* **HTML5** - 웹 페이지 구조
* **CSS3** - 웹 페이지 스타일링
* **Git / GitHub** - 버전 관리 및 협업

## 📂 주요 파일 설명

### `src/`

React 프로젝트의 핵심 소스 코드가 들어있는 폴더입니다.

컴포넌트, 페이지, 기능 등 실제 프론트엔드 개발에 필요한 코드를 이곳에서 관리합니다.

### `index.html`

웹 애플리케이션의 기본 HTML 파일입니다.

React 애플리케이션이 실행될 기본 구조를 제공합니다.

### `main.js`

웹 애플리케이션의 JavaScript 실행과 관련된 파일입니다.

### `style.css`

프로젝트 전체에서 사용하는 CSS 스타일을 관리합니다.

### `package.json`

프로젝트에서 사용하는 패키지와 실행 명령어를 관리합니다.

### `vite.config.ts`

Vite 개발 서버 및 빌드 환경을 설정하는 파일입니다.

### `tsconfig.json`

TypeScript 프로젝트의 기본 설정을 관리합니다.

### `AGENTS.md`

프로젝트에서 AI 도구를 사용할 때 지켜야 하는 개발 규칙과 작업 기준을 정리한 파일입니다.

### `PROJECT_NOTES.md`

프로젝트 진행 과정에서 필요한 개발 내용, 협업 규칙 및 참고 사항을 기록하는 파일입니다.

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

프로젝트의 소스 코드는 GitHub를 통해 관리합니다.

```bash
git pull
```

최신 코드를 받은 후 작업합니다.

작업이 끝난 후:

```bash
git add .
git commit -m "작업 내용"
git push
```

순서로 변경 사항을 GitHub에 업로드합니다.

## 👥 프로젝트 개발 방향

본 프로젝트는 React 기반의 프론트엔드를 중심으로 개발하며, 이후 필요한 기능과 화면을 `src` 폴더에 추가하여 확장할 예정입니다.

프로젝트 진행 상황과 개발 관련 내용은 `PROJECT_NOTES.md`에서 관리합니다.
