import { Construction, Trash2, Lightbulb, Droplet, CircleAlert } from 'lucide-react'

export const CATEGORIES = ['all', 'road', 'garbage', 'streetlight', 'water', 'other']

export const CATEGORY_META = {
  road: { icon: Construction, label: 'Road', color: '#c1652e' },
  garbage: { icon: Trash2, label: 'Garbage', color: '#4a7c59' },
  streetlight: { icon: Lightbulb, label: 'Streetlight', color: '#b8860b' },
  water: { icon: Droplet, label: 'Water', color: '#2563a8' },
  other: { icon: CircleAlert, label: 'Other', color: '#6b5b95' },
}

export function categoryMeta(category) {
  return CATEGORY_META[category] || CATEGORY_META.other
}
