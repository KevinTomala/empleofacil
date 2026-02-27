import { io } from 'socket.io-client'

let socketInstance = null
let consumers = 0
let pendingDisconnectTimer = null

function getSocketUrl() {
  return import.meta.env.VITE_WS_URL || import.meta.env.VITE_API_URL || 'http://localhost:3000'
}

export function connectMensajesSocket(token) {
  const safeToken = String(token || '').trim()
  if (!safeToken) return null

  if (pendingDisconnectTimer) {
    clearTimeout(pendingDisconnectTimer)
    pendingDisconnectTimer = null
  }

  if (!socketInstance) {
    socketInstance = io(getSocketUrl(), {
      transports: ['websocket'],
      auth: { token: safeToken }
    })
  } else if (!socketInstance.connected) {
    socketInstance.auth = { token: safeToken }
    socketInstance.connect()
  }

  consumers += 1
  return socketInstance
}

export function getMensajesSocket() {
  return socketInstance
}

export function joinConversation(conversationId) {
  const safeId = Number(conversationId)
  if (!socketInstance || !Number.isInteger(safeId) || safeId <= 0) return
  socketInstance.emit('mensajes:join_conversacion', { conversacion_id: safeId })
}

export function leaveConversation(conversationId) {
  const safeId = Number(conversationId)
  if (!socketInstance || !Number.isInteger(safeId) || safeId <= 0) return
  socketInstance.emit('mensajes:leave_conversacion', { conversacion_id: safeId })
}

export function releaseMensajesSocket() {
  consumers = Math.max(0, consumers - 1)
  if (!socketInstance || consumers > 0) return

  if (pendingDisconnectTimer) clearTimeout(pendingDisconnectTimer)
  pendingDisconnectTimer = setTimeout(() => {
    if (!socketInstance || consumers > 0) return
    socketInstance.disconnect()
    socketInstance = null
    pendingDisconnectTimer = null
  }, 150)
}

export function disconnectSocket() {
  consumers = 0
  if (pendingDisconnectTimer) {
    clearTimeout(pendingDisconnectTimer)
    pendingDisconnectTimer = null
  }
  if (!socketInstance) return
  socketInstance.disconnect()
  socketInstance = null
}
