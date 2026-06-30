export const toFiniteDistanceKm = (value) => {
  if (value === null || value === undefined || value === '') return null;
  if (typeof value === 'number') return Number.isFinite(value) ? value : null;

  const text = String(value).trim().toLowerCase();
  if (!text) return null;

  const numeric = Number.parseFloat(text.replace(/,/g, ''));
  if (!Number.isFinite(numeric)) return null;
  if (text.includes('meter') || /\bm\b/.test(text)) return numeric / 1000;
  return numeric;
};

export const formatDistance = (value) => {
  const distanceKm = toFiniteDistanceKm(value);
  if (distanceKm === null) return '';
  if (distanceKm < 1) return `${Math.max(1, Math.round(distanceKm * 1000))} m`;
  return `${distanceKm.toFixed(1)} km`;
};
