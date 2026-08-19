# 프로젝트 협업 메모

## 현재 상태

- GitHub 저장소: `hayul090615/geuphaeyo-hwajangsil`
- 기본 브랜치: `main`
- 현재 프로젝트는 정적 웹 프로젝트입니다: `index.html`, `main.js`, `style.css`
- GitHub에 첫 커밋과 원격 저장소 연결이 완료되어 있습니다.

## main 브랜치 규칙

- `main`에 직접 푸시하지 않습니다.
- 변경은 Pull Request(PR)를 통해서만 병합합니다.
- 병합 전 공동작업자의 승인 1개가 필요합니다.
- 새 커밋이 올라오면 이전 승인은 다시 받아야 합니다.
- 강제 푸시와 브랜치 삭제는 금지됩니다.

## 작업 순서

1. 최신 `main`을 받습니다.
2. 기능별 브랜치를 만듭니다. 예: `feat/home-page`
3. 브랜치에서 작업하고 커밋합니다.
4. GitHub에 브랜치를 푸시한 뒤 Pull Request를 만듭니다.
5. 상대가 검토하고 승인하면 `main`에 병합합니다.

## 자주 쓰는 명령

```powershell
git switch main
git pull origin main
git switch -c feat/feature-name
git add .
git commit -m "feat: describe change"
git push -u origin feat/feature-name
```

Git 명령이 인식되지 않으면 VS Code를 완전히 종료한 뒤 다시 열어 보세요.
