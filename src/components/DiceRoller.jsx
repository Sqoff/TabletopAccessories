import { useState, useEffect, useRef } from 'react'
import './DiceRoller.css'

const PRESET_DICE = [
  { label: 'd2 (동전)', sides: 2 },
  { label: 'd4', sides: 4 },
  { label: 'd6', sides: 6 },
  { label: 'd8', sides: 8 },
  { label: 'd10', sides: 10 },
  { label: 'd12', sides: 12 },
  { label: 'd20', sides: 20 },
  { label: 'd100', sides: 100 },
]

export default function DiceRoller() {
  const [sides, setSides] = useState(6)
  const [customSides, setCustomSides] = useState('')
  const [result, setResult] = useState(null)
  const [isRolling, setIsRolling] = useState(false)
  const [history, setHistory] = useState([])
  const [displayNumber, setDisplayNumber] = useState(6)
  const [shakeEnabled, setShakeEnabled] = useState(false)
  const [needsPermission, setNeedsPermission] = useState(false)
  const [shakeCount, setShakeCount] = useState(0)

  const isRollingRef = useRef(false)
  isRollingRef.current = isRolling

  const sidesRef = useRef(sides)
  sidesRef.current = sides

  // Check iOS permission requirement on mount
  useEffect(() => {
    if (
      typeof DeviceMotionEvent !== 'undefined' &&
      typeof DeviceMotionEvent.requestPermission === 'function'
    ) {
      setNeedsPermission(true)
    } else if (typeof window !== 'undefined' && 'ondevicemotion' in window) {
      enableMotionListener()
    }
  }, [])

  const enableMotionListener = () => {
    let lastX, lastY, lastZ
    let lastTime = 0
    const SHAKE_THRESHOLD = 16

    const handleMotion = (event) => {
      const current = event.accelerationIncludingGravity
      if (!current) return

      const currentTime = Date.now()
      if (currentTime - lastTime > 100) {
        const diffTime = currentTime - lastTime
        lastTime = currentTime

        if (lastX !== undefined) {
          const deltaX = Math.abs(current.x - lastX)
          const deltaY = Math.abs(current.y - lastY)
          const deltaZ = Math.abs(current.z - lastZ)
          const speed = ((deltaX + deltaY + deltaZ) / diffTime) * 10000

          if (speed > SHAKE_THRESHOLD) {
            setShakeCount((prev) => prev + 1)
            if (!isRollingRef.current) {
              rollDice(sidesRef.current)
            }
          }
        }

        lastX = current.x
        lastY = current.y
        lastZ = current.z
      }
    }

    window.addEventListener('devicemotion', handleMotion)
    setShakeEnabled(true)
  }

  const requestIosPermission = async () => {
    if (typeof DeviceMotionEvent.requestPermission === 'function') {
      try {
        const res = await DeviceMotionEvent.requestPermission()
        if (res === 'granted') {
          setNeedsPermission(false)
          enableMotionListener()
        } else {
          alert('가속도 센서 권한이 거부되었습니다. 버튼으로 굴릴 수 있습니다.')
        }
      } catch (err) {
        console.error('Permission error:', err)
      }
    }
  }

  const rollDice = (nSides = sides) => {
    if (isRolling) return
    setIsRolling(true)
    setResult(null)

    if (navigator.vibrate) {
      navigator.vibrate(80)
    }

    let iterations = 0
    const maxIterations = 20
    const interval = setInterval(() => {
      const tempNum = Math.floor(Math.random() * nSides) + 1
      setDisplayNumber(tempNum)
      iterations++

      if (iterations >= maxIterations) {
        clearInterval(interval)
        const finalNum = Math.floor(Math.random() * nSides) + 1
        setDisplayNumber(finalNum)
        setResult(finalNum)
        setIsRolling(false)
        setHistory((prev) => [
          { id: Date.now(), sides: nSides, result: finalNum, time: new Date().toLocaleTimeString() },
          ...prev.slice(0, 9),
        ])

        if (navigator.vibrate) {
          navigator.vibrate([50, 50, 150])
        }
      }
    }, 50)
  }

  const handleCustomSidesSubmit = (e) => {
    e.preventDefault()
    const num = parseInt(customSides, 10)
    if (num && num >= 2 && num <= 10000) {
      setSides(num)
      setResult(null)
      setDisplayNumber(num)
    }
  }

  return (
    <div className="dice-roller">
      <div className="dice-roller__header">
        <h2>{sides}면체 주사위</h2>
        <p>스마트폰을 흔들거나 아래 버튼/주사위를 터치하여 굴리세요.</p>
      </div>

      {needsPermission && (
        <div className="permission-banner">
          <span>📱 스마트폰 흔들기 센서 활성화</span>
          <button onClick={requestIosPermission}>센서 권한 허용</button>
        </div>
      )}

      {shakeEnabled && !needsPermission && (
        <div className="sensor-badge">
          <span className="sensor-indicator active" /> 기기 흔들기 감지 중 (흔든 횟수: {shakeCount})
        </div>
      )}

      <div className="dice-roller__presets">
        {PRESET_DICE.map((p) => (
          <button
            key={p.sides}
            className={`preset-btn ${sides === p.sides ? 'active' : ''}`}
            onClick={() => {
              setSides(p.sides)
              setResult(null)
              setDisplayNumber(p.sides)
            }}
          >
            {p.label}
          </button>
        ))}
      </div>

      <form className="dice-roller__custom" onSubmit={handleCustomSidesSubmit}>
        <label htmlFor="custom-sides">커스텀 N면체 (2~10000):</label>
        <div className="custom-input-group">
          <input
            id="custom-sides"
            type="number"
            min="2"
            max="10000"
            placeholder="예: 7, 30, 50"
            value={customSides}
            onChange={(e) => setCustomSides(e.target.value)}
          />
          <button type="submit">적용</button>
        </div>
      </form>

      {/* 3D Rolling Stage */}
      <div
        className={`dice-stage ${isRolling ? 'rolling' : ''}`}
        onClick={() => rollDice(sides)}
        role="button"
        tabIndex={0}
        aria-label="주사위 던지기"
      >
        <div className="dice-shape-3d">
          <div className="dice-face dice-face--front">
            <span className="dice-num">{displayNumber}</span>
            <span className="dice-sides-tag">d{sides}</span>
          </div>
        </div>
        <div className="dice-shadow" />
      </div>

      <div className="dice-roller__action">
        <button
          className="roll-main-btn"
          onClick={() => rollDice(sides)}
          disabled={isRolling}
        >
          {isRolling ? '굴러가는 중...' : `🎲 d${sides} 주사위 굴리기`}
        </button>
      </div>

      {result !== null && (
        <div className="result-announcement">
          <span className="result-label">결과값</span>
          <span className="result-value">{result}</span>
        </div>
      )}

      {history.length > 0 && (
        <div className="roll-history">
          <div className="roll-history__title">최근 굴린 기록</div>
          <div className="roll-history__list">
            {history.map((h) => (
              <div key={h.id} className="history-chip">
                <span className="chip-dice">d{h.sides}</span>
                <span className="chip-arrow">→</span>
                <span className="chip-num">{h.result}</span>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}
