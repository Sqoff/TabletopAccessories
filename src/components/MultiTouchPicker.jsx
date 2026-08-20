import { useState, useRef, useEffect } from 'react'
import './MultiTouchPicker.css'

const COLORS = [
  '#ef4444', '#3b82f6', '#10b981', '#f59e0b',
  '#8b5cf6', '#ec4899', '#06b6d4', '#84cc16',
  '#f97316', '#6366f1'
]

export default function MultiTouchPicker() {
  const containerRef = useRef(null)
  const [touches, setTouches] = useState([])
  const [winnerId, setWinnerId] = useState(null)
  const [countdown, setCountdown] = useState(null)
  const countdownTimerRef = useRef(null)
  const [isDesktopMode, setIsDesktopMode] = useState(false)

  // Track touches with stable colors
  const colorMapRef = useRef(new Map())

  const getColor = (id) => {
    if (!colorMapRef.current.has(id)) {
      const unusedColor = COLORS.find(c => ![...colorMapRef.current.values()].includes(c)) || COLORS[colorMapRef.current.size % COLORS.length]
      colorMapRef.current.set(id, unusedColor)
    }
    return colorMapRef.current.get(id)
  }

  // Handle countdown & picking winner
  useEffect(() => {
    // If winner is already selected, don't restart countdown
    if (winnerId !== null) return

    if (touches.length >= 2) {
      if (!countdown) {
        setCountdown(2.5)
      }
    } else {
      // Less than 2 touches
      if (countdownTimerRef.current) clearInterval(countdownTimerRef.current)
      setCountdown(null)
    }
  }, [touches.length, winnerId])

  useEffect(() => {
    if (countdown !== null && countdown > 0) {
      countdownTimerRef.current = setTimeout(() => {
        setCountdown(prev => {
          if (prev <= 0.1) {
            // Pick winner!
            if (touches.length >= 2) {
              const randomIndex = Math.floor(Math.random() * touches.length)
              const selectedWinner = touches[randomIndex].id
              setWinnerId(selectedWinner)
              if (navigator.vibrate) {
                navigator.vibrate([100, 50, 200])
              }
            }
            return null
          }
          return Number((prev - 0.1).toFixed(1))
        })
      }, 100)
    }

    return () => {
      if (countdownTimerRef.current) clearTimeout(countdownTimerRef.current)
    }
  }, [countdown, touches])

  const handleTouchUpdate = (e) => {
    e.preventDefault()
    if (winnerId !== null) return // keep showing winner until all lifted

    const rect = containerRef.current.getBoundingClientRect()
    const activeTouches = Array.from(e.touches).map((t) => ({
      id: t.identifier,
      x: t.clientX - rect.left,
      y: t.clientY - rect.top,
      color: getColor(t.identifier)
    }))

    setTouches(activeTouches)

    if (activeTouches.length === 0) {
      setWinnerId(null)
      setCountdown(null)
      colorMapRef.current.clear()
    }
  }

  // Desktop click simulation
  const handleDesktopClick = (e) => {
    if ('ontouchstart' in window && navigator.maxTouchPoints > 0) return // mobile touch will handle
    if (winnerId !== null) return

    const rect = containerRef.current.getBoundingClientRect()
    const x = e.clientX - rect.left
    const y = e.clientY - rect.top

    // Check if clicked existing mock touch
    const existingIndex = touches.findIndex(t => Math.hypot(t.x - x, t.y - y) < 40)
    if (existingIndex >= 0) {
      setTouches(prev => prev.filter((_, i) => i !== existingIndex))
    } else {
      const newId = Date.now() + Math.random()
      setTouches(prev => [
        ...prev,
        { id: newId, x, y, color: getColor(newId) }
      ])
    }
    setIsDesktopMode(true)
  }

  const resetAll = () => {
    setTouches([])
    setWinnerId(null)
    setCountdown(null)
    colorMapRef.current.clear()
  }

  return (
    <div className="touch-picker">
      <div className="touch-picker__header">
        <div className="touch-picker__status">
          {winnerId !== null ? (
            <span className="status-badge status-badge--winner">🎉 당첨자가 선정되었습니다!</span>
          ) : countdown !== null ? (
            <span className="status-badge status-badge--counting">
              ⏳ 추첨 중... {countdown.toFixed(1)}s
            </span>
          ) : touches.length > 0 ? (
            <span className="status-badge">👆 터치 인식 중 ({touches.length}명)</span>
          ) : (
            <span className="status-badge status-badge--idle">화면에 손가락을 올려놓으세요 (2인 이상)</span>
          )}
        </div>
      </div>

      <div
        ref={containerRef}
        className={`touch-picker__canvas ${winnerId !== null ? 'has-winner' : ''}`}
        onTouchStart={handleTouchUpdate}
        onTouchMove={handleTouchUpdate}
        onTouchEnd={handleTouchUpdate}
        onTouchCancel={handleTouchUpdate}
        onClick={handleDesktopClick}
      >
        {touches.length === 0 && (
          <div className="touch-picker__placeholder">
            <div className="placeholder-icon">🖐️</div>
            <h3>화면에 2명 이상 손가락을 대세요</h3>
            <p>2.5초 후 1명이 무작위로 추첨됩니다.</p>
            <p className="desktop-hint">(데스크탑: 마우스 클릭으로 터치 포인트를 추가할 수 있습니다)</p>
          </div>
        )}

        {touches.map((t) => {
          const isWinner = winnerId === t.id
          const isLoser = winnerId !== null && !isWinner
          return (
            <div
              key={t.id}
              className={`touch-point ${isWinner ? 'winner' : ''} ${isLoser ? 'loser' : ''}`}
              style={{
                left: `${t.x}px`,
                top: `${t.y}px`,
                '--touch-color': t.color
              }}
            >
              <div className="touch-point__ripple" />
              <div className="touch-point__core" />
              {isWinner && <div className="touch-point__crown">👑 당첨!</div>}
            </div>
          )
        })}

        {countdown !== null && winnerId === null && (
          <div className="countdown-indicator">
            <div className="countdown-ring" style={{ animationDuration: '2.5s' }} />
            <div className="countdown-text">{Math.ceil(countdown)}</div>
          </div>
        )}
      </div>

      <div className="touch-picker__footer">
        <button className="touch-picker__reset-btn" onClick={resetAll}>
          초기화
        </button>
        {isDesktopMode && touches.length >= 2 && winnerId === null && (
          <button
            className="touch-picker__action-btn"
            onClick={() => {
              const randomIndex = Math.floor(Math.random() * touches.length)
              setWinnerId(touches[randomIndex].id)
            }}
          >
            🎲 즉시 추첨하기
          </button>
        )}
      </div>
    </div>
  )
}
