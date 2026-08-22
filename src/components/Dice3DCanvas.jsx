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

const DICE_COLORS = {
  2: '#b45309',
  4: '#4f46e5',
  6: '#6366f1',
  8: '#7c3aed',
  10: '#8b5cf6',
  12: '#a855f7',
  20: '#9333ea',
  100: '#5b21b6',
}

function getDiceColor(sides) {
  return DICE_COLORS[sides] || '#6d28d9'
}

// Set resting orientation on tray floor so top face points upwards towards perspective top camera
function setRestingOrientation(mesh, nSides) {
  if (!mesh) return
  if (nSides === 2) {
    mesh.rotation.set(-Math.PI / 2, 0, 0)
  } else if (nSides === 6) {
    mesh.rotation.set(0, Math.PI / 12, 0)
  } else {
    mesh.rotation.set(0.1, 0.2, 0)
  }
}

export default function Dice3DCanvas({ diceList, isRolling, onThrow, rollTrigger }) {
  const mountRef = useRef(null)
  const sceneRef = useRef(null)
  const rendererRef = useRef(null)
  const cameraRef = useRef(null)
  const diceMapRef = useRef(new Map()) // id -> { mesh, physics }
  const animationFrameRef = useRef(null)
  const isDraggingRef = useRef(false)
  const draggedDieIdsRef = useRef(new Set())
  const dragCenterPointRef = useRef(new THREE.Vector3())
  const recentWorldHistory = useRef([])
  const raycasterRef = useRef(new THREE.Raycaster())

  // Create geometry & materials based on sides
  const createDiceMesh = (nSides, targetNumber) => {
    let geometry
    let materials

    const baseProps = {
      roughness: 0.25,
      metalness: 0.15,
    }

    const SCALE = 1.05
    const color = getDiceColor(nSides)

    if (nSides === 2) {
      // Coin (d2)
      geometry = new THREE.CylinderGeometry(1.0 * SCALE, 1.0 * SCALE, 0.22 * SCALE, 32)
      const edgeMat = new THREE.MeshStandardMaterial({
        color: 0xd97706,
        metalness: 0.8,
        roughness: 0.3,
      })
      const topMat = new THREE.MeshStandardMaterial({
        map: createNumberTexture(1, 'HEADS', color),
        ...baseProps,
      })
      const bottomMat = new THREE.MeshStandardMaterial({
        map: createNumberTexture(2, 'TAILS', '#78350f'),
        ...baseProps,
      })
      materials = [edgeMat, topMat, bottomMat]
    } else if (nSides === 6) {
      // Cube (d6)
      geometry = new THREE.BoxGeometry(1.1 * SCALE, 1.1 * SCALE, 1.1 * SCALE)
      const faceNums = [1, 6, 2, 5, 3, 4]
      materials = faceNums.map((num) =>
        new THREE.MeshStandardMaterial({
          map: createNumberTexture(num, '', color),
          ...baseProps,
        })
      )
    } else if (nSides === 4) {
      geometry = new THREE.TetrahedronGeometry(1.05 * SCALE)
      materials = new THREE.MeshStandardMaterial({
        map: createNumberTexture(targetNumber || 4, 'd4', color),
        ...baseProps,
        flatShading: true,
      })
    } else if (nSides === 8) {
      geometry = new THREE.OctahedronGeometry(1.05 * SCALE)
      materials = new THREE.MeshStandardMaterial({
        map: createNumberTexture(targetNumber || 8, 'd8', color),
        ...baseProps,
        flatShading: true,
      })
    } else if (nSides === 10) {
      geometry = new THREE.CylinderGeometry(0.95 * SCALE, 0.95 * SCALE, 1.0 * SCALE, 10)
      materials = new THREE.MeshStandardMaterial({
        map: createNumberTexture(targetNumber || 10, 'd10', color),
        ...baseProps,
      })
    } else if (nSides === 12) {
      geometry = new THREE.DodecahedronGeometry(1.0 * SCALE)
      materials = new THREE.MeshStandardMaterial({
        map: createNumberTexture(targetNumber || 12, 'd12', color),
        ...baseProps,
        flatShading: true,
      })
    } else if (nSides === 20) {
      geometry = new THREE.IcosahedronGeometry(1.05 * SCALE)
      materials = new THREE.MeshStandardMaterial({
        map: createNumberTexture(targetNumber || 20, 'd20', color),
        ...baseProps,
        flatShading: true,
      })
    } else {
      geometry = new THREE.DodecahedronGeometry(1.05 * SCALE, Math.min(Math.floor(nSides / 20), 2))
      materials = new THREE.MeshStandardMaterial({
        map: createNumberTexture(targetNumber || nSides, `d${nSides}`, color),
        ...baseProps,
        flatShading: true,
      })
    }

    const mesh = new THREE.Mesh(geometry, materials)
    mesh.castShadow = true
    mesh.receiveShadow = true
    return mesh
  }

  // Create 2x Enlarged 3D Dice Tray / Box
  const createDiceTray = () => {
    const trayGroup = new THREE.Group()

    const TRAY_SIZE = 15.6
    const WALL_HEIGHT = 1.35
    const WALL_THICKNESS = 0.6

    // Floor
    const floorGeo = new THREE.BoxGeometry(TRAY_SIZE, 0.2, TRAY_SIZE)
    const floorMat = new THREE.MeshStandardMaterial({
      color: 0x1e1b4b,
      roughness: 0.9,
      metalness: 0.05,
    })
    const floorMesh = new THREE.Mesh(floorGeo, floorMat)
    floorMesh.position.y = -0.1
    floorMesh.receiveShadow = true
    trayGroup.add(floorMesh)

    // Inner tray border
    const borderGeo = new THREE.BoxGeometry(TRAY_SIZE - 0.4, 0.21, TRAY_SIZE - 0.4)
    const borderMat = new THREE.MeshStandardMaterial({
      color: 0x312e81,
      roughness: 0.75,
    })
    const borderMesh = new THREE.Mesh(borderGeo, borderMat)
    borderMesh.position.y = -0.09
    borderMesh.receiveShadow = true
    trayGroup.add(borderMesh)

    // Wall Material
    const wallMat = new THREE.MeshStandardMaterial({
      color: 0x0f172a,
      roughness: 0.35,
      metalness: 0.2,
    })

    // 4 Border Walls
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

    const width = container.clientWidth || 360
    const height = container.clientHeight || 360

    const scene = new THREE.Scene()
    sceneRef.current = scene

    // Perspective Top-Down Camera
    const camera = new THREE.PerspectiveCamera(40, width / height, 0.1, 200)
    camera.position.set(0, 25.0, 13.0)
    camera.lookAt(0, 0.1, 0)
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

    const topLight = new THREE.DirectionalLight(0xffffff, 2.3)
    topLight.position.set(10, 35, 15)
    topLight.castShadow = true
    topLight.shadow.mapSize.width = 2048
    topLight.shadow.mapSize.height = 2048
    topLight.shadow.camera.near = 0.5
    topLight.shadow.camera.far = 80
    topLight.shadow.camera.left = -16
    topLight.shadow.camera.right = 16
    topLight.shadow.camera.top = 16
    topLight.shadow.camera.bottom = -16
    topLight.shadow.bias = -0.001
    scene.add(topLight)

    const fillLight = new THREE.DirectionalLight(0x818cf8, 0.8)
    fillLight.position.set(-15, 20, -12)
    scene.add(fillLight)

    // Add 2x Enlarged 3D Dice Tray (Box)
    const tray = createDiceTray()
    scene.add(tray)

    // Physics update loop
    let lastFrameTime = performance.now()

    const animate = (time) => {
      animationFrameRef.current = requestAnimationFrame(animate)

      const dt = Math.min((time - lastFrameTime) / 1000, 0.05)
      lastFrameTime = time

      const diceEntries = Array.from(diceMapRef.current.entries())

      // 1. Continuous sweeping detection during drag (picks up resting dice when brushed past)
      if (isDraggingRef.current && draggedDieIdsRef.current.size > 0) {
        const SWEEP_RADIUS = 2.1
        let brushedAny = false
        diceEntries.forEach(([id, { physics }]) => {
          if (!draggedDieIdsRef.current.has(id)) {
            const distToHandCenter = Math.hypot(
              physics.pos.x - dragCenterPointRef.current.x,
              physics.pos.z - dragCenterPointRef.current.z
            )
            let inRange = distToHandCenter < SWEEP_RADIUS

            if (!inRange) {
              for (const heldId of draggedDieIdsRef.current) {
                const heldData = diceMapRef.current.get(heldId)
                if (heldData) {
                  const d = Math.hypot(
                    physics.pos.x - heldData.physics.pos.x,
                    physics.pos.z - heldData.physics.pos.z
                  )
                  if (d < SWEEP_RADIUS) {
                    inRange = true
                    break
                  }
                }
              }
            }

            if (inRange) {
              draggedDieIdsRef.current.add(id)
              physics.inMotion = false
              physics.vel.set(0, 0, 0)
              physics.rotVel.set(0, 0, 0)
              brushedAny = true
            }
          }
        })

        if (brushedAny && navigator.vibrate) {
          navigator.vibrate(20)
        }
      }

      // 2. Update individual physics
      diceEntries.forEach(([id, { mesh, physics }]) => {
        const p = physics

        if (isDraggingRef.current && draggedDieIdsRef.current.has(id)) {
          // Held in hand: lift up smoothly and cluster comfortably around drag center
          p.pos.y = THREE.MathUtils.lerp(p.pos.y, p.liftY, 0.16)
          p.pos.x = THREE.MathUtils.lerp(p.pos.x, dragCenterPointRef.current.x, 0.22)
          p.pos.z = THREE.MathUtils.lerp(p.pos.z, dragCenterPointRef.current.z, 0.22)
          mesh.position.copy(p.pos)
          mesh.rotation.x = THREE.MathUtils.lerp(mesh.rotation.x, 0.35 + p.holdTilt.y * 0.4, 0.2)
          mesh.rotation.z = THREE.MathUtils.lerp(mesh.rotation.z, -p.holdTilt.x * 0.4, 0.2)
        } else if (p.inMotion) {
          // Falling with gravity
          p.vel.y -= 26 * dt

          // Position update
          p.pos.x += p.vel.x * dt
          p.pos.y += p.vel.y * dt
          p.pos.z += p.vel.z * dt

          // Rotation update
          mesh.rotation.x += p.rotVel.x * dt
          mesh.rotation.y += p.rotVel.y * dt
          mesh.rotation.z += p.rotVel.z * dt

          // Floor collision
          if (p.pos.y <= p.groundY) {
            p.pos.y = p.groundY
            p.vel.y = -p.vel.y * 0.44
            p.vel.x *= 0.92
            p.vel.z *= 0.92
            p.rotVel.multiplyScalar(0.88)
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

          mesh.position.copy(p.pos)

          // Settle check
          const speed = p.vel.length()
          const rotSpeed = p.rotVel.length()
          if (p.pos.y <= p.groundY + 0.05 && speed < 0.15 && rotSpeed < 0.2) {
            p.inMotion = false
            p.vel.set(0, 0, 0)
            p.rotVel.set(0, 0, 0)
            const dData = diceList?.find((d) => d.id === id)
            if (dData) setRestingOrientation(mesh, dData.sides)
          }
        } else {
          // Stationary at resting position on tray floor
          p.pos.y = p.groundY
          mesh.position.copy(p.pos)
        }
      })

      // 3. Inter-dice collision & repulsion
      for (let i = 0; i < diceEntries.length; i++) {
        for (let j = i + 1; j < diceEntries.length; j++) {
          const [id1, { mesh: mesh1, physics: p1 }] = diceEntries[i]
          const [id2, { mesh: mesh2, physics: p2 }] = diceEntries[j]

          const isHeld1 = isDraggingRef.current && draggedDieIdsRef.current.has(id1)
          const isHeld2 = isDraggingRef.current && draggedDieIdsRef.current.has(id2)

          const delta = p1.pos.clone().sub(p2.pos)
          const dist = delta.length()
          const minDist = 1.35

          if (dist < minDist && dist > 0.001) {
            const overlap = (minDist - dist) * 0.5
            const normal = delta.normalize()

            if (isHeld1 && isHeld2) {
              // Both held in hand: gently push apart in horizontal plane to cluster naturally
              p1.pos.x += normal.x * overlap
              p1.pos.z += normal.z * overlap
              p2.pos.x -= normal.x * overlap
              p2.pos.z -= normal.z * overlap
              mesh1.position.copy(p1.pos)
              mesh2.position.copy(p2.pos)
            } else if (!isHeld1 && !isHeld2) {
              // Both in world: standard physical collision response
              p1.pos.addScaledVector(normal, overlap)
              p2.pos.addScaledVector(normal, -overlap)
              mesh1.position.copy(p1.pos)
              mesh2.position.copy(p2.pos)

              const relVel = p1.vel.clone().sub(p2.vel)
              const dot = relVel.dot(normal)
              if (dot < 0) {
                const impulse = normal.multiplyScalar(-dot * 0.5)
                p1.vel.add(impulse)
                p2.vel.sub(impulse)
                if (p1.vel.length() > 0.3) p1.inMotion = true
                if (p2.vel.length() > 0.3) p2.inMotion = true
              }
            }
          }
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

  // Sync diceList with Three.js scene meshes
  useEffect(() => {
    if (!sceneRef.current) return

    const currentIds = new Set(diceList.map((d) => d.id))
    const map = diceMapRef.current

    // Remove deleted dice
    for (const [id, { mesh }] of map.entries()) {
      if (!currentIds.has(id)) {
        sceneRef.current.remove(mesh)
        if (mesh.geometry) mesh.geometry.dispose()
        if (Array.isArray(mesh.material)) {
          mesh.material.forEach((m) => m.dispose())
        } else if (mesh.material) {
          mesh.material.dispose()
        }
        map.delete(id)
      }
    }

    // Add or update dice
    diceList.forEach((d, idx) => {
      const existing = map.get(d.id)
      if (!existing) {
        // Compute initial spaced position in tray
        const total = diceList.length
        const angle = (idx / Math.max(total, 1)) * Math.PI * 2
        const radius = Math.min(total * 0.8, 4.5)
        const initX = total === 1 ? 0 : Math.cos(angle) * radius
        const initZ = total === 1 ? 0 : Math.sin(angle) * radius

        const mesh = createDiceMesh(d.sides, d.displayNumber || d.sides)
        mesh.position.set(initX, 0.55, initZ)
        setRestingOrientation(mesh, d.sides)
        sceneRef.current.add(mesh)

        map.set(d.id, {
          mesh,
          physics: {
            pos: new THREE.Vector3(initX, 0.55, initZ),
            vel: new THREE.Vector3(0, 0, 0),
            rotVel: new THREE.Vector3(0, 0, 0),
            inMotion: false,
            groundY: 0.55,
            liftY: 3.4,
            boundX: 7.1,
            boundZ: 7.1,
            holdTilt: new THREE.Vector2(0, 0),
          },
        })
      } else {
        // Re-create mesh if sides or displayNumber changed
        const mesh = existing.mesh
        sceneRef.current.remove(mesh)
        if (mesh.geometry) mesh.geometry.dispose()
        if (Array.isArray(mesh.material)) {
          mesh.material.forEach((m) => m.dispose())
        } else if (mesh.material) {
          mesh.material.dispose()
        }

        const newMesh = createDiceMesh(d.sides, d.displayNumber || d.sides)
        newMesh.position.copy(existing.physics.pos)
        setRestingOrientation(newMesh, d.sides)
        sceneRef.current.add(newMesh)
        existing.mesh = newMesh
      }
    })
  }, [diceList])

  // Trigger Rolling Physics Simulation from external button/shake trigger
  useEffect(() => {
    if (rollTrigger && rollTrigger.timestamp) {
      const targetIds =
        rollTrigger.diceIds && rollTrigger.diceIds.length > 0
          ? new Set(rollTrigger.diceIds)
          : new Set(diceList.map((d) => d.id))

      diceMapRef.current.forEach(({ physics }, id) => {
        if (targetIds.has(id)) {
          physics.inMotion = true
          physics.pos.y = 2.4 + Math.random() * 1.2
          physics.vel.set(
            (Math.random() - 0.5) * 24,
            8 + Math.random() * 5,
            (Math.random() - 0.5) * 24
          )
          physics.rotVel.set(
            (Math.random() - 0.5) * 55,
            (Math.random() - 0.5) * 55,
            (Math.random() - 0.5) * 55
          )
        }
      })
    }
  }, [rollTrigger])

  // Convert screen coords to 3D plane coords
  const get3DPlanePoint = (clientX, clientY, planeY = 2.5) => {
    if (!mountRef.current || !cameraRef.current) return null
    const rect = mountRef.current.getBoundingClientRect()
    const ndcX = ((clientX - rect.left) / rect.width) * 2 - 1
    const ndcY = -(((clientY - rect.top) / rect.height) * 2 - 1)

    raycasterRef.current.setFromCamera({ x: ndcX, y: ndcY }, cameraRef.current)
    const plane = new THREE.Plane(new THREE.Vector3(0, 1, 0), -planeY)
    const target = new THREE.Vector3()
    const hit = raycasterRef.current.ray.intersectPlane(plane, target)
    return hit ? target : null
  }

  // Pointer Down: Grab clicked or closest die and start holding
  const handlePointerDown = (e) => {
    if (isRolling || diceMapRef.current.size === 0) return
    if (!mountRef.current || !cameraRef.current) return

    try {
      if (e.target && e.target.setPointerCapture) {
        e.target.setPointerCapture(e.pointerId)
      }
    } catch (_) {}

    const rect = mountRef.current.getBoundingClientRect()
    const ndcX = ((e.clientX - rect.left) / rect.width) * 2 - 1
    const ndcY = -(((e.clientY - rect.top) / rect.height) * 2 - 1)
    raycasterRef.current.setFromCamera({ x: ndcX, y: ndcY }, cameraRef.current)

    // Check direct mesh raycasting
    const meshes = []
    const meshToId = new Map()
    for (const [id, { mesh }] of diceMapRef.current.entries()) {
      meshes.push(mesh)
      meshToId.set(mesh, id)
    }

    const intersects = raycasterRef.current.intersectObjects(meshes, true)
    let chosenId = null

    if (intersects.length > 0) {
      let hitObj = intersects[0].object
      while (hitObj && !meshToId.has(hitObj)) {
        hitObj = hitObj.parent
      }
      if (hitObj && meshToId.has(hitObj)) {
        chosenId = meshToId.get(hitObj)
      }
    }

    const floorHit = get3DPlanePoint(e.clientX, e.clientY, 0.55)

    if (!chosenId && floorHit) {
      let minDist = Infinity
      for (const [id, { physics }] of diceMapRef.current.entries()) {
        const d = Math.hypot(physics.pos.x - floorHit.x, physics.pos.z - floorHit.z)
        if (d < minDist) {
          minDist = d
          chosenId = id
        }
      }
      if (minDist > 4.5 && diceList[0]) {
        chosenId = diceList[0].id
      }
    }

    if (!chosenId) {
      chosenId = diceList[0]?.id
    }
    if (!chosenId) return

    isDraggingRef.current = true
    draggedDieIdsRef.current = new Set([chosenId])

    const dragTargetPoint =
      get3DPlanePoint(e.clientX, e.clientY, 3.4) ||
      (floorHit ? new THREE.Vector3(floorHit.x, 3.4, floorHit.z) : new THREE.Vector3(0, 3.4, 0))
    dragCenterPointRef.current.copy(dragTargetPoint)

    const dieData = diceMapRef.current.get(chosenId)
    if (dieData) {
      const p = dieData.physics
      p.inMotion = false
      p.vel.set(0, 0, 0)
      p.rotVel.set(0, 0, 0)
      p.holdTilt.set(0, 0)
    }

    recentWorldHistory.current = [
      { x: dragCenterPointRef.current.x, z: dragCenterPointRef.current.z, time: performance.now() },
    ]

    if (navigator.vibrate) {
      navigator.vibrate(25)
    }
  }

  // Pointer Move: Drag held dice and sweep other dice in path
  const handlePointerMove = (e) => {
    if (!isDraggingRef.current || isRolling) return

    const point3D = get3DPlanePoint(e.clientX, e.clientY, 3.4)
    if (!point3D) return

    const boundX = 6.8
    const boundZ = 6.8
    point3D.x = THREE.MathUtils.clamp(point3D.x, -boundX, boundX)
    point3D.z = THREE.MathUtils.clamp(point3D.z, -boundZ, boundZ)

    const deltaX = point3D.x - dragCenterPointRef.current.x
    const deltaZ = point3D.z - dragCenterPointRef.current.z
    dragCenterPointRef.current.copy(point3D)

    const now = performance.now()
    recentWorldHistory.current.push({ x: point3D.x, z: point3D.z, time: now })
    if (recentWorldHistory.current.length > 8) {
      recentWorldHistory.current.shift()
    }

    // Sweeping check: touch or brush against nearby resting dice to pick them up
    const SWEEP_DISTANCE = 2.2
    let newlyGrabbed = false

    for (const [id, { physics }] of diceMapRef.current.entries()) {
      if (!draggedDieIdsRef.current.has(id)) {
        const distCenter = Math.hypot(physics.pos.x - point3D.x, physics.pos.z - point3D.z)
        let inSweepRange = distCenter < SWEEP_DISTANCE

        if (!inSweepRange) {
          for (const heldId of draggedDieIdsRef.current) {
            const heldData = diceMapRef.current.get(heldId)
            if (heldData) {
              const d = Math.hypot(
                physics.pos.x - heldData.physics.pos.x,
                physics.pos.z - heldData.physics.pos.z
              )
              if (d < SWEEP_DISTANCE) {
                inSweepRange = true
                break
              }
            }
          }
        }

        if (inSweepRange) {
          draggedDieIdsRef.current.add(id)
          physics.inMotion = false
          physics.vel.set(0, 0, 0)
          physics.rotVel.set(0, 0, 0)
          newlyGrabbed = true
        }
      }
    }

    // Apply movement tilt to all currently held dice
    for (const heldId of draggedDieIdsRef.current) {
      const heldData = diceMapRef.current.get(heldId)
      if (heldData) {
        heldData.physics.holdTilt.x = THREE.MathUtils.clamp(deltaX * 3.5, -1.2, 1.2)
        heldData.physics.holdTilt.y = THREE.MathUtils.clamp(deltaZ * 3.5, -1.2, 1.2)
      }
    }

    if (newlyGrabbed && navigator.vibrate) {
      navigator.vibrate(20)
    }
  }

  // Pointer Up: Release and throw ONLY the held/grabbed dice
  const handlePointerUp = (e) => {
    try {
      if (e && e.target && e.target.releasePointerCapture && e.pointerId) {
        e.target.releasePointerCapture(e.pointerId)
      }
    } catch (_) {}

    if (!isDraggingRef.current) return
    isDraggingRef.current = false

    const heldIds = Array.from(draggedDieIdsRef.current)
    if (heldIds.length === 0) return

    const history = recentWorldHistory.current
    let throwVx = 0
    let throwVz = 0

    if (history.length >= 2) {
      const first = history[0]
      const last = history[history.length - 1]
      const dt = Math.max((last.time - first.time) / 1000, 0.01)
      const dx = last.x - first.x
      const dz = last.z - first.z

      throwVx = (dx / dt) * 1.15
      throwVz = (dz / dt) * 1.15
    }

    const speed = Math.hypot(throwVx, throwVz)
    const isHardThrow = speed > 1.2

    // Apply throw physics ONLY to held dice
    heldIds.forEach((id, index) => {
      const dieData = diceMapRef.current.get(id)
      if (!dieData) return
      const p = dieData.physics
      p.inMotion = true

      if (isHardThrow) {
        // Natural fanned-out trajectory for multiple dice thrown together
        const spreadAngle = (index - (heldIds.length - 1) / 2) * 0.25
        const cos = Math.cos(spreadAngle)
        const sin = Math.sin(spreadAngle)
        const rotVx = throwVx * cos - throwVz * sin
        const rotVz = throwVx * sin + throwVz * cos

        p.vel.set(
          THREE.MathUtils.clamp(rotVx + (Math.random() - 0.5) * 2.5, -25, 25),
          4.0 + Math.random() * 3.5,
          THREE.MathUtils.clamp(rotVz + (Math.random() - 0.5) * 2.5, -25, 25)
        )
        p.rotVel.set(
          throwVz * 2.5 + (Math.random() - 0.5) * 35,
          (Math.random() - 0.5) * 50,
          -throwVx * 2.5 + (Math.random() - 0.5) * 35
        )
      } else {
        // Light drop
        p.vel.set((Math.random() - 0.5) * 2.0, -1.8, (Math.random() - 0.5) * 2.0)
        p.rotVel.set((Math.random() - 0.5) * 15, (Math.random() - 0.5) * 15, (Math.random() - 0.5) * 15)
      }
    })

    // Roll numbers only for the thrown dice
    if (onThrow) {
      onThrow(heldIds)
    }

    draggedDieIdsRef.current.clear()
  }

  return (
    <div
      ref={mountRef}
      className="dice-3d-canvas-container"
      onPointerDown={handlePointerDown}
      onPointerMove={handlePointerMove}
      onPointerUp={handlePointerUp}
      onPointerLeave={handlePointerUp}
      onPointerCancel={handlePointerUp}
      title="주사위를 집어 올려 던지거나 스쳐서 함께 굴려보세요"
    />
  )
}
