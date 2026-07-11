export const MOBILE_TERMINAL_MEDIA_QUERY = '(max-width: 767px), (pointer: coarse)'

export function isMobileTerminalViewport() {
  if (typeof window === 'undefined') {
    return false
  }

  return window.matchMedia(MOBILE_TERMINAL_MEDIA_QUERY).matches
}
