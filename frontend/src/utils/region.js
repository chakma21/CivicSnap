// Wards are free text (e.g. "FC Road, Pune"), and a municipal official's region
// is also free text (e.g. "Pune"). An exact match would miss every issue whose
// ward names a specific locality within that region, so match by substring in
// either direction — "pune" matches "fc road, pune", and "morena" still matches
// an exact "morena".
export function matchesRegion(wardId, region) {
  const ward = (wardId || '').trim().toLowerCase()
  const normalizedRegion = (region || '').trim().toLowerCase()
  if (!normalizedRegion) return true
  if (!ward) return false
  return ward.includes(normalizedRegion) || normalizedRegion.includes(ward)
}
