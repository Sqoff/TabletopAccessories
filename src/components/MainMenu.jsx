import './MainMenu.css'

const FEATURES = [
  {
    id: 'dial',
    title: '이중 회전 다이얼',
    subtitle: 'Dual Rotating Dial',
    description: '10포인트 슬롯 창을 회전시켜 상태나 점수를 표시하는 이중 링 카운터',
    icon: (
      <svg viewBox="0 0 24 24" width="32" height="32" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <circle cx="12" cy="12" r="9" />
        <circle cx="12" cy="12" r="5" strokeDasharray="3 3" />
        <circle cx="12" cy="6" r="1.5" fill="currentColor" />
        <circle cx="18" cy="12" r="1.5" fill="currentColor" />
        <circle cx="12" cy="18" r="1.5" fill="currentColor" />
      </svg>
    ),
    badge: '카운터',
    color: '#2563eb',
  },
  {
    id: 'touch-picker',
    title: '멀티 터치 순서/선 뽑기',
    subtitle: 'Multi-Touch Finger Picker',
    description: '여러 명이 화면에 손가락을 동시에 올려놓으면 1명을 무작위로 추첨',
    icon: (
      <svg viewBox="0 0 24 24" width="32" height="32" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <path d="M18 11V6a2 2 0 0 0-2-2v0a2 2 0 0 0-2 2v0" />
        <path d="M14 10V4a2 2 0 0 0-2-2v0a2 2 0 0 0-2 2v2" />
        <path d="M10 10.5V6a2 2 0 0 0-2-2v0a2 2 0 0 0-2 2v8" />
        <path d="M18 8a2 2 0 1 1 4 0v6a8 8 0 0 1-8 8h-2c-2.8 0-4.5-.86-5.99-2.34l-3.6-3.6a2 2 0 0 1 2.83-2.82L7 15" />
      </svg>
    ),
    badge: '멀티 터치',
    color: '#10b981',
  },
  {
    id: 'dice',
    title: 'N면체 주사위 & 쉐이크',
    subtitle: 'N-Sided Dice Roller',
    description: '2~N면체 주사위 롤링. 스마트폰 흔들기(Shake) 및 터치 던지기 지원',
    icon: (
      <svg viewBox="0 0 24 24" width="32" height="32" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <rect x="3" y="3" width="18" height="18" rx="4" />
        <circle cx="8.5" cy="8.5" r="1.5" fill="currentColor" />
        <circle cx="15.5" cy="8.5" r="1.5" fill="currentColor" />
        <circle cx="12" cy="12" r="1.5" fill="currentColor" />
        <circle cx="8.5" cy="15.5" r="1.5" fill="currentColor" />
        <circle cx="15.5" cy="15.5" r="1.5" fill="currentColor" />
      </svg>
    ),
    badge: '센서 / 물리',
    color: '#8b5cf6',
  },
]

export default function MainMenu({ onSelectFeature }) {
  return (
    <div className="main-menu">
      <header className="main-menu__header">
        <div className="main-menu__badge">Tabletop Web Tools</div>
        <h1 className="main-menu__title">테이블탑 액세서리</h1>
        <p className="main-menu__description">
          보드게임과 테이블탑 플레이를 위한 반응형 웹 유틸리티 모음입니다.<br />
          사용할 기능을 선택해 주세요.
        </p>
      </header>

      <div className="main-menu__grid">
        {FEATURES.map((feat) => (
          <button
            key={feat.id}
            className="feature-card"
            onClick={() => onSelectFeature(feat.id)}
            style={{ '--accent-color': feat.color }}
          >
            <div className="feature-card__top">
              <div className="feature-card__icon-wrapper">{feat.icon}</div>
              <span className="feature-card__badge">{feat.badge}</span>
            </div>
            <div className="feature-card__body">
              <h2 className="feature-card__title">{feat.title}</h2>
              <div className="feature-card__subtitle">{feat.subtitle}</div>
              <p className="feature-card__desc">{feat.description}</p>
            </div>
            <div className="feature-card__footer">
              <span>기능 시작하기</span>
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                <line x1="5" y1="12" x2="19" y2="12"></line>
                <polyline points="12 5 19 12 12 19"></polyline>
              </svg>
            </div>
          </button>
        ))}
      </div>

      <footer className="main-menu__footer-info">
        <p>💡 모바일 기기 접속 시 멀티 터치 및 흔들기 가속도 센서가 자동으로 활성화됩니다.</p>
      </footer>
    </div>
  )
}
