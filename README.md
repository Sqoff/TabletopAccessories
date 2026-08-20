# TabletopAccessories

보드게임 및 테이블탑 플레이를 위한 반응형 웹 액세서리 도구 모음입니다. React + Vite로 구현되었습니다.

## 🚀 기술 스택

- React 18
- Vite 5
- Node.js >= 24

## 📱 실행 방법

```bash
npm install
npm run dev
```

브라우저에서 `http://localhost:5173/` 로 접속합니다.

같은 네트워크의 모바일 기기(스마트폰/태블릿)에서 접속하려면:

```bash
npm run dev -- --host
```

빌드:

```bash
npm run build
npm run preview
```

---

## 🛠️ 제공 기능

### 1. 메인 메뉴 (초기 진입 허브)
- 모든 기능을 한눈에 보고 원하는 도구로 빠르게 이동할 수 있는 반응형 허브 화면입니다.
- 각 기능 화면 상단의 `← 메뉴` 버튼을 통해 언제든지 초기 화면으로 돌아올 수 있습니다.

### 2. 이중 회전 다이얼 (Dual Dial)
- **10포인트 슬롯 창 회전 다이얼 카운터**
- 다이얼을 탭/클릭하면 36°씩 시계방향으로 회전하여 안쪽 포인트의 노출 상태를 조절할 수 있습니다.

### 3. 멀티 터치 선/순서 뽑기 (Multi-Touch Finger Picker)
- **모바일/태블릿 동시 터치 감지** (`Touch Events API`)
- 여러 명이 화면에 동시에 손가락을 대면 2.5초 카운트다운 후 1명을 무작위로 당첨자로 선정합니다.
- 데스크탑 환경에서는 마우스 클릭으로 터치 포인트를 추가하여 시뮬레이션할 수 있습니다.

### 4. N면체 주사위 롤러 & 쉐이크 (N-Sided Dice Roller)
- **2~N면체 주사위 지원** (d2 동전, d4, d6, d8, d10, d12, d20, d100 및 임의의 커스텀 N면체)
- **스마트폰 흔들기 감지** (`DeviceMotionEvent` 가속도 센서 연동, iOS 권한 허용 지원)
- 굴리기 애니메이션, 윗면 결과 감지 및 최근 굴린 기록 히스토리 제공

---

## 📁 프로젝트 구조

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
        ├── MainMenu.jsx / MainMenu.css     # 초기 진입 허브 화면
        ├── TopBar.jsx / TopBar.css         # 상단 네비게이션 & 뒤로가기
        ├── Dial.jsx / Dial.css             # 기본 다이얼 SVG 컴포넌트
        ├── DualDialView.jsx / .css         # 이중 다이얼 뷰
        ├── MultiTouchPicker.jsx / .css     # 멀티터치 순서 뽑기 뷰
        └── DiceRoller.jsx / .css           # N면체 주사위 & 흔들기 뷰
```
