import { Link } from 'react-router-dom'
import { Avatar } from '../components/ui'
import { NOTIFICATIONS } from '../data/mock'
import { Heart, UserPlus, Handshake, MessageCircle, Coins } from '../components/icons'

const ICON = {
  like: { Icon: Heart, color: '#FF4C4C' },
  follow: { Icon: UserPlus, color: '#6C63FF' },
  collab: { Icon: Handshake, color: '#00C896' },
  comment: { Icon: MessageCircle, color: '#00E5FF' },
  credits: { Icon: Coins, color: '#FFB800' },
}

export default function Notifications() {
  return (
    <div className="mx-auto w-full max-w-2xl">
      <h1 className="mb-4 font-display text-xl font-bold">Notifications</h1>
      <div className="card divide-y divide-border p-0">
        {NOTIFICATIONS.map((n) => {
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
              <span className="shrink-0 text-xs text-text-muted">{n.time}</span>
              {!n.read && <span className="h-2 w-2 shrink-0 rounded-full bg-primary" />}
            </div>
          )
        })}
      </div>
    </div>
  )
}
