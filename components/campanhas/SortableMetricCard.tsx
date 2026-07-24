'use client'

import { useSortable } from '@dnd-kit/sortable'
import { CSS } from '@dnd-kit/utilities'
import { GripVertical } from 'lucide-react'
import { CampaignMetric } from '@/hooks/useCampanhas'

export function SortableMetricCard({ metric }: { metric: CampaignMetric }) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({ id: metric.metric_key })

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.5 : 1,
    zIndex: isDragging ? 1 : 0,
  }

  return (
    <div
      ref={setNodeRef}
      style={style}
      className="group relative bg-surface border border-border rounded-xl p-3 shadow-sm"
    >
      <button
        {...attributes}
        {...listeners}
        className="absolute top-1.5 right-1.5 text-text-disabled hover:text-text-muted opacity-0 group-hover:opacity-100 transition-opacity cursor-grab active:cursor-grabbing"
        title="Arrastar para reordenar"
      >
        <GripVertical size={14} />
      </button>
      <p className="text-text-muted text-[10px] uppercase font-bold tracking-wider mb-1 pr-4">{metric.metric_label}</p>
      <p className="text-text-main font-bold text-sm">{metric.metric_value ?? '—'}</p>
    </div>
  )
}
