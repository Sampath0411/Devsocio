// Client bridge to the Admin Copilot backend (api/agent.js).
//
// askAgent() sends the chat history (with the admin's Firebase ID token) and
// gets back the assistant reply plus any *proposed actions*. Proposed actions
// are NOT executed by the server — the UI asks the admin to approve each one,
// then executeAction() performs it here using the same db helpers the Admin
// panel already uses (which the Firestore rules permit for the admin).
import { auth } from '../firebase'
import {
  deletePost, resolveReport, setUserFlag, changeCredits, setCredits, resolveError,
  findUserUid,
} from './db'

export async function askAgent(messages) {
  const user = auth.currentUser
  if (!user) throw new Error('Not signed in')
  const token = await user.getIdToken()
  const res = await fetch('/api/agent', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
    body: JSON.stringify({ messages }),
  })
  const data = await res.json().catch(() => ({}))
  if (!res.ok) throw new Error(data.error || `Agent request failed (${res.status})`)
  return {
    reply: data.reply || '(no response)',
    proposedActions: data.proposedActions || [],
    toolTrace: data.toolTrace || [],
  }
}

// Human-readable label for a proposed action (shown on the confirm card).
export function describeAction(a) {
  const { name, args = {} } = a
  switch (name) {
    case 'delete_post': return `Delete post ${args.postId}${args.reason ? ` — ${args.reason}` : ''}`
    case 'resolve_report': return `Mark report ${args.reportId} as "${args.status}"${args.reason ? ` — ${args.reason}` : ''}`
    case 'set_user_flag': return `${args.value ? 'Grant' : 'Remove'} "${args.field}" ${args.value ? 'to' : 'from'} user ${args.uid}${args.reason ? ` — ${args.reason}` : ''}`
    case 'change_credits': return `${args.delta >= 0 ? 'Add' : 'Remove'} ${Math.abs(args.delta)} credits ${args.delta >= 0 ? 'to' : 'from'} user ${args.uid}${args.reason ? ` — ${args.reason}` : ''}`
    case 'set_credits': return `Set user ${args.uid} credits to ${args.value}${args.reason ? ` — ${args.reason}` : ''}`
    case 'resolve_error': return `Mark error ${args.errorId} resolved`
    default: return `${name} ${JSON.stringify(args)}`
  }
}

// Resolve the user an action targets; throws a clear error if not found so we
// never silently write to a wrong or non-existent document.
async function requireUid(idOrName) {
  const uid = await findUserUid(idOrName)
  if (!uid) throw new Error(`Couldn't find a user matching "${idOrName}". Ask the Copilot to look the user up first.`)
  return uid
}

// Execute an admin-approved action. Returns a short confirmation string.
export async function executeAction(a) {
  const { name, args = {} } = a
  switch (name) {
    case 'delete_post': {
      if (!args.postId) throw new Error('No postId provided.')
      await deletePost(args.postId)
      return `Deleted post ${args.postId}.`
    }
    case 'resolve_report': {
      if (!args.reportId) throw new Error('No reportId provided.')
      await resolveReport(args.reportId, args.status || 'reviewed')
      return `Report ${args.reportId} marked ${args.status || 'reviewed'}.`
    }
    case 'set_user_flag': {
      const uid = await requireUid(args.uid)
      await setUserFlag(uid, args.field, !!args.value)
      return `${args.field} ${args.value ? 'granted to' : 'removed from'} ${args.uid}.`
    }
    case 'change_credits': {
      const uid = await requireUid(args.uid)
      const delta = Number(args.delta)
      if (!Number.isFinite(delta)) throw new Error('Invalid credit amount.')
      await changeCredits(uid, delta)
      return `${delta >= 0 ? '+' : ''}${delta} credits → ${args.uid}.`
    }
    case 'set_credits': {
      const uid = await requireUid(args.uid)
      const value = Number(args.value)
      if (!Number.isFinite(value)) throw new Error('Invalid credit value.')
      await setCredits(uid, value)
      return `Set ${args.uid} credits to ${value}.`
    }
    case 'resolve_error': {
      if (!args.errorId) throw new Error('No errorId provided.')
      await resolveError(args.errorId)
      return `Error ${args.errorId} resolved.`
    }
    default:
      throw new Error(`Unknown action: ${name}`)
  }
}
