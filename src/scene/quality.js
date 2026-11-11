const SMALL_SCREEN = '(max-width: 768px)'

export function currentQuality() {
  if (typeof window === 'undefined' || !window.matchMedia) return 'high'
  return window.matchMedia(SMALL_SCREEN).matches ? 'low' : 'high'
}

export function maxPixelRatio(quality = currentQuality()) {
  return quality === 'low' ? 1.5 : 2
}

export function watchQuality(onChange) {
  if (typeof window === 'undefined' || !window.matchMedia) return () => {}
  const media = window.matchMedia(SMALL_SCREEN)
  const apply = () => onChange(media.matches ? 'low' : 'high')
  media.addEventListener('change', apply)
  return () => media.removeEventListener('change', apply)
}
