import './TopBar.css'

export default function TopBar({ title, onBack }) {
  return (
    <header className="top-bar">
      <button className="top-bar__back-btn" onClick={onBack} aria-label="메인 메뉴로 이동">
        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
          <line x1="19" y1="12" x2="5" y2="12"></line>
          <polyline points="12 19 5 12 12 5"></polyline>
        </svg>
        <span>메뉴</span>
      </button>
      <h1 className="top-bar__title">{title}</h1>
      <div className="top-bar__spacer" />
    </header>
  )
}
