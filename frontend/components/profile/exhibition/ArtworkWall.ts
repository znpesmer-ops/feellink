import type { Group, Material } from 'three'

type ThreeModule = typeof import('three')

type ArtworkWallProps = {
  THREE: ThreeModule
  parent: Group
  width: number
  height: number
  depth: number
  position: [number, number, number]
  rotationY?: number
  wallMaterial: Material
  trimMaterial: Material
  panelCount?: number
}

function addBox(
  THREE: ThreeModule,
  parent: Group,
  size: [number, number, number],
  position: [number, number, number],
  material: Material,
) {
  const mesh = new THREE.Mesh(new THREE.BoxGeometry(...size), material)
  mesh.position.set(...position)
  mesh.receiveShadow = true
  parent.add(mesh)
  return mesh
}

export function ArtworkWall({
  THREE,
  parent,
  width,
  height,
  depth,
  position,
  rotationY = 0,
  wallMaterial,
  trimMaterial,
  panelCount = 4,
}: ArtworkWallProps) {
  const group = new THREE.Group()
  group.position.set(...position)
  group.rotation.y = rotationY
  parent.add(group)

  addBox(THREE, group, [width, height, depth], [0, height / 2, 0], wallMaterial)
  addBox(THREE, group, [width, 0.18, depth + 0.05], [0, 0.09, depth * 0.12], trimMaterial)
  addBox(THREE, group, [width, 0.11, depth + 0.035], [0, height - 0.16, depth * 0.08], trimMaterial)

  if (panelCount > 1) {
    const revealMaterial = new THREE.MeshStandardMaterial({
      color: '#d8d0c4',
      roughness: 0.84,
      metalness: 0,
      transparent: true,
      opacity: 0.46,
    })
    const panelWidth = width / panelCount
    const dividerStartY = 1.18
    const dividerHeight = Math.max(1.8, height - dividerStartY - 0.5)
    for (let index = 1; index < panelCount; index += 1) {
      addBox(
        THREE,
        group,
        [0.014, dividerHeight, depth + 0.012],
        [-width / 2 + panelWidth * index, dividerStartY + dividerHeight / 2, depth / 2 + 0.006],
        revealMaterial,
      )
    }
  }

  return group
}
