import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { useStore } from '../store/useStore'
import { Avatar, EmptyState } from '../components/ui'
import { subscribeNotifications, markAllNotificationsRead } from '../lib/db'
import { timeAgo } from '../lib/time'
import { Heart, UserPlus, Handshake, MessageCircle, Coins, Bell, AtSign } from '../components/icons'

const ICON = {
  like: { Icon: Heart, color: '#FCA311' },
  follow: { Icon: UserPlus, color: '#FCA311' },
  collab: { Icon: Handshake, color: '#22C55E' },
  comment: { Icon: MessageCircle, color: '#60A5FA' },
  mention: { Icon: AtSign, color: '#A78BFA' },
  credits: { Icon: Coins, color: '#FCA311' },
}

export default function Notifications() {
  const firebaseUser = useStore((s) => s.firebaseUser)
  const [items, setItems] = useState([])

  useEffect(() => {
    if (!firebaseUser) return
    return subscribeNotifications(firebaseUser.uid, setItems)
  }, [firebaseUser])

  // Clear the unread badge once the user is looking at the list.
  useEffect(() => {
    if (firebaseUser && items.some((n) => !n.read)) {
      markAllNotificationsRead(firebaseUser.uid, items)
    }
  }, [firebaseUser, items])

  return (
    <div className="mx-auto w-full max-w-2xl">
      <h1 className="mb-5 font-display text-xl font-bold text-white">Notifications</h1>
      {items.length === 0 ? (
        <EmptyState icon={Bell} title="No notifications yet — likes, follows and comments show up here." />
      ) : (
        <div className="overflow-hidden rounded-2xl border border-border divide-y divide-border"
          style={{ background: 'linear-gradient(135deg, rgba(20,33,61,0.8), rgba(13,22,40,0.9))' }}>
          {items.map((n) => {
            const meta = ICON[n.type] || ICON.like
            const Icon = meta.Icon
            return (
              <div
                key={n.id}
                className={`flex items-center gap-3 px-4 py-3.5 transition-colors hover:bg-surface-2/50 ${
                  !n.read ? 'border-l-2 border-primary' : ''
                }`}
                style={!n.read ? { background: 'rgba(252,163,17,0.04)' } : {}}
              >
                <span
                  className="grid h-9 w-9 shrink-0 place-items-center rounded-full"
                  style={{ backgroundColor: `${meta.color}18`, color: meta.color }}
                >
                  <Icon size={15} />
                </span>
                {n.actor && <Avatar src={n.actor.avatar} alt={n.actor.displayName} size={36} />}
                <p className="flex-1 text-sm">
                  {n.actor && (
                    n.actor.username ? (
                      <Link
                        to={`/profile/${n.actor.username}`}
                        className="font-bold text-white hover:text-primary transition-colors"
                      >
                        {n.actor.displayName}{' '}
                      </Link>
                    ) : (
                      <span className="font-bold text-white">{n.actor.displayName || 'Developer'} </span>
                    )
                  )}
                  <span className={n.actor ? 'text-text-muted' : 'text-text-secondary'}>{n.text}</span>
                </p>
                {(n.time || n.createdAt) && (
                  <span className="shrink-0 text-xs text-text-muted">
                    {n.time || timeAgo(n.createdAt)}
                  </span>
                )}
                {!n.read && (
                  <span className="h-2 w-2 shrink-0 rounded-full bg-primary" />
                )}
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}
