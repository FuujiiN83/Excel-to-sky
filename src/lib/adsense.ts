const CLIENT = import.meta.env.VITE_ADSENSE_CLIENT

export function injectAdsense(): void {
  if (!CLIENT || typeof document === 'undefined') return
  if (document.querySelector(`script[data-ad-client="${CLIENT}"]`)) return
  const s = document.createElement('script')
  s.async = true
  s.src = `https://pagead2.googlesyndication.com/pagead/js/adsbygoogle.js?client=${CLIENT}`
  s.crossOrigin = 'anonymous'
  s.setAttribute('data-ad-client', CLIENT)
  document.head.appendChild(s)
}
