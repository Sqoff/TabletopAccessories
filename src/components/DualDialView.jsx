import { useState } from 'react'
import Dial from './Dial.jsx'
import './DualDialView.css'

export default function DualDialView() {
  const [key, setKey] = useState(0)

  const handleReset = () => {
    setKey((prev) => prev + 1)
  }

  return (
    <div className="dial-view">
      <div className="dial-view__header">
        <h2>이중 회전 다이얼</h2>
        <p>다이얼을 탭하거나 클릭하면 36° (1칸) 씩 시계방향으로 회전합니다.</p>
      </div>

      <div className="dial-view__stage">
        <div key={key} className="dial-stack">
          <Dial variant="filled" pointIndices={[0, 1, 2, 3, 4]} />
          <Dial variant="cutout" holeIndices={[0, 5, 6, 7, 8, 9]} />
        </div>
      </div>

      <div className="dial-view__controls">
        <button className="dial-view__btn" onClick={handleReset}>
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
            <polyline points="1 4 1 10 7 10"></polyline>
            <path d="M3.51 15a9 9 0 1 0 2.13-9.36L1 10"></path>
          </svg>
          다이얼 초기화
        </button>
      </div>

      <div className="dial-view__info-card">
        <h3>💡 다이얼 구성 설명</h3>
        <ul>
          <li><strong>안쪽 다이얼:</strong> 검은 점 5개가 둘레에 배치되어 있습니다.</li>
          <li><strong>바깥쪽 다이얼:</strong> 구멍(창) 6개가 뚫려 있어 회전 시 안쪽 점의 노출 개수가 변화합니다.</li>
        </ul>
      </div>
    </div>
  )
}
