import { useState, useEffect, useRef } from 'react'
import Dice3DCanvas from './Dice3DCanvas.jsx'
import './DiceRoller.css'
import './Dice3DCanvas.css'

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
  const [diceList, setDiceList] = useState([
    { id: 'dice-1', sides: 6, displayNumber: 6, result: 6 },
  ])
  const [customSides, setCustomSides] = useState('')
  const [isRolling, setIsRolling] = useState(false)
  const [shakeEnabled, setShakeEnabled] = useState(false)
  const [needsPermission, setNeedsPermission] = useState(false)
  const [shakeCount, setShakeCount] = useState(0)

  const isRollingRef = useRef(false)
  isRollingRef.current = isRolling

  const diceListRef = useRef(diceList)
  diceListRef.current = diceList

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
    // Gravity isolation filter for devices where event.acceleration is null
    const gravity = { x: 0, y: 0, z: 0 }
    let lastTriggerTime = 0
    const motionHistory = []

    // Calibrated thresholds for intentional dice throwing flicks:
    // - Idle/holding tremor: < 1.5 m/s²
    // - Walking/normal handling: 3 ~ 8 m/s²
    // - Intentional dice-throwing flick gesture: >= 22 ~ 28 m/s²
    const SHAKE_PEAK_THRESHOLD = 22.0 // m/s²
    const HARD_THROW_THRESHOLD = 28.0 // m/s²
    const COOLDOWN_MS = 1400 // 1.4s debounce cooldown

    const handleMotion = (event) => {
      const now = performance.now()
      if (now - lastTriggerTime < COOLDOWN_MS || isRollingRef.current) return

      let ax = 0
      let ay = 0
      let az = 0

      // 1. Primary: Use hardware-isolated linear acceleration (excludes gravity)
      if (
        event.acceleration &&
        event.acceleration.x !== null &&
        typeof event.acceleration.x === 'number'
      ) {
        ax = event.acceleration.x || 0
        ay = event.acceleration.y || 0
        az = event.acceleration.z || 0
      } else if (event.accelerationIncludingGravity) {
        // 2. Fallback: High-Pass Filter (HPF) on raw acceleration
        const raw = event.accelerationIncludingGravity
        if (typeof raw.x !== 'number') return

        const alpha = 0.82
        gravity.x = alpha * gravity.x + (1 - alpha) * (raw.x || 0)
        gravity.y = alpha * gravity.y + (1 - alpha) * (raw.y || 0)
        gravity.z = alpha * gravity.z + (1 - alpha) * (raw.z || 0)

        ax = (raw.x || 0) - gravity.x
        ay = (raw.y || 0) - gravity.y
        az = (raw.z || 0) - gravity.z
      } else {
        return
      }

      // Linear acceleration magnitude
      const magnitude = Math.hypot(ax, ay, az)

      // Maintain a sliding window of recent samples (last 350ms)
      motionHistory.push({ mag: magnitude, time: now, ax, ay, az })
      while (motionHistory.length > 0 && now - motionHistory[0].time > 350) {
        motionHistory.shift()
      }

      // Check for intentional throw/shake gesture
      let isThrowDetected = false

      if (magnitude >= HARD_THROW_THRESHOLD) {
        // Decisive strong throwing flick
        isThrowDetected = true
      } else if (magnitude >= SHAKE_PEAK_THRESHOLD) {
        // Count distinct peaks or reversals in the 350ms window
        let peakCount = 0
        for (let i = 1; i < motionHistory.length - 1; i++) {
          const prev = motionHistory[i - 1].mag
          const curr = motionHistory[i].mag
          const next = motionHistory[i + 1].mag
          if (curr > prev && curr > next && curr >= 18.0) {
            peakCount++
          }
        }

        if (peakCount >= 2 || motionHistory.some((s) => s.mag >= HARD_THROW_THRESHOLD)) {
          isThrowDetected = true
        }
      }

      if (isThrowDetected) {
        lastTriggerTime = now
        motionHistory.length = 0
        setShakeCount((prev) => prev + 1)
        rollAllDice()
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

  // Add a new die to the tray
  const addDie = (sides) => {
    if (diceList.length >= 12) {
      alert('동시에 최대 12개까지 주사위를 추가할 수 있습니다.')
      return
    }
    const newId = `dice-${Date.now()}-${Math.random().toString(36).substr(2, 5)}`
    setDiceList((prev) => [
      ...prev,
      { id: newId, sides, displayNumber: sides, result: sides },
    ])
  }

  // Remove a specific die
  const removeDie = (id) => {
    if (diceList.length <= 1) {
      alert('최소 1개의 주사위가 필요합니다.')
      return
    }
    setDiceList((prev) => prev.filter((d) => d.id !== id))
  }

  // Reset to single d6
  const resetToOneDie = () => {
    setDiceList([
      { id: `dice-${Date.now()}`, sides: 6, displayNumber: 6, result: 6 },
    ])
  }

  // Roll all active dice together
  const rollAllDice = () => {
    if (isRolling) return
    setIsRolling(true)

    if (navigator.vibrate) {
      navigator.vibrate(80)
    }

    let iterations = 0
    const maxIterations = 20
    const interval = setInterval(() => {
      setDiceList((prev) =>
        prev.map((d) => ({
          ...d,
          displayNumber: Math.floor(Math.random() * d.sides) + 1,
        }))
      )
      iterations++

      if (iterations >= maxIterations) {
        clearInterval(interval)
        setDiceList((prev) =>
          prev.map((d) => {
            const finalNum = Math.floor(Math.random() * d.sides) + 1
            return {
              ...d,
              displayNumber: finalNum,
              result: finalNum,
            }
          })
        )
        setIsRolling(false)

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
      addDie(num)
      setCustomSides('')
    }
  }

  // Calculate sum and statistics
  const totalSum = diceList.reduce((acc, d) => acc + (d.result || 0), 0)
  const isAllSettled = !isRolling

  return (
    <div className="dice-roller">
      <div className="dice-roller__header">
        <h2>3D 다이스 트레이 ({diceList.length}개 주사위)</h2>
        <p>아래 버튼을 눌러 주사위를 추가하고, 트레이 안에서 한꺼번에 굴려보세요.</p>
      </div>

      {needsPermission && (
        <div className="permission-banner">
          <span>📱 스마트폰 흔들기 센서 활성화</span>
          <button onClick={requestIosPermission}>센서 권한 허용</button>
        </div>
      )}

      {shakeEnabled && !needsPermission && (
        <div className="sensor-badge">
          <span className="sensor-indicator active" /> 던지듯 흔들기 감지 활성화 (감지 횟수: {shakeCount})
        </div>
      )}

      {/* Preset Dice Adding Buttons */}
      <div className="dice-roller__presets-section">
        <div className="presets-label">주사위 추가 (클릭 시 트레이에 추가):</div>
        <div className="dice-roller__presets">
          {PRESET_DICE.map((p) => (
            <button
              key={p.sides}
              className="preset-btn add-btn"
              onClick={() => addDie(p.sides)}
              disabled={isRolling}
            >
              + {p.label}
            </button>
          ))}
        </div>
      </div>

      <form className="dice-roller__custom" onSubmit={handleCustomSidesSubmit}>
        <label htmlFor="custom-sides">커스텀 N면체 추가 (2~10000):</label>
        <div className="custom-input-group">
          <input
            id="custom-sides"
            type="number"
            min="2"
            max="10000"
            placeholder="예: 7, 30, 50"
            value={customSides}
            onChange={(e) => setCustomSides(e.target.value)}
            disabled={isRolling}
          />
          <button type="submit" disabled={isRolling}>+ 추가</button>
        </div>
      </form>

      {/* Active Dice Tray Tag Manager */}
      <div className="active-dice-tray-bar">
        <div className="active-dice-list">
          {diceList.map((d, index) => (
            <div key={d.id} className="active-die-chip">
              <span className="active-die-label">#{index + 1} d{d.sides}</span>
              {diceList.length > 1 && (
                <button
                  className="active-die-del-btn"
                  onClick={() => removeDie(d.id)}
                  title="이 주사위 제거"
                  disabled={isRolling}
                >
                  ✕
                </button>
              )}
            </div>
          ))}
        </div>
        {diceList.length > 1 && (
          <button className="clear-all-dice-btn" onClick={resetToOneDie} disabled={isRolling}>
            주사위 1개로 초기화
          </button>
        )}
      </div>

      {/* 3D WebGL Multi-Dice Stage */}
      <div className="dice-stage-3d-wrapper">
        <Dice3DCanvas
          diceList={diceList}
          isRolling={isRolling}
          onThrow={rollAllDice}
        />
        <div className="dice-stage-hint">
          <span>✋ 주사위를 집어 올려 던지거나, 기기를 흔들어 한꺼번에 굴려보세요</span>
        </div>
      </div>

      <div className="dice-roller__action">
        <button
          className="roll-main-btn"
          onClick={rollAllDice}
          disabled={isRolling}
        >
          {isRolling ? '굴러가는 중...' : `🎲 주사위 ${diceList.length}개 한꺼번에 굴리기`}
        </button>
      </div>

      {/* All Objects Result Summary Board (Replaces Recent History) */}
      <div className="multi-dice-results-board">
        <div className="results-board__header">
          <div className="results-board__title">
            <span className="results-icon">📊</span>
            <span>주사위 굴림 결과 ({diceList.length}개)</span>
          </div>
          {isAllSettled && (
            <div className="total-sum-badge">
              <span className="sum-label">총합 (Sum)</span>
              <span className="sum-value">{totalSum}</span>
            </div>
          )}
        </div>

        <div className="results-grid">
          {diceList.map((d, index) => (
            <div key={d.id} className="result-card">
              <div className="result-card__top">
                <span className="result-die-tag">d{d.sides}</span>
                <span className="result-die-index">#{index + 1}</span>
              </div>
              <div className="result-card__body">
                <span className={`result-number ${isRolling ? 'rolling' : ''}`}>
                  {d.displayNumber}
                </span>
              </div>
            </div>
          ))}
        </div>

        {diceList.length > 1 && isAllSettled && (
          <div className="results-stats-row">
            <div className="stat-item">
              <span className="stat-label">주사위 수:</span>
              <span className="stat-val">{diceList.length}개</span>
            </div>
            <div className="stat-item">
              <span className="stat-label">평균값:</span>
              <span className="stat-val">{(totalSum / diceList.length).toFixed(1)}</span>
            </div>
            <div className="stat-item">
              <span className="stat-label">최소 / 최대:</span>
              <span className="stat-val">
                {Math.min(...diceList.map((d) => d.result || 0))} /{' '}
                {Math.max(...diceList.map((d) => d.result || 0))}
              </span>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
