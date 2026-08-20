import { useEffect, useRef } from 'react'
import * as THREE from 'three'

// Helper: Generate crisp CanvasTexture for face numbers
function createNumberTexture(num, label = '', bgColor = '#7c3aed', textColor = '#ffffff') {
  const canvas = document.createElement('canvas')
  canvas.width = 256
  canvas.height = 256
  const ctx = canvas.getContext('2d')

  // Background
  ctx.fillStyle = bgColor
  ctx.fillRect(0, 0, 256, 256)

  // Inner border
  ctx.strokeStyle = 'rgba(255, 255, 255, 0.4)'
  ctx.lineWidth = 8
  ctx.strokeRect(12, 12, 232, 232)

  // Corner highlights
  ctx.fillStyle = 'rgba(255, 255, 255, 0.15)'
  ctx.fillRect(16, 16, 30, 30)

  // Number text
  ctx.fillStyle = textColor
  ctx.textAlign = 'center'
  ctx.textBaseline = 'middle'

  const str = String(num)
  if (str.length <= 2) {
    ctx.font = 'bold 110px system-ui, -apple-system, sans-serif'
  } else if (str.length === 3) {
    ctx.font = 'bold 85px system-ui, -apple-system, sans-serif'
  } else {
    ctx.font = 'bold 65px system-ui, -apple-system, sans-serif'
  }

  // Underline for 6 and 9
  if (num === 6 || num === 9) {
    ctx.fillText(str, 128, 120)
    ctx.lineWidth = 10
    ctx.strokeStyle = textColor
    ctx.beginPath()
    ctx.moveTo(90, 185)
    ctx.lineTo(166, 185)
    ctx.stroke()
  } else {
    ctx.fillText(str, 128, label ? 115 : 128)
  }

  if (label) {
    ctx.font = 'bold 26px system-ui, -apple-system, sans-serif'
    ctx.fillStyle = 'rgba(255, 255, 255, 0.8)'
    ctx.fillText(label, 128, 195)
  }

  const texture = new THREE.CanvasTexture(canvas)
  texture.anisotropy = 4
  return texture
}

// Set fixed default orientation so numbers are face-front and readable without rotating constantly
function setDefaultOrientation(mesh, nSides) {
  if (!mesh) return
  if (nSides === 2) {
    // Coin: tilt slightly forward to display top face clearly
    mesh.rotation.set(0.45, 0, 0)
  } else if (nSides === 6) {
    // Cube: gentle 3D perspective
    mesh.rotation.set(0.2, 0.35, 0)
  } else {
    // Polyhedra: gentle angle
    mesh.rotation.set(0.2, 0.25, 0)
  }
}

export default function Dice3DCanvas({ sides, isRolling, currentNumber, onThrow }) {
  const mountRef = useRef(null)
  const sceneRef = useRef(null)
  const rendererRef = useRef(null)
  const cameraRef = useRef(null)
  const diceMeshRef = useRef(null)
  const animationFrameRef = useRef(null)
  const isDraggingRef = useRef(false)
  const previousMousePosition = useRef({ x: 0, y: 0 })
  const dragVelocity = useRef({ x: 0, y: 0 })
  const lastMoveTime = useRef(0)

  // Create geometry & materials based on sides
  const createDiceMesh = (nSides, targetNumber) => {
    let geometry
    let materials

    const baseMaterialProps = {
      roughness: 0.2,
      metalness: 0.15,
    }

    if (nSides === 2) {
      // Coin (d2)
      geometry = new THREE.CylinderGeometry(1.6, 1.6, 0.35, 32)
      const edgeMat = new THREE.MeshStandardMaterial({
        color: 0xd97706,
        metalness: 0.8,
        roughness: 0.3,
      })
      const topMat = new THREE.MeshStandardMaterial({
        map: createNumberTexture(1, 'HEADS', '#b45309'),
        ...baseMaterialProps,
      })
      const bottomMat = new THREE.MeshStandardMaterial({
        map: createNumberTexture(2, 'TAILS', '#92400e'),
        ...baseMaterialProps,
      })
      materials = [edgeMat, topMat, bottomMat]
    } else if (nSides === 6) {
      // Cube (d6)
      geometry = new THREE.BoxGeometry(2, 2, 2)
      const faceNums = [1, 6, 2, 5, 3, 4]
      materials = faceNums.map((num) =>
        new THREE.MeshStandardMaterial({
          map: createNumberTexture(num, '', '#7c3aed'),
          ...baseMaterialProps,
        })
      )
    } else if (nSides === 4) {
      // Tetrahedron (d4)
      geometry = new THREE.TetrahedronGeometry(1.8)
      materials = new THREE.MeshStandardMaterial({
        map: createNumberTexture(targetNumber || 4, 'd4', '#6366f1'),
        ...baseMaterialProps,
        flatShading: true,
      })
    } else if (nSides === 8) {
      // Octahedron (d8)
      geometry = new THREE.OctahedronGeometry(1.8)
      materials = new THREE.MeshStandardMaterial({
        map: createNumberTexture(targetNumber || 8, 'd8', '#8b5cf6'),
        ...baseMaterialProps,
        flatShading: true,
      })
    } else if (nSides === 10) {
      // d10
      geometry = new THREE.CylinderGeometry(1.6, 1.6, 1.4, 10)
      const sideMat = new THREE.MeshStandardMaterial({
        map: createNumberTexture(targetNumber || 10, 'd10', '#9333ea'),
        ...baseMaterialProps,
      })
      materials = sideMat
    } else if (nSides === 12) {
      // Dodecahedron (d12)
      geometry = new THREE.DodecahedronGeometry(1.7)
      materials = new THREE.MeshStandardMaterial({
        map: createNumberTexture(targetNumber || 12, 'd12', '#a855f7'),
        ...baseMaterialProps,
        flatShading: true,
      })
    } else if (nSides === 20) {
      // Icosahedron (d20)
      geometry = new THREE.IcosahedronGeometry(1.8)
      materials = new THREE.MeshStandardMaterial({
        map: createNumberTexture(targetNumber || 20, 'd20', '#7e22ce'),
        ...baseMaterialProps,
        flatShading: true,
      })
    } else {
      // Custom N
      geometry = new THREE.DodecahedronGeometry(1.75, Math.min(Math.floor(nSides / 20), 2))
      materials = new THREE.MeshStandardMaterial({
        map: createNumberTexture(targetNumber || nSides, `d${nSides}`, '#6d28d9'),
        ...baseMaterialProps,
        flatShading: true,
      })
    }

    const mesh = new THREE.Mesh(geometry, materials)
    mesh.castShadow = true
    mesh.receiveShadow = true
    return mesh
  }

  // Setup Three.js Scene
  useEffect(() => {
    const container = mountRef.current
    if (!container) return

    const width = container.clientWidth || 280
    const height = container.clientHeight || 280

    const scene = new THREE.Scene()
    sceneRef.current = scene

    const camera = new THREE.PerspectiveCamera(45, width / height, 0.1, 100)
    camera.position.set(0, 0, 6.2)
    cameraRef.current = camera

    const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true })
    renderer.setSize(width, height)
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2))
    renderer.shadowMap.enabled = true
    renderer.shadowMap.type = THREE.PCFSoftShadowMap
    rendererRef.current = renderer

    container.replaceChildren(renderer.domElement)

    // Lighting
    const ambientLight = new THREE.AmbientLight(0xffffff, 1.2)
    scene.add(ambientLight)

    const dirLight1 = new THREE.DirectionalLight(0xffffff, 2.0)
    dirLight1.position.set(5, 8, 5)
    dirLight1.castShadow = true
    scene.add(dirLight1)

    const dirLight2 = new THREE.DirectionalLight(0xa78bfa, 1.2)
    dirLight2.position.set(-5, -4, -3)
    scene.add(dirLight2)

    // Initial Dice Mesh (Stationary)
    const mesh = createDiceMesh(sides, currentNumber)
    setDefaultOrientation(mesh, sides)
    diceMeshRef.current = mesh
    scene.add(mesh)

    // Render loop (no auto-rotation when idle)
    const animate = () => {
      animationFrameRef.current = requestAnimationFrame(animate)
      renderer.render(scene, camera)
    }
    animate()

    // Handle resize
    const handleResize = () => {
      if (!container || !renderer || !camera) return
      const w = container.clientWidth
      const h = container.clientHeight
      camera.aspect = w / h
      camera.updateProjectionMatrix()
      renderer.setSize(w, h)
    }
    window.addEventListener('resize', handleResize)

    return () => {
      window.removeEventListener('resize', handleResize)
      if (animationFrameRef.current) cancelAnimationFrame(animationFrameRef.current)
      renderer.dispose()
    }
  }, [])

  // Update mesh when sides or current number changes
  useEffect(() => {
    if (!sceneRef.current) return

    if (diceMeshRef.current) {
      sceneRef.current.remove(diceMeshRef.current)
      if (diceMeshRef.current.geometry) diceMeshRef.current.geometry.dispose()
      if (Array.isArray(diceMeshRef.current.material)) {
        diceMeshRef.current.material.forEach((m) => m.dispose())
      } else if (diceMeshRef.current.material) {
        diceMeshRef.current.material.dispose()
      }
    }

    const newMesh = createDiceMesh(sides, currentNumber)
    setDefaultOrientation(newMesh, sides)
    diceMeshRef.current = newMesh
    sceneRef.current.add(newMesh)
  }, [sides, currentNumber])

  // Rolling animation handling
  useEffect(() => {
    if (!diceMeshRef.current) return

    if (isRolling) {
      let rollProgress = 0
      const duration = 1000
      const startTime = performance.now()

      const spinX = (Math.random() - 0.5) * 0.4 + 0.3
      const spinY = (Math.random() - 0.5) * 0.4 + 0.3
      const spinZ = (Math.random() - 0.5) * 0.4 + 0.2

      const rollLoop = (time) => {
        const elapsed = time - startTime
        rollProgress = Math.min(elapsed / duration, 1)

        if (diceMeshRef.current) {
          const speed = (1 - rollProgress * 0.6) * 35
          diceMeshRef.current.rotation.x += spinX * (speed * 0.016)
          diceMeshRef.current.rotation.y += spinY * (speed * 0.016)
          diceMeshRef.current.rotation.z += spinZ * (speed * 0.016)

          // Bounce effect
          diceMeshRef.current.position.y = Math.sin(rollProgress * Math.PI * 4) * 0.3
        }

        if (rollProgress < 1) {
          requestAnimationFrame(rollLoop)
        } else {
          if (diceMeshRef.current) {
            diceMeshRef.current.position.y = 0
            setDefaultOrientation(diceMeshRef.current, sides)
          }
        }
      }
      requestAnimationFrame(rollLoop)
    }
  }, [isRolling, sides])

  // Touch / Mouse Drag & Toss Interaction
  const handlePointerDown = (e) => {
    isDraggingRef.current = true
    previousMousePosition.current = { x: e.clientX, y: e.clientY }
    lastMoveTime.current = Date.now()
    dragVelocity.current = { x: 0, y: 0 }
  }

  const handlePointerMove = (e) => {
    if (!isDraggingRef.current || !diceMeshRef.current || isRolling) return

    const now = Date.now()
    const dt = Math.max(now - lastMoveTime.current, 1)
    const deltaX = e.clientX - previousMousePosition.current.x
    const deltaY = e.clientY - previousMousePosition.current.y

    dragVelocity.current = {
      x: deltaX / dt,
      y: deltaY / dt,
    }

    diceMeshRef.current.rotation.y += deltaX * 0.02
    diceMeshRef.current.rotation.x += deltaY * 0.02

    previousMousePosition.current = { x: e.clientX, y: e.clientY }
    lastMoveTime.current = now
  }

  const handlePointerUp = () => {
    if (!isDraggingRef.current) return
    isDraggingRef.current = false

    const speed = Math.hypot(dragVelocity.current.x, dragVelocity.current.y)
    if (speed > 0.6 && onThrow && !isRolling) {
      onThrow()
    }
  }

  return (
    <div
      ref={mountRef}
      className="dice-3d-canvas-container"
      onPointerDown={handlePointerDown}
      onPointerMove={handlePointerMove}
      onPointerUp={handlePointerUp}
      onPointerLeave={handlePointerUp}
      title="주사위를 드래그하여 회전시키거나 빠르게 튕겨서 던질 수 있습니다"
    />
  )
}
