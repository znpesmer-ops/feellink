'use client'

import { useEffect, useRef } from 'react'
import * as THREE from 'three'

type GalleryLightingProps = {
  spotTargets: Array<[number, number, number]>
  compact?: boolean
}

function TrackSpot({ position, target, compact = false }: { position: [number, number, number]; target: [number, number, number]; compact?: boolean }) {
  const lightRef = useRef<THREE.SpotLight | null>(null)
  const targetRef = useRef<THREE.Object3D | null>(null)

  useEffect(() => {
    if (!lightRef.current || !targetRef.current) return
    lightRef.current.target = targetRef.current
  }, [])

  return (
    <>
      <object3D ref={targetRef} position={target} />
      <spotLight
        ref={lightRef}
        position={position}
        color="#ffd9ab"
        intensity={compact ? 850 : 2600}
        angle={0.19}
        penumbra={0.96}
        distance={20}
        decay={2}
        castShadow
        shadow-mapSize-width={compact ? 512 : 1536}
        shadow-mapSize-height={compact ? 512 : 1536}
        shadow-bias={-0.00016}
      />
      <mesh position={[position[0], position[1] - 0.08, position[2]]} rotation={[Math.PI / 2, 0, 0]} castShadow>
        <cylinderGeometry args={[0.052, 0.078, 0.32, 22]} />
        <meshStandardMaterial color="#050505" roughness={0.3} metalness={0.82} />
      </mesh>
      <mesh position={[position[0], position[1] - 0.255, position[2]]} rotation={[Math.PI / 2, 0, 0]} castShadow>
        <coneGeometry args={[0.07, 0.16, 22]} />
        <meshStandardMaterial color="#070707" roughness={0.32} metalness={0.78} />
      </mesh>
    </>
  )
}

export function GalleryLighting({ spotTargets, compact = false }: GalleryLightingProps) {
  const trackMaterial = <meshStandardMaterial color="#050505" roughness={0.26} metalness={0.86} />
  const accentTargets = compact
    ? []
    : ([
        [-5.52, 2.55, -4.7],
        [-1.8, 2.42, -8.08],
        [1.35, 2.48, -8.08],
        [5.74, 2.4, -4.62],
      ] as Array<[number, number, number]>)

  return (
    <group>
      <hemisphereLight color="#fff0dc" groundColor="#2f2821" intensity={compact ? 1.38 : 1.68} />
      <ambientLight color="#ffe6c8" intensity={compact ? 0.32 : 0.4} />
      <directionalLight
        position={[-4.8, 7.6, 4.6]}
        color="#fff0d0"
        intensity={compact ? 0.45 : 0.64}
        castShadow
        shadow-mapSize-width={compact ? 512 : 1536}
        shadow-mapSize-height={compact ? 512 : 1536}
      />
      <rectAreaLight position={[0, 4.82, -4.45]} rotation={[-Math.PI / 2.18, 0, 0]} width={10.4} height={2.1} color="#ffe0bd" intensity={compact ? 5.6 : 7.8} />
      <rectAreaLight position={[0, 3.1, 4.15]} rotation={[-Math.PI / 2.75, 0, 0]} width={8.6} height={2.2} color="#a98667" intensity={compact ? 1.3 : 1.72} />
      <rectAreaLight position={[-4.8, 2.65, -6.25]} rotation={[0, Math.PI / 2.8, 0]} width={2.8} height={3.8} color="#dfc5a5" intensity={compact ? 1.08 : 1.42} />

      <mesh position={[0, 5.36, -6.16]} castShadow receiveShadow>
        <boxGeometry args={[12.85, 0.055, 0.07]} />
        {trackMaterial}
      </mesh>
      <mesh position={[0, 5.36, -2.36]} castShadow receiveShadow>
        <boxGeometry args={[11.45, 0.055, 0.07]} />
        {trackMaterial}
      </mesh>
      <mesh position={[-6.08, 5.36, -2.86]} rotation={[0, Math.PI / 2, 0]} castShadow receiveShadow>
        <boxGeometry args={[8.9, 0.055, 0.07]} />
        {trackMaterial}
      </mesh>
      <mesh position={[6.08, 5.36, -2.86]} rotation={[0, Math.PI / 2, 0]} castShadow receiveShadow>
        <boxGeometry args={[8.9, 0.055, 0.07]} />
        {trackMaterial}
      </mesh>
      <mesh position={[0, 5.36, 1.46]} castShadow receiveShadow>
        <boxGeometry args={[8.6, 0.055, 0.07]} />
        {trackMaterial}
      </mesh>

      {[...spotTargets, ...accentTargets].map((target, index) => {
        const x = Math.abs(target[0]) > 5.8 ? target[0] * 0.92 : target[0] * 0.78
        const z = target[2] < -7.8 ? target[2] + 1.92 : target[2] + 0.54
        return (
          <TrackSpot
            key={`${target[0]}-${target[2]}-${index}`}
            compact={compact}
            position={[x, 5.05, z] as [number, number, number]}
            target={target}
          />
        )
      })}
    </group>
  )
}
