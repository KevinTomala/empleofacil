import { useEffect, useState } from 'react'
import { ArrowUp } from 'lucide-react'

export default function ScrollToTop() {
  const [visible, setVisible] = useState(false)

  useEffect(() => {
    function onScroll() {
      setVisible(window.scrollY > 200)
    }
    onScroll()
    window.addEventListener('scroll', onScroll, { passive: true })
    return () => window.removeEventListener('scroll', onScroll)
  }, [])

  function handleClick() {
    window.scrollTo({ top: 0, behavior: 'smooth' })
  }

  if (!visible) return null

  return (
    <button
      aria-label="Ir al inicio"
      onClick={handleClick}
      className="fixed right-6 bottom-6 w-12 h-12 rounded-full bg-primary text-white flex items-center justify-center shadow-lg hover:scale-105 transition-transform z-50"
    >
      <ArrowUp className="w-5 h-5" />
    </button>
  )
}
