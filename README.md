# TabletopAccessories

회전 가능한 이중 다이얼 컴포넌트 예제. React + Vite로 구현되었습니다.

## 기술 스택

- React 18
- Vite 5
- Node.js >= 24

## 실행

```bash
npm install
npm run dev
```

브라우저에서 http://localhost:5173/ 로 접속합니다.

같은 네트워크의 모바일 기기에서 접속하려면:

```bash
npm run dev -- --host
```

빌드:

```bash
npm run build
npm run preview
```

## 프로젝트 구조

```
TabletopAccessories/
├── index.html
├── package.json
├── vite.config.js
└── src/
    ├── main.jsx
    ├── App.jsx
    ├── App.css
    └── components/
        ├── Dial.jsx
        └── Dial.css
```

## 다이얼 구성

두 개의 다이얼이 같은 중심에 겹쳐 표시됩니다.

### 안 다이얼 (filled 변형)

- 검은 외곽선 원 + 둘레에 검은 점(포인트)
- 12시 방향을 인덱스 0으로 하고 시계방향으로 0~9 위치
- 현재 보이는 포인트: `[0, 1, 2, 3, 4]` (앞쪽 5개)

### 밖 다이얼 (cutout 변형)

- 흰색으로 채워진 본체로 안 다이얼을 가림
- `<path>`의 `fill-rule="evenodd"`로 구멍 위치를 잘라내어 안 다이얼이 들여다보이는 창을 만듦
- 모든 10개 위치에 연한 회색(`#cccccc`) 테두리를 그려 구멍 위치를 시각화
- 현재 잘라낸 구멍: `[0, 5, 6, 7, 8, 9]` (앞쪽 1개 + 뒤쪽 5개)

### 인터랙션

- 다이얼을 클릭하면 시계방향으로 36° (= 360°/10) 회전
- 전환: 0.3초 ease 트랜지션
- 밖 다이얼이 앞에 있어 클릭은 밖 다이얼만 회전시킴

## Dial 컴포넌트 Props

| Prop | 타입 | 기본값 | 설명 |
|------|------|--------|------|
| `variant` | `'filled' \| 'cutout'` | `'filled'` | 다이얼 종류 |
| `pointIndices` | `number[]` | 전체 10개 | filled 변형에서 표시할 검은 점 위치 |
| `holeIndices` | `number[]` | 전체 10개 | cutout 변형에서 잘라낼 구멍 위치 |

## 모바일 대응

- 각 SVG에 `pointer-events="all"` 투명 캡처 사각형을 두어 투명 영역에서도 탭이 안정적으로 잡힘
- `.dial`에 `touch-action: manipulation`을 적용해 모바일 300ms 더블탭 지연 제거
