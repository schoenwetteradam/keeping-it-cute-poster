'use client'

import { useEffect, useRef, useState } from 'react'

// Fades + lifts its children into view when scrolled to. The content is always
// server-rendered in the DOM (good for SEO); this only drives the visual entrance.
export default function Reveal({ children, className = '', delay = 0, as: Tag = 'div', ...rest }) {
  const ref = useRef(null)
  const [visible, setVisible] = useState(false)

  useEffect(() => {
    const el = ref.current
    if (!el) return
    if (typeof IntersectionObserver === 'undefined') { setVisible(true); return }
    const obs = new IntersectionObserver(
      entries => entries.forEach(e => {
        if (e.isIntersecting) { setVisible(true); obs.unobserve(e.target) }
      }),
      { threshold: 0.12, rootMargin: '0px 0px -40px 0px' }
    )
    obs.observe(el)
    return () => obs.disconnect()
  }, [])

  return (
    <Tag
      ref={ref}
      className={`reveal ${visible ? 'is-visible' : ''} ${className}`}
      style={delay ? { transitionDelay: `${delay}ms` } : undefined}
      {...rest}
    >
      {children}
    </Tag>
  )
}
