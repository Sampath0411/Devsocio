import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { useStore } from '../store/useStore'
import { Avatar, EmptyState } from '../components/ui'
import { subscribeNotifications } from '../lib/db'
import { Heart, UserPlus, Handshake, MessageCircle, Coins, Bell } from '../components/icons'

const ICON = {
  like: { Icon: Heart, color: '#FF4C4C' },
  follow: { Icon: UserPlus, color: '#6C63FF' },
  collab: { Icon: Handshake, color: '#00C896' },
  comment: { Icon: MessageCircle, color: '#00E5FF' },
  credits: { Icon: Coins, color: '#FFB800' },
}

export default function Notifications() {
  const firebaseUser = useStore((s) => s.firebaseUser)
  const [items, setItems] = useState([])

  useEffect(() => {
    if (!firebaseUser) return
    return subscribeNotifications(firebaseUser.uid, setItems)
  }, [firebaseUser])

  return (
    <div className="mx-auto w-full max-w-2xl">
      <h1 className="mb-4 font-display text-xl font-bold">Notifications</h1>
      {items.length === 0 ? (
        <EmptyState icon={Bell} title="No notifications yet — likes, follows and comments show up here." />
      ) : (
        <div className="card divide-y divide-border p-0">
          {items.map((n) => {
            const meta = ICON[n.type] || ICON.like
            const Icon = meta.Icon
            return (
              <div key={n.id} className={`flex items-center gap-3 px-4 py-3 ${!n.read ? 'bg-primary/5' : ''}`}>
                <span className="grid h-9 w-9 shrink-0 place-items-center rounded-full"
                  style={{ backgroundColor: `${meta.color}1a`, color: meta.color }}>
                  <Icon size={16} />
                </span>
                {n.actor && <Avatar src={n.actor.avatar} alt={n.actor.displayName} size={36} />}
                <p className="flex-1 text-sm">
                  {n.actor && (
                    <Link to={`/profile/${n.actor.username}`} className="font-semibold hover:underline">{n.actor.displayName} </Link>
                  )}
                  <span className={n.actor ? 'text-text-muted' : ''}>{n.text}</span>
                </p>
                {n.time && <span className="shrink-0 text-xs text-text-muted">{n.time}</span>}
                {!n.read && <span className="h-2 w-2 shrink-0 rounded-full bg-primary" />}
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}
