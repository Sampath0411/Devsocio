import { createContext, useContext, useCallback, useState } from 'react'
import { AnimatePresence, motion } from 'framer-motion'
import { Coins, Check, AlertTriangle } from './icons'

// Toast system for credits/referral/level events (PRD §6.6).
// Pass an icon component via opts.icon; defaults by tone.
const ToastContext = createContext(() => {})
export const useToast = () => useContext(ToastContext)

const TONE = {
  primary: { color: '#6C63FF', Icon: Coins },
  success: { color: '#00C896', Icon: Check },
  warning: { color: '#FFB800', Icon: AlertTriangle },
}

let nextId = 1

export function ToastProvider({ children }) {
  const [toasts, setToasts] = useState([])

  const toast = useCallback((message, opts = {}) => {
    const id = nextId++
    const tone = TONE[opts.tone] || TONE.primary
    // Accept only component icons; ignore legacy emoji-string icons.
    const Icon = typeof opts.icon === 'function' ? opts.icon : tone.Icon
    setToasts((t) => [...t, { id, message, Icon, color: tone.color }])
    setTimeout(() => setToasts((t) => t.filter((x) => x.id !== id)), opts.duration || 3200)
  }, [])

  return (
    <ToastContext.Provider value={toast}>
      {children}
      <div className="fixed right-4 top-4 z-[60] flex w-80 max-w-[90vw] flex-col gap-2">
        <AnimatePresence>
          {toasts.map((t) => (
            <motion.div
              key={t.id}
              initial={{ opacity: 0, x: 40, y: -8 }}
              animate={{ opacity: 1, x: 0, y: 0 }}
              exit={{ opacity: 0, x: 40 }}
              transition={{ type: 'spring', stiffness: 380, damping: 28 }}
              className="card flex items-center gap-3 py-3 shadow-[0_8px_30px_-10px_rgba(0,0,0,0.7)]"
              style={{ borderColor: `${t.color}55` }}
            >
              <motion.span
                initial={{ rotateY: 0, scale: 0.6 }}
                animate={{ rotateY: 360, scale: 1 }}
                transition={{ duration: 0.5 }}
                className="grid h-8 w-8 shrink-0 place-items-center rounded-full"
                style={{ backgroundColor: `${t.color}1a`, color: t.color }}
              >
                <t.Icon size={16} />
              </motion.span>
              <span className="text-sm font-medium">{t.message}</span>
            </motion.div>
          ))}
        </AnimatePresence>
      </div>
    </ToastContext.Provider>
  )
}
