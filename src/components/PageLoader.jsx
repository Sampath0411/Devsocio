import { useEffect, useState } from 'react'
import { motion } from 'framer-motion'

// §6.5.1 — Global page loader: characters type in one by one with a blinking
// cursor on a full-screen dark background, then fade out (max ~1.5s).
export default function PageLoader({ onDone }) {
  const word = 'DevSocio'
  const [count, setCount] = useState(0)

  useEffect(() => {
    if (count < word.length) {
      const id = setTimeout(() => setCount((c) => c + 1), 110)
      return () => clearTimeout(id)
    }
    const id = setTimeout(onDone, 450)
    return () => clearTimeout(id)
  }, [count, onDone])

  return (
    <motion.div
      className="fixed inset-0 z-50 flex flex-col items-center justify-center bg-bg"
      exit={{ opacity: 0 }}
      transition={{ duration: 0.4 }}
    >
      <div className="font-display text-5xl font-extrabold tracking-tight">
        <span className="text-text-primary">{word.slice(0, count)}</span>
        <span className="animate-blink text-primary">|</span>
      </div>
      <p className="mt-3 font-mono text-xs text-text-muted">where developers live online</p>
    </motion.div>
  )
}
