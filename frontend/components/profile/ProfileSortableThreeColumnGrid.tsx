'use client'

import { useMemo, type CSSProperties, type ReactNode } from 'react'
import {
  DndContext,
  type DragEndEvent,
  KeyboardSensor,
  PointerSensor,
  useSensor,
  useSensors,
  closestCorners,
} from '@dnd-kit/core'
import {
  SortableContext,
  arrayMove,
  rectSortingStrategy,
  sortableKeyboardCoordinates,
  useSortable,
} from '@dnd-kit/sortable'
import { CSS } from '@dnd-kit/utilities'

export type ProfileSortableRenderState = {
  isDragging: boolean
}

type ProfileSortableThreeColumnGridProps<T extends { id: string }> = {
  items: T[]
  /** true: statik grid (ziyaretçi veya En Yeni/Eski modunda sürükleme yok) */
  disabled?: boolean
  onReorder: (items: T[]) => void
  renderItem: (item: T, index: number, state: ProfileSortableRenderState) => ReactNode
  gridClassName?: string
}

function SortableCell<T extends { id: string }>({
  id,
  item,
  index,
  renderItem,
}: {
  id: string
  item: T
  index: number
  renderItem: ProfileSortableThreeColumnGridProps<T>['renderItem']
}) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({ id })
  const style: CSSProperties = {
    transform: CSS.Transform.toString(transform),
    transition,
    zIndex: isDragging ? 50 : undefined,
  }

  return (
    <div
      ref={setNodeRef}
      style={style}
      className="min-w-0"
      {...attributes}
      {...listeners}
    >
      {renderItem(item, index, { isDragging })}
    </div>
  )
}

/**
 * Profil gönderi/eser serbest dizimi: tek flat liste, görünüm 3 kolon grid.
 * @dnd-kit rectSortingStrategy ile çok satırlı grid reorder (hello-pangea horizontal + CSS grid uyumsuzluğu yerine).
 */
export function ProfileSortableThreeColumnGrid<T extends { id: string }>({
  items,
  disabled = false,
  onReorder,
  renderItem,
  gridClassName = '',
}: ProfileSortableThreeColumnGridProps<T>) {
  const itemIds = useMemo(() => items.map((i) => i.id), [items])

  const sensors = useSensors(
    useSensor(PointerSensor, {
      activationConstraint: { distance: 8 },
    }),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    }),
  )

  const handleDragEnd = (event: DragEndEvent) => {
    const { active, over } = event
    if (!over || active.id === over.id) return
    const oldIndex = items.findIndex((i) => i.id === active.id)
    const newIndex = items.findIndex((i) => i.id === over.id)
    if (oldIndex < 0 || newIndex < 0) return
    onReorder(arrayMove(items, oldIndex, newIndex))
  }

  const gridClasses = `grid grid-cols-3 gap-2 min-w-0 ${gridClassName}`.trim()

  if (disabled) {
    return (
      <div className={gridClasses}>
        {items.map((item, index) => (
          <div key={item.id} className="min-w-0">
            {renderItem(item, index, { isDragging: false })}
          </div>
        ))}
      </div>
    )
  }

  return (
    <DndContext sensors={sensors} collisionDetection={closestCorners} onDragEnd={handleDragEnd}>
      <SortableContext items={itemIds} strategy={rectSortingStrategy}>
        <div className={gridClasses}>
          {items.map((item, index) => (
            <SortableCell key={item.id} id={item.id} item={item} index={index} renderItem={renderItem} />
          ))}
        </div>
      </SortableContext>
    </DndContext>
  )
}
