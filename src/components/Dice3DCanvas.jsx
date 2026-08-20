import { useEffect, useRef } from 'react'
import * as THREE from 'three'

// Helper: Generate crisp CanvasTexture for face numbers
function createNumberTexture(num, label = '', bgColor = '#6366f1', textColor = '#ffffff') {
  const canvas = document.createElement('canvas')
  canvas.width = 256
  canvas.height = 256
  const ctx = canvas.getContext('2d')

  // Background
  ctx.fillStyle = bgColor
  ctx.fillRect(0, 0, 256, 256)

  // Inner border
  ctx.strokeStyle = 'rgba(255, 255, 255, 0.45)'
  ctx.lineWidth = 10
  ctx.strokeRect(14, 14, 228, 228)

  // Corner accents
  ctx.fillStyle = 'rgba(255, 255, 255, 0.2)'
  ctx.fillRect(18, 18, 24, 24)
  ctx.fillRect(214, 18, 24, 24)
  ctx.fillRect(18, 214, 24, 24)
  ctx.fillRect(214, 214, 24, 24)

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
    ctx.font = 'bold 60px system-ui, -apple-system, sans-serif'
  }

  // Underline for 6 and 9
  if (num === 6 || num === 9) {
    ctx.fillText(str, 128, 118)
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
    ctx.font = 'bold 24px system-ui, -apple-system, sans-serif'
    ctx.fillStyle = 'rgba(255, 255, 255, 0.85)'
    ctx.fillText(label, 128, 195)
  }

  const texture = new THREE.CanvasTexture(canvas)
  texture.anisotropy = 4
  return texture
}

// Set resting orientation on tray floor so top face points upwards towards perspective top camera
function setRestingOrientation(mesh, nSides) {
  if (!mesh) return
  if (nSides === 2) {
    // Coin: lying flat on tray floor, top face facing camera (+Y)
    mesh.rotation.set(-Math.PI / 2, 0, 0)
  } else if (nSides === 6) {
    // Cube: flat on tray floor with top face pointing up, slight angled yaw
    mesh.rotation.set(0, Math.PI / 12, 0)
  } else {
    // Other polyhedra: resting flat on floor, slightly angled for 3D visibility
    mesh.rotation.set(0.1, 0.2, 0)
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

  // Physics state for tray simulation
  const physicsRef = useRef({
    pos: new THREE.Vector3(0, 0.65, 0),
    vel: new THREE.Vector3(0, 0, 0),
    rotVel: new THREE.Vector3(0, 0, 0),
    inMotion: false,
    groundY: 0.65,
    boundX: 2.35,
    boundZ: 2.35,
  })

  // Create geometry & materials based on sides
  const createDiceMesh = (nSides, targetNumber) => {
    let geometry
    let materials

    const baseProps = {
      roughness: 0.25,
      metalness: 0.15,
    }

    if (nSides === 2) {
      // Coin (d2)
      geometry = new THREE.CylinderGeometry(1.2, 1.2, 0.25, 32)
      const edgeMat = new THREE.MeshStandardMaterial({
        color: 0xd97706,
        metalness: 0.8,
        roughness: 0.3,
      })
      const topMat = new THREE.MeshStandardMaterial({
        map: createNumberTexture(1, 'HEADS', '#b45309'),
        ...baseProps,
      })
      const bottomMat = new THREE.MeshStandardMaterial({
        map: createNumberTexture(2, 'TAILS', '#92400e'),
        ...baseProps,
      })
      materials = [edgeMat, topMat, bottomMat]
    } else if (nSides === 6) {
      // Cube (d6)
      geometry = new THREE.BoxGeometry(1.3, 1.3, 1.3)
      const faceNums = [1, 6, 2, 5, 3, 4]
      materials = faceNums.map((num) =>
        new THREE.MeshStandardMaterial({
          map: createNumberTexture(num, '', '#6366f1'),
          ...baseProps,
        })
      )
    } else if (nSides === 4) {
      geometry = new THREE.TetrahedronGeometry(1.25)
      materials = new THREE.MeshStandardMaterial({
        map: createNumberTexture(targetNumber || 4, 'd4', '#4f46e5'),
        ...baseProps,
        flatShading: true,
      })
    } else if (nSides === 8) {
      geometry = new THREE.OctahedronGeometry(1.25)
      materials = new THREE.MeshStandardMaterial({
        map: createNumberTexture(targetNumber || 8, 'd8', '#7c3aed'),
        ...baseProps,
        flatShading: true,
      })
    } else if (nSides === 10) {
      geometry = new THREE.CylinderGeometry(1.15, 1.15, 1.1, 10)
      materials = new THREE.MeshStandardMaterial({
        map: createNumberTexture(targetNumber || 10, 'd10', '#8b5cf6'),
        ...baseProps,
      })
    } else if (nSides === 12) {
      geometry = new THREE.DodecahedronGeometry(1.2)
      materials = new THREE.MeshStandardMaterial({
        map: createNumberTexture(targetNumber || 12, 'd12', '#a855f7'),
        ...baseProps,
        flatShading: true,
      })
    } else if (nSides === 20) {
      geometry = new THREE.IcosahedronGeometry(1.25)
      materials = new THREE.MeshStandardMaterial({
        map: createNumberTexture(targetNumber || 20, 'd20', '#9333ea'),
        ...baseProps,
        flatShading: true,
      })
    } else {
      geometry = new THREE.DodecahedronGeometry(1.25, Math.min(Math.floor(nSides / 20), 2))
      materials = new THREE.MeshStandardMaterial({
        map: createNumberTexture(targetNumber || nSides, `d${nSides}`, '#5b21b6'),
        ...baseProps,
        flatShading: true,
      })
    }

    const mesh = new THREE.Mesh(geometry, materials)
    mesh.castShadow = true
    mesh.receiveShadow = true
    mesh.position.set(0, 0.65, 0)
    return mesh
  }

  // Create 3D Dice Tray / Box
  const createDiceTray = () => {
    const trayGroup = new THREE.Group()

    const TRAY_SIZE = 6.2
    const WALL_HEIGHT = 0.9
    const WALL_THICKNESS = 0.35

    // Floor (Felt Velvet Mat)
    const floorGeo = new THREE.BoxGeometry(TRAY_SIZE, 0.2, TRAY_SIZE)
    const floorMat = new THREE.MeshStandardMaterial({
      color: 0x1e1b4b, // Deep indigo velvet
      roughness: 0.85,
      metalness: 0.05,
    })
    const floorMesh = new THREE.Mesh(floorGeo, floorMat)
    floorMesh.position.y = -0.1
    floorMesh.receiveShadow = true
    trayGroup.add(floorMesh)

    // Inner tray border line
    const borderGeo = new THREE.BoxGeometry(TRAY_SIZE - 0.2, 0.21, TRAY_SIZE - 0.2)
    const borderMat = new THREE.MeshStandardMaterial({
      color: 0x312e81,
      roughness: 0.7,
    })
    const borderMesh = new THREE.Mesh(borderGeo, borderMat)
    borderMesh.position.y = -0.09
    borderMesh.receiveShadow = true
    trayGroup.add(borderMesh)

    // Wall Material (Sleek dark wood / bezel frame)
    const wallMat = new THREE.MeshStandardMaterial({
      color: 0x0f172a, // Slate dark
      roughness: 0.35,
      metalness: 0.2,
    })

    // 4 Border Walls (North, South, East, West)
    const northWall = new THREE.Mesh(
      new THREE.BoxGeometry(TRAY_SIZE + WALL_THICKNESS * 2, WALL_HEIGHT, WALL_THICKNESS),
      wallMat
    )
    northWall.position.set(0, WALL_HEIGHT / 2 - 0.1, -TRAY_SIZE / 2 - WALL_THICKNESS / 2)
    northWall.castShadow = true
    northWall.receiveShadow = true
    trayGroup.add(northWall)

    const southWall = new THREE.Mesh(
      new THREE.BoxGeometry(TRAY_SIZE + WALL_THICKNESS * 2, WALL_HEIGHT, WALL_THICKNESS),
      wallMat
    )
    southWall.position.set(0, WALL_HEIGHT / 2 - 0.1, TRAY_SIZE / 2 + WALL_THICKNESS / 2)
    southWall.castShadow = true
    southWall.receiveShadow = true
    trayGroup.add(southWall)

    const eastWall = new THREE.Mesh(
      new THREE.BoxGeometry(WALL_THICKNESS, WALL_HEIGHT, TRAY_SIZE),
      wallMat
    )
    eastWall.position.set(TRAY_SIZE / 2 + WALL_THICKNESS / 2, WALL_HEIGHT / 2 - 0.1, 0)
    eastWall.castShadow = true
    eastWall.receiveShadow = true
    trayGroup.add(eastWall)

    const westWall = new THREE.Mesh(
      new THREE.BoxGeometry(WALL_THICKNESS, WALL_HEIGHT, TRAY_SIZE),
      wallMat
    )
    westWall.position.set(-TRAY_SIZE / 2 - WALL_THICKNESS / 2, WALL_HEIGHT / 2 - 0.1, 0)
    westWall.castShadow = true
    westWall.receiveShadow = true
    trayGroup.add(westWall)

    return trayGroup
  }

  // Setup Three.js Scene
  useEffect(() => {
    const container = mountRef.current
    if (!container) return

    const width = container.clientWidth || 340
    const height = container.clientHeight || 340

    const scene = new THREE.Scene()
    sceneRef.current = scene

    // Perspective Top-Down Camera
    const camera = new THREE.PerspectiveCamera(40, width / height, 0.1, 100)
    // Tilted top perspective looking down into the tray
    camera.position.set(0, 8.8, 4.0)
    camera.lookAt(0, 0.2, 0)
    cameraRef.current = camera

    const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true })
    renderer.setSize(width, height)
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2))
    renderer.shadowMap.enabled = true
    renderer.shadowMap.type = THREE.PCFSoftShadowMap
    rendererRef.current = renderer

    container.replaceChildren(renderer.domElement)

    // Lighting
    const ambientLight = new THREE.AmbientLight(0xffffff, 1.4)
    scene.add(ambientLight)

    const topLight = new THREE.DirectionalLight(0xffffff, 2.2)
    topLight.position.set(3, 10, 5)
    topLight.castShadow = true
    topLight.shadow.mapSize.width = 1024
    topLight.shadow.mapSize.height = 1024
    topLight.shadow.camera.near = 0.5
    topLight.shadow.camera.far = 25
    topLight.shadow.camera.left = -5
    topLight.shadow.camera.right = 5
    topLight.shadow.camera.top = 5
    topLight.shadow.camera.bottom = -5
    topLight.shadow.bias = -0.001
    scene.add(topLight)

    const fillLight = new THREE.DirectionalLight(0x818cf8, 0.9)
    fillLight.position.set(-4, 6, -3)
    scene.add(fillLight)

    // Add 3D Dice Tray (Box)
    const tray = createDiceTray()
    scene.add(tray)

    // Add 3D Dice
    const mesh = createDiceMesh(sides, currentNumber)
    setRestingOrientation(mesh, sides)
    diceMeshRef.current = mesh
    scene.add(mesh)

    // Physics update step in render loop
    let lastFrameTime = performance.now()

    const animate = (time) => {
      animationFrameRef.current = requestAnimationFrame(animate)

      const dt = Math.min((time - lastFrameTime) / 1000, 0.05)
      lastFrameTime = time

      const p = physicsRef.current
      const mesh = diceMeshRef.current

      if (p.inMotion && mesh) {
        // Apply Gravity
        p.vel.y -= 22 * dt

        // Update position
        p.pos.x += p.vel.x * dt
        p.pos.y += p.vel.y * dt
        p.pos.z += p.vel.z * dt

        // Update rotation
        mesh.rotation.x += p.rotVel.x * dt
        mesh.rotation.y += p.rotVel.y * dt
        mesh.rotation.z += p.rotVel.z * dt

        // Floor collision
        if (p.pos.y <= p.groundY) {
          p.pos.y = p.groundY
          p.vel.y = -p.vel.y * 0.45 // bounce restitution
          p.vel.x *= 0.92 // floor friction
          p.vel.z *= 0.92
          p.rotVel.multiplyScalar(0.9)
        }

        // Wall collisions (X-bounds)
        if (Math.abs(p.pos.x) >= p.boundX) {
          p.pos.x = Math.sign(p.pos.x) * p.boundX
          p.vel.x = -p.vel.x * 0.65
          p.rotVel.y += Math.sign(p.pos.x) * 4
        }

        // Wall collisions (Z-bounds)
        if (Math.abs(p.pos.z) >= p.boundZ) {
          p.pos.z = Math.sign(p.pos.z) * p.boundZ
          p.vel.z = -p.vel.z * 0.65
          p.rotVel.y += Math.sign(p.pos.z) * 4
        }

        // Apply updated position to mesh
        mesh.position.copy(p.pos)

        // Check if stopped
        const speed = p.vel.length()
        const rotSpeed = p.rotVel.length()
        if (p.pos.y <= p.groundY + 0.05 && speed < 0.15 && rotSpeed < 0.2) {
          p.inMotion = false
          p.vel.set(0, 0, 0)
          p.rotVel.set(0, 0, 0)
          setRestingOrientation(mesh, sides)
        }
      }

      renderer.render(scene, camera)
    }
    animate(performance.now())

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

  // Update mesh when sides or target number changes
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
    newMesh.position.copy(physicsRef.current.pos)
    setRestingOrientation(newMesh, sides)
    diceMeshRef.current = newMesh
    sceneRef.current.add(newMesh)
  }, [sides, currentNumber])

  // Trigger Rolling Physics Simulation inside Box
  useEffect(() => {
    if (!diceMeshRef.current) return

    if (isRolling) {
      const p = physicsRef.current
      p.inMotion = true

      // Launch impulse inside tray
      p.pos.set(
        (Math.random() - 0.5) * 1.5,
        1.2 + Math.random() * 0.8,
        (Math.random() - 0.5) * 1.5
      )
      p.vel.set(
        (Math.random() - 0.5) * 11,
        6 + Math.random() * 3,
        (Math.random() - 0.5) * 11
      )
      p.rotVel.set(
        (Math.random() - 0.5) * 35,
        (Math.random() - 0.5) * 35,
        (Math.random() - 0.5) * 35
      )
    }
  }, [isRolling])

  // Drag & Toss Interaction inside Box
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

    // Move dice on X/Z plane inside box
    const p = physicsRef.current
    p.pos.x = THREE.MathUtils.clamp(p.pos.x + deltaX * 0.015, -p.boundX, p.boundX)
    p.pos.z = THREE.MathUtils.clamp(p.pos.z + deltaY * 0.015, -p.boundZ, p.boundZ)
    diceMeshRef.current.position.copy(p.pos)

    // Slight tilt while dragging
    diceMeshRef.current.rotation.y += deltaX * 0.03
    diceMeshRef.current.rotation.x += deltaY * 0.03

    previousMousePosition.current = { x: e.clientX, y: e.clientY }
    lastMoveTime.current = now
  }

  const handlePointerUp = () => {
    if (!isDraggingRef.current) return
    isDraggingRef.current = false

    const speed = Math.hypot(dragVelocity.current.x, dragVelocity.current.y)
    // If flicked with speed, toss inside box!
    if (speed > 0.45 && onThrow && !isRolling) {
      onThrow()
    } else if (!isRolling && diceMeshRef.current) {
      setRestingOrientation(diceMeshRef.current, sides)
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
      title="상자 안의 주사위를 드래그하거나 빠르게 튕겨서 굴려보세요"
    />
  )
}
