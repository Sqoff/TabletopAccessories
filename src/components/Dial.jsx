import { useState } from 'react'
import './Dial.css'

const SIZE = 360
const CENTER = SIZE / 2
const DIAL_RADIUS = 160
const HOLE_COUNT = 10
const HOLE_ORBIT_RATIO = 0.8
const HOLE_RADIUS = 14
const STEP_DEG = 360 / HOLE_COUNT

function circleSubPath(cx, cy, r) {
  return `M ${cx - r},${cy} a ${r},${r} 0 1,0 ${r * 2},0 a ${r},${r} 0 1,0 ${-r * 2},0 Z`
}

export default function Dial({ variant = 'filled', pointIndices, holeIndices }) {
  const [rotation, setRotation] = useState(0)

  const handleClick = () => {
    setRotation((prev) => prev + STEP_DEG)
  }

  const orbit = DIAL_RADIUS * HOLE_ORBIT_RATIO
  const holes = Array.from({ length: HOLE_COUNT }, (_, i) => {
    const angleDeg = -90 + i * STEP_DEG
    const angleRad = (angleDeg * Math.PI) / 180
    return {
      index: i,
      cx: CENTER + orbit * Math.cos(angleRad),
      cy: CENTER + orbit * Math.sin(angleRad),
    }
  })

  const visiblePoints =
    pointIndices == null ? holes : holes.filter((h) => pointIndices.includes(h.index))
  const visibleHoles =
    holeIndices == null ? holes : holes.filter((h) => holeIndices.includes(h.index))

  const cutoutPath = [
    circleSubPath(CENTER, CENTER, DIAL_RADIUS),
    ...visibleHoles.map((h) => circleSubPath(h.cx, h.cy, HOLE_RADIUS)),
  ].join(' ')

  return (
    <svg
      className={`dial dial--${variant}`}
      width={SIZE}
      height={SIZE}
      viewBox={`0 0 ${SIZE} ${SIZE}`}
      style={{ transform: `rotate(${rotation}deg)` }}
      onClick={handleClick}
      role="button"
      aria-label="Rotate dial"
    >
      <rect
        x={0}
        y={0}
        width={SIZE}
        height={SIZE}
        fill="transparent"
        pointerEvents="all"
      />
      {variant === 'cutout' ? (
        <>
          <path
            className="dial__cutout-body"
            d={cutoutPath}
            fillRule="evenodd"
          />
          <circle
            className="dial__outline"
            cx={CENTER}
            cy={CENTER}
            r={DIAL_RADIUS}
          />
          {holes.map((h) => (
            <circle
              key={`hole-outline-${h.index}`}
              className="dial__hole-outline"
              cx={h.cx}
              cy={h.cy}
              r={HOLE_RADIUS}
            />
          ))}
        </>
      ) : (
        <>
          <circle
            className="dial__body"
            cx={CENTER}
            cy={CENTER}
            r={DIAL_RADIUS}
          />
          {visiblePoints.map((hole) => (
            <circle
              key={hole.index}
              className="dial__hole"
              cx={hole.cx}
              cy={hole.cy}
              r={HOLE_RADIUS}
            />
          ))}
        </>
      )}
    </svg>
  )
}
