'use client'

import * as THREE from 'three'

type GalleryBenchProps = {
  position?: [number, number, number]
}

export function GalleryBench({ position = [0, 0, 1.35] }: GalleryBenchProps) {
  return (
    <group position={position} rotation={[0, 0, 0]}>
      <mesh position={[0, 0.5, 0]} castShadow receiveShadow>
        <boxGeometry args={[2.86, 0.16, 0.68]} />
        <meshPhysicalMaterial
          color="#735234"
          roughness={0.27}
          metalness={0.04}
          clearcoat={0.56}
          clearcoatRoughness={0.2}
          envMapIntensity={0.72}
        />
      </mesh>
      <mesh position={[0, 0.28, 0]} castShadow receiveShadow>
        <boxGeometry args={[2.58, 0.3, 0.52]} />
        <meshStandardMaterial color="#11100f" roughness={0.46} metalness={0.44} />
      </mesh>
      {[-1.14, 1.14].map((x) => (
        <mesh key={x} position={[x * 0.88, 0.08, 0]} castShadow receiveShadow>
          <boxGeometry args={[0.22, 0.24, 0.48]} />
          <meshStandardMaterial color="#080808" roughness={0.44} metalness={0.48} />
        </mesh>
      ))}
      <mesh position={[0, 0.635, 0]} rotation={[-Math.PI / 2, 0, 0]}>
        <planeGeometry args={[2.48, 0.48]} />
        <meshBasicMaterial color="#ffe4b8" transparent opacity={0.045} toneMapped={false} side={THREE.DoubleSide} />
      </mesh>
    </group>
  )
}
