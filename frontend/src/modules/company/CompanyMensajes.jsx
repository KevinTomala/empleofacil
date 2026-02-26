import { useCallback, useEffect, useMemo, useState } from 'react'
import {
  ArrowLeft,
  Info,
  MessageCircleMore,
  Search,
  SendHorizontal,
  SquarePen,
  UserCircle2,
  X,
} from 'lucide-react'
import Header from '../../components/Header'
import { useAuth } from '../../context/AuthContext'
import { apiRequest } from '../../services/api'
import {
  createMensajesDirectConversation,
  createMensajesVacanteConversation,
  getMensajesConversacion,
  getMensajesErrorMessage,
  listMensajesConversacionItems,
  listMensajesConversaciones,
  markConversacionRead,
  sendMensajeToConversacion,
} from '../../services/mensajes.api'
import { showToast } from '../../utils/showToast'
import './company.css'

function buildConversationTitle(item, role) {
  if (!item) return 'Conversacion'
  if (role === 'candidato') return item.contratante_nombre || item.counterpart_nombre || 'Contratante'
  if (role === 'empresa') return item.candidato_nombre || item.counterpart_nombre || 'Candidato'
  return item.counterpart_nombre || item.candidato_nombre || item.contratante_nombre || 'Conversacion'
}

function formatWhen(value) {
  if (!value) return ''
  const date = new Date(value)
  if (Number.isNaN(date.getTime())) return ''
  return new Intl.DateTimeFormat('es-EC', {
    day: '2-digit',
    month: 'short',
    hour: '2-digit',
    minute: '2-digit',
    hour12: false,
  }).format(date)
}

function getInitials(text) {
  return String(text || '')
    .trim()
    .split(/\s+/)
    .slice(0, 2)
    .map((part) => part[0] || '')
    .join('')
    .toUpperCase() || 'NA'
}

function toAssetUrl(value) {
  const raw = String(value || '').trim()
  if (!raw) return ''
  if (raw.startsWith('http://') || raw.startsWith('https://')) return raw
  const normalized = raw.replace(/\\/g, '/')
  const uploadsIdx = normalized.toLowerCase().indexOf('/uploads/')
  const uploadsPath = uploadsIdx >= 0
    ? normalized.slice(uploadsIdx)
    : normalized.toLowerCase().startsWith('uploads/')
      ? `/${normalized}`
      : normalized
  const apiBase = import.meta.env.VITE_API_URL || 'http://localhost:3000'
  if (uploadsPath.startsWith('/')) return `${apiBase}${uploadsPath}`
  return `${apiBase}/${uploadsPath}`
}

function getConversationAvatarUrl(item, role) {
  if (!item) return ''
  if (role === 'empresa') {
    return String(item.candidato_foto_url || item.counterpart_avatar_url || '').trim()
  }
  if (role === 'candidato') {
    return String(item.contratante_logo_url || item.contratante_foto_url || item.counterpart_avatar_url || '').trim()
  }
  return String(
    item.counterpart_avatar_url
      || item.candidato_foto_url
      || item.contratante_logo_url
      || item.contratante_foto_url
      || ''
  ).trim()
}

function Avatar({ label, url, className = '' }) {
  const [imageBroken, setImageBroken] = useState(false)
  const src = imageBroken ? '' : toAssetUrl(url)

  return (
    <div className={`efmsg-avatar ${className}`.trim()}>
      {src ? (
        <img
          src={src}
          alt={label || 'Avatar'}
          className="efmsg-avatar-img"
          onError={() => setImageBroken(true)}
          loading="lazy"
        />
      ) : (
        getInitials(label)
      )}
    </div>
  )
}

function formatVacanteLabel(vacante) {
  if (!vacante) return ''
  const titulo = String(vacante.titulo || '').trim() || `Vacante #${vacante.id}`
  const ciudad = String(vacante.ciudad || '').trim()
  const provincia = String(vacante.provincia || '').trim()
  const ubicacion = [ciudad, provincia].filter(Boolean).join(', ')
  return ubicacion ? `${titulo} - ${ubicacion}` : titulo
}

function formatPostulanteLabel(item) {
  if (!item) return ''
  const nombre = String(`${item.nombres || ''} ${item.apellidos || ''}`).trim() || `Candidato #${item.candidato_id}`
  const email = String(item.email || '').trim()
  return email ? `${nombre} - ${email}` : nombre
}

function ConversationInfoPanel({ selected, detail, role, onBack, isMobileInfo }) {
  const title = buildConversationTitle(selected, role)
  const participants = Array.isArray(detail?.participantes) ? detail.participantes : []
  const avatarUrl = getConversationAvatarUrl(selected, role)

  return (
    <aside className="efmsg-pane efmsg-info-pane">
      <div className="efmsg-info-header">
        {isMobileInfo ? (
          <button type="button" className="efmsg-icon-btn" onClick={onBack} aria-label="Volver">
            <ArrowLeft className="w-5 h-5" />
          </button>
        ) : null}
        <h3 className="efmsg-info-title">Detalle</h3>
      </div>

      {!selected ? (
        <div className="efmsg-empty">Selecciona una conversacion para ver la tarjeta.</div>
      ) : (
        <div className="efmsg-info-body">
          <div className="efmsg-profile">
            <Avatar label={title} url={avatarUrl} className="large" />
            <h4>{title}</h4>
            <p>{selected?.vacante_titulo ? `Vacante: ${selected.vacante_titulo}` : 'Conversacion directa'}</p>
          </div>

          <div className="efmsg-section">
            <h5>Informacion de mensajes</h5>
            <p>Tipo: {selected?.tipo || 'vacante'}</p>
            <p>Ultima actividad: {formatWhen(selected?.last_message_at || selected?.updated_at) || 'N/D'}</p>
            <p>Sin leer: {Number(selected?.unread_count || 0)}</p>
          </div>

          <div className="efmsg-section">
            <h5>Participantes</h5>
            {!participants.length ? (
              <p className="efmsg-muted">Sin participantes visibles.</p>
            ) : (
              participants.map((person) => (
                <div key={`${person.usuario_id}-${person.rol_contexto}`} className="efmsg-participant">
                  <span className="efmsg-dot" />
                  <span>{person.nombre_completo || person.email || `Usuario #${person.usuario_id}`}</span>
                  <small>{person.rol_contexto}</small>
                </div>
              ))
            )}
          </div>
        </div>
      )}
    </aside>
  )
}

export default function CompanyMensajes() {
  const { user } = useAuth()
  const role = user?.rol || ''
  const currentUserId = Number(user?.id || 0)

  const [viewport, setViewport] = useState('large')
  const [mobileView, setMobileView] = useState('list')
  const [showInfoDrawer, setShowInfoDrawer] = useState(false)
  const [showComposerModal, setShowComposerModal] = useState(false)

  const [loading, setLoading] = useState(true)
  const [loadingMessages, setLoadingMessages] = useState(false)
  const [sending, setSending] = useState(false)
  const [error, setError] = useState('')
  const [items, setItems] = useState([])
  const [selectedId, setSelectedId] = useState(null)
  const [messages, setMessages] = useState([])
  const [conversationDetail, setConversationDetail] = useState(null)

  const [query, setQuery] = useState('')
  const [composer, setComposer] = useState('')
  const [vacantesActivas, setVacantesActivas] = useState([])
  const [vacantesLoading, setVacantesLoading] = useState(false)
  const [vacanteSearch, setVacanteSearch] = useState('')
  const [selectedVacante, setSelectedVacante] = useState(null)
  const [postulantesVacante, setPostulantesVacante] = useState([])
  const [postulantesLoading, setPostulantesLoading] = useState(false)
  const [postulanteSearch, setPostulanteSearch] = useState('')
  const [selectedPostulante, setSelectedPostulante] = useState(null)
  const [vacanteListOpen, setVacanteListOpen] = useState(false)
  const [postulanteListOpen, setPostulanteListOpen] = useState(false)
  const [targetUserInput, setTargetUserInput] = useState('')

  const isMobile = viewport === 'mobile'
  const isLarge = viewport === 'large'
  const selected = useMemo(
    () => items.find((item) => Number(item?.id) === Number(selectedId)) || null,
    [items, selectedId]
  )
  const participantByUserId = useMemo(() => {
    const participants = Array.isArray(conversationDetail?.participantes) ? conversationDetail.participantes : []
    const map = new Map()
    participants.forEach((person) => {
      const userId = Number(person?.usuario_id || 0)
      if (userId <= 0) return
      map.set(userId, person)
    })
    return map
  }, [conversationDetail])
  const counterpartReadMaxId = useMemo(() => {
    const participants = Array.isArray(conversationDetail?.participantes) ? conversationDetail.participantes : []
    const values = participants
      .filter((person) => Number(person?.usuario_id || 0) !== currentUserId)
      .map((person) => Number(person?.ultimo_leido_mensaje_id || 0))
      .filter((id) => Number.isInteger(id) && id > 0)
    if (!values.length) return 0
    return Math.max(...values)
  }, [conversationDetail, currentUserId])

  useEffect(() => {
    function syncViewport() {
      if (window.innerWidth >= 1280) setViewport('large')
      else if (window.innerWidth >= 1024) setViewport('medium')
      else setViewport('mobile')
    }
    syncViewport()
    window.addEventListener('resize', syncViewport)
    return () => window.removeEventListener('resize', syncViewport)
  }, [])

  useEffect(() => {
    if (!isMobile) {
      setMobileView('mensaje')
      setShowInfoDrawer(false)
    } else if (!selectedId) {
      setMobileView('list')
    }
  }, [isMobile, selectedId])

  const fetchConversations = useCallback(async () => {
    try {
      setLoading(true)
      const data = await listMensajesConversaciones({ page: 1, page_size: 80 })
      const nextItems = Array.isArray(data?.items) ? data.items : []
      setItems(nextItems)
      setError('')
      if (!selectedId && nextItems.length && !isMobile) {
        setSelectedId(nextItems[0].id)
      } else if (selectedId && !nextItems.some((item) => Number(item.id) === Number(selectedId))) {
        setSelectedId(nextItems[0]?.id || null)
      }
    } catch (err) {
      setItems([])
      setSelectedId(null)
      setError(getMensajesErrorMessage(err, 'No se pudo cargar la bandeja.'))
    } finally {
      setLoading(false)
    }
  }, [selectedId, isMobile])

  const fetchMessagesAndDetail = useCallback(async (conversationId) => {
    if (!conversationId) {
      setMessages([])
      setConversationDetail(null)
      return
    }

    try {
      setLoadingMessages(true)
      const [messagesData, detailData] = await Promise.all([
        listMensajesConversacionItems(conversationId, { page: 1, page_size: 200 }),
        getMensajesConversacion(conversationId),
      ])

      const next = Array.isArray(messagesData?.items) ? messagesData.items : []
      setMessages(next)
      setConversationDetail(detailData?.conversacion || null)

      const lastMessageId = next[next.length - 1]?.id || null
      await markConversacionRead(conversationId, lastMessageId)
      setItems((prev) => prev.map((item) => (
        Number(item.id) === Number(conversationId)
          ? { ...item, unread_count: 0 }
          : item
      )))
    } catch (err) {
      setMessages([])
      setConversationDetail(null)
      showToast({ type: 'error', message: getMensajesErrorMessage(err, 'No se pudieron cargar los mensajes.') })
    } finally {
      setLoadingMessages(false)
    }
  }, [])

  useEffect(() => {
    fetchConversations()
  }, [fetchConversations])

  useEffect(() => {
    fetchMessagesAndDetail(selectedId)
  }, [selectedId, fetchMessagesAndDetail])

  const fetchVacantesActivas = useCallback(async () => {
    try {
      setVacantesLoading(true)
      const data = await apiRequest('/api/vacantes/mias?page=1&page_size=200&estado=activa')
      const itemsList = Array.isArray(data?.items) ? data.items : []
      setVacantesActivas(itemsList)
    } catch (err) {
      setVacantesActivas([])
      showToast({
        type: 'error',
        message: getMensajesErrorMessage(err, 'No se pudieron cargar tus vacantes activas.')
      })
    } finally {
      setVacantesLoading(false)
    }
  }, [])

  const fetchPostulantesByVacante = useCallback(async (vacanteId) => {
    const safeVacanteId = Number(vacanteId)
    if (!Number.isInteger(safeVacanteId) || safeVacanteId <= 0) {
      setPostulantesVacante([])
      return
    }

    try {
      setPostulantesLoading(true)
      const data = await apiRequest(`/api/postulaciones/empresa?vacante_id=${safeVacanteId}&page=1&page_size=500`)
      const itemsList = Array.isArray(data?.items) ? data.items : []
      const unique = []
      const seen = new Set()
      itemsList.forEach((item) => {
        const candidateId = Number(item?.candidato_id || 0)
        if (!candidateId || seen.has(candidateId)) return
        seen.add(candidateId)
        unique.push(item)
      })
      setPostulantesVacante(unique)
    } catch (err) {
      setPostulantesVacante([])
      showToast({
        type: 'error',
        message: getMensajesErrorMessage(err, 'No se pudieron cargar los postulantes de esta vacante.')
      })
    } finally {
      setPostulantesLoading(false)
    }
  }, [])

  useEffect(() => {
    if (!showComposerModal) return
    setVacanteSearch('')
    setSelectedVacante(null)
    setPostulanteSearch('')
    setSelectedPostulante(null)
    setPostulantesVacante([])
    setVacanteListOpen(false)
    setPostulanteListOpen(false)
    fetchVacantesActivas()
  }, [showComposerModal, fetchVacantesActivas])

  const closeComposerModal = () => {
    setShowComposerModal(false)
    setVacanteListOpen(false)
    setPostulanteListOpen(false)
  }

  const filteredItems = useMemo(() => {
    const term = query.trim().toLowerCase()
    if (!term) return items
    return items.filter((item) => {
      const title = buildConversationTitle(item, role).toLowerCase()
      const preview = String(item?.last_message_body || '').toLowerCase()
      const vacante = String(item?.vacante_titulo || '').toLowerCase()
      return title.includes(term) || preview.includes(term) || vacante.includes(term)
    })
  }, [items, query, role])

  const filteredVacantes = useMemo(() => {
    const term = vacanteSearch.trim().toLowerCase()
    if (!term) return vacantesActivas
    return vacantesActivas.filter((item) => formatVacanteLabel(item).toLowerCase().includes(term))
  }, [vacantesActivas, vacanteSearch])

  const filteredPostulantes = useMemo(() => {
    const term = postulanteSearch.trim().toLowerCase()
    if (!term) return postulantesVacante
    return postulantesVacante.filter((item) => formatPostulanteLabel(item).toLowerCase().includes(term))
  }, [postulantesVacante, postulanteSearch])

  const selectConversation = (conversationId) => {
    setSelectedId(conversationId)
    if (isMobile) {
      setMobileView('mensaje')
    }
  }

  const openInfo = () => {
    if (!selectedId) return
    if (isLarge) return
    if (isMobile) {
      setMobileView('info')
      return
    }
    setShowInfoDrawer(true)
  }

  const closeInfo = () => {
    if (isMobile) {
      setMobileView(selectedId ? 'mensaje' : 'list')
      return
    }
    setShowInfoDrawer(false)
  }

  const onSend = async () => {
    const text = composer.trim()
    if (!text || !selectedId || sending) return

    try {
      setSending(true)
      const response = await sendMensajeToConversacion(selectedId, text)
      const mensaje = response?.mensaje || null
      if (mensaje) {
        setMessages((prev) => [...prev, mensaje])
        setItems((prev) => {
          const updated = prev.map((item) => (
            Number(item.id) === Number(selectedId)
              ? {
                ...item,
                last_message_body: mensaje.cuerpo,
                last_message_at: mensaje.created_at,
                last_message_sender_id: mensaje.remitente_usuario_id,
                last_message_sender_nombre: mensaje.remitente_nombre,
              }
              : item
          ))
          const idx = updated.findIndex((item) => Number(item.id) === Number(selectedId))
          if (idx <= 0) return updated
          const [head] = updated.splice(idx, 1)
          return [head, ...updated]
        })
      } else {
        await fetchMessagesAndDetail(selectedId)
      }
      setComposer('')
    } catch (err) {
      showToast({ type: 'error', message: getMensajesErrorMessage(err, 'No se pudo enviar el mensaje.') })
    } finally {
      setSending(false)
    }
  }

  const onCreateVacanteConversation = async (event) => {
    event.preventDefault()
    const vacanteId = Number(selectedVacante?.id || 0)
    const candidatoId = Number(selectedPostulante?.candidato_id || 0)

    if (!Number.isInteger(vacanteId) || vacanteId <= 0) {
      showToast({ type: 'warning', message: 'Selecciona una vacante activa.' })
      return
    }
    if (!Number.isInteger(candidatoId) || candidatoId <= 0) {
      showToast({ type: 'warning', message: 'Selecciona un postulante de la vacante.' })
      return
    }

    try {
      const response = await createMensajesVacanteConversation({
        vacante_id: vacanteId,
        candidato_id: candidatoId || undefined,
      })
      const conversationId = response?.conversacion?.id || null
      await fetchConversations()
      if (conversationId) {
        selectConversation(conversationId)
      }
      setVacanteSearch('')
      setSelectedVacante(null)
      setPostulanteSearch('')
      setSelectedPostulante(null)
      setPostulantesVacante([])
      closeComposerModal()
      showToast({ type: 'success', message: 'Conversacion creada.' })
    } catch (err) {
      showToast({ type: 'error', message: getMensajesErrorMessage(err, 'No se pudo abrir la conversacion.') })
    }
  }

  const onCreateDirectConversation = async (event) => {
    event.preventDefault()
    const targetId = Number(targetUserInput)
    if (!Number.isInteger(targetId) || targetId <= 0) {
      showToast({ type: 'warning', message: 'Ingresa un ID de usuario valido.' })
      return
    }
    try {
      const response = await createMensajesDirectConversation({ usuario_objetivo_id: targetId })
      const conversationId = response?.conversacion?.id || null
      await fetchConversations()
      if (conversationId) {
        selectConversation(conversationId)
      }
      setTargetUserInput('')
      closeComposerModal()
      showToast({ type: 'success', message: 'Conversacion directa creada.' })
    } catch (err) {
      showToast({ type: 'error', message: getMensajesErrorMessage(err, 'No se pudo crear la conversacion directa.') })
    }
  }

  return (
    <div className="company-scope company-compact min-h-screen bg-secondary">
      <Header />
      <main className="page-container pt-10 pb-10">
        <section className={`efmsg-shell ${isMobile ? `is-mobile is-${mobileView}` : isLarge ? 'is-large' : 'is-medium'}`}>
          <aside className="efmsg-pane efmsg-mensajes-pane">
            <div className="efmsg-mensajes-header">
              <h2>Mensajes</h2>
              <div className="efmsg-mensajes-actions">
                <button type="button" className="efmsg-icon-btn" onClick={() => setShowComposerModal(true)} aria-label="Nueva conversacion">
                  <SquarePen className="w-5 h-5" />
                </button>
              </div>
            </div>

            <label className="efmsg-search">
              <Search className="w-4 h-4" />
              <input
                value={query}
                onChange={(event) => setQuery(event.target.value)}
                placeholder="Buscar mensajes"
              />
            </label>

            <div className="efmsg-mensajes-list">
              {loading ? <p className="efmsg-empty">Cargando conversaciones...</p> : null}
              {!loading && error ? <p className="efmsg-error">{error}</p> : null}
              {!loading && !error && !filteredItems.length ? (
                <p className="efmsg-empty">No hay mensajes para mostrar.</p>
              ) : null}
              {!loading && !error && filteredItems.map((item) => {
                const active = Number(item.id) === Number(selectedId)
                return (
                  <button
                    key={item.id}
                    type="button"
                    className={`efmsg-mensaje-item ${active ? 'is-active' : ''}`}
                    onClick={() => selectConversation(item.id)}
                  >
                    <Avatar
                      label={buildConversationTitle(item, role)}
                      url={getConversationAvatarUrl(item, role)}
                    />
                    <div className="efmsg-mensaje-main">
                      <div className="efmsg-mensaje-row">
                        <p className="efmsg-mensaje-name">{buildConversationTitle(item, role)}</p>
                        <span className="efmsg-mensaje-time">{formatWhen(item.last_message_at || item.updated_at)}</span>
                      </div>
                      <p className="efmsg-mensaje-preview">{item.last_message_body || 'Sin mensajes'}</p>
                      {item.vacante_titulo ? (
                        <p className="efmsg-mensaje-context">Vacante: {item.vacante_titulo}</p>
                      ) : null}
                    </div>
                    {Number(item.unread_count || 0) > 0 ? (
                      <span className="efmsg-badge">{item.unread_count}</span>
                    ) : null}
                  </button>
                )
              })}
            </div>
          </aside>

          <section className="efmsg-pane efmsg-thread-pane">
            <div className="efmsg-thread-header">
              <div className="efmsg-thread-left">
                {isMobile ? (
                  <button type="button" className="efmsg-icon-btn" onClick={() => setMobileView('list')} aria-label="Volver a mensajes">
                    <ArrowLeft className="w-5 h-5" />
                  </button>
                ) : null}
                <Avatar
                  label={buildConversationTitle(selected, role)}
                  url={getConversationAvatarUrl(selected, role)}
                />
                <div>
                  <h3>{selected ? buildConversationTitle(selected, role) : 'Selecciona un mensaje'}</h3>
                  <p>{selected?.vacante_titulo ? `Vacante: ${selected.vacante_titulo}` : 'Conversacion directa'}</p>
                </div>
              </div>
              <div className="efmsg-thread-actions">
                {/* Llamada pendiente de integracion */}
                {/*<button type="button" className="efmsg-icon-btn" aria-label="Llamar">
                  <Phone className="w-4 h-4" />
                </button>*/}
                {/* Videollamada pendiente de integracion */}
                {/* <button type="button" className="efmsg-icon-btn" aria-label="Videollamada">
                  <Video className="w-4 h-4" />
                </button> */}
                <button type="button" className="efmsg-icon-btn" onClick={openInfo} aria-label="Informacion">
                  <Info className="w-4 h-4" />
                </button>
              </div>
            </div>

            <div className="efmsg-thread-body">
              {!selected ? (
                <div className="efmsg-empty-thread">
                  <MessageCircleMore className="w-10 h-10" />
                  <p>Selecciona un mensaje para iniciar la conversacion.</p>
                </div>
              ) : null}

              {selected && loadingMessages ? <p className="efmsg-empty">Cargando mensajes...</p> : null}

              {selected && !loadingMessages && !messages.length ? (
                <p className="efmsg-empty">Aun no hay mensajes. Escribe el primero.</p>
              ) : null}

              {selected && !loadingMessages && messages.map((message) => {
                const mine = currentUserId > 0 && Number(message.remitente_usuario_id) === currentUserId
                const messageId = Number(message?.id || 0)
                const readByCounterpart = mine && messageId > 0 && counterpartReadMaxId >= messageId
                const senderUserId = Number(message?.remitente_usuario_id || 0)
                const sender = participantByUserId.get(senderUserId) || null
                const senderAvatarUrl = sender?.avatar_url || getConversationAvatarUrl(selected, role)
                const senderLabel = message.remitente_nombre || buildConversationTitle(selected, role)
                return (
                  <article key={message.id} className={`efmsg-bubble-wrap ${mine ? 'is-mine' : ''}`}>
                    {!mine ? <Avatar label={senderLabel} url={senderAvatarUrl} className="tiny" /> : null}
                    <div className={`efmsg-bubble ${mine ? 'is-mine' : ''}`}>
                      <p>{message.cuerpo}</p>
                      <div className={`efmsg-bubble-meta ${mine ? 'is-mine' : ''}`}>
                        <small>{formatWhen(message.created_at)}</small>
                        {mine ? (
                          <span
                            className={`efmsg-read-status ${readByCounterpart ? 'is-read' : ''}`}
                            title={readByCounterpart ? 'Leido' : 'Enviado'}
                            aria-label={readByCounterpart ? 'Leido' : 'Enviado'}
                          >
                            {readByCounterpart ? '✓✓' : '✓'}
                          </span>
                        ) : null}
                      </div>
                    </div>
                  </article>
                )
              })}
            </div>

            <div className="efmsg-thread-composer">
              <input
                value={composer}
                onChange={(event) => setComposer(event.target.value)}
                placeholder={selected ? 'Escribe un mensaje...' : 'Selecciona un mensaje'}
                disabled={!selected || sending}
                onKeyDown={(event) => {
                  if (event.key === 'Enter' && !event.shiftKey) {
                    event.preventDefault()
                    onSend()
                  }
                }}
              />
              <button
                type="button"
                disabled={!selected || sending || !composer.trim()}
                onClick={onSend}
                aria-label="Enviar mensaje"
              >
                <SendHorizontal className="w-4 h-4" />
              </button>
            </div>
          </section>

          <ConversationInfoPanel
            selected={selected}
            detail={conversationDetail}
            role={role}
            onBack={closeInfo}
            isMobileInfo={isMobile}
          />
        </section>

        {!isLarge ? (
          <div className={`efmsg-info-drawer ${showInfoDrawer ? 'is-open' : ''}`}>
            <div className="efmsg-info-backdrop" onClick={() => setShowInfoDrawer(false)} />
            <div className="efmsg-info-sheet">
              <ConversationInfoPanel
                selected={selected}
                detail={conversationDetail}
                role={role}
                onBack={() => setShowInfoDrawer(false)}
                isMobileInfo={false}
              />
            </div>
          </div>
        ) : null}

        {showComposerModal ? (
          <div className="efmsg-modal">
            <div className="efmsg-modal-backdrop" onClick={closeComposerModal} />
            <div className="efmsg-modal-card">
              <div className="efmsg-modal-head">
                <h3>Nueva conversacion</h3>
                <button type="button" className="efmsg-icon-btn" onClick={closeComposerModal} aria-label="Cerrar">
                  <X className="w-4 h-4" />
                </button>
              </div>

              <form className="efmsg-modal-form" onSubmit={onCreateVacanteConversation}>
                <label className="efmsg-selector-group">
                  <span>Vacante activa</span>
                  <input
                    value={vacanteSearch}
                    onChange={(event) => {
                      setVacanteSearch(event.target.value)
                      setSelectedVacante(null)
                      setPostulanteSearch('')
                      setSelectedPostulante(null)
                      setPostulantesVacante([])
                      setVacanteListOpen(true)
                    }}
                    onFocus={() => setVacanteListOpen(true)}
                    onBlur={() => {
                      window.setTimeout(() => {
                        setVacanteListOpen(false)
                      }, 120)
                    }}
                    placeholder="Escribe para filtrar vacantes"
                  />
                  {vacanteListOpen ? (
                    <div className="efmsg-selector-popover">
                      {vacantesLoading ? (
                        <p className="efmsg-selector-empty">Cargando vacantes activas...</p>
                      ) : null}
                      {!vacantesLoading && !filteredVacantes.length ? (
                        <p className="efmsg-selector-empty">No hay vacantes activas para seleccionar.</p>
                      ) : null}
                      {!vacantesLoading && filteredVacantes.map((vacante) => (
                        <button
                          key={vacante.id}
                          type="button"
                          className={`efmsg-selector-item ${Number(selectedVacante?.id) === Number(vacante.id) ? 'is-active' : ''}`}
                          onMouseDown={() => {
                            setSelectedVacante(vacante)
                            setVacanteSearch(formatVacanteLabel(vacante))
                            setPostulanteSearch('')
                            setSelectedPostulante(null)
                            setPostulantesVacante([])
                            setVacanteListOpen(false)
                            setPostulanteListOpen(false)
                            fetchPostulantesByVacante(vacante.id)
                          }}
                        >
                          <span className="efmsg-selector-main">{formatVacanteLabel(vacante)}</span>
                          <small>#{vacante.id}</small>
                        </button>
                      ))}
                    </div>
                  ) : null}
                </label>
                <label className="efmsg-selector-group">
                  <span>Postulante</span>
                  <input
                    value={postulanteSearch}
                    onChange={(event) => {
                      setPostulanteSearch(event.target.value)
                      setSelectedPostulante(null)
                      setPostulanteListOpen(true)
                    }}
                    onFocus={() => selectedVacante && setPostulanteListOpen(true)}
                    onBlur={() => {
                      window.setTimeout(() => {
                        setPostulanteListOpen(false)
                      }, 120)
                    }}
                    placeholder={selectedVacante ? 'Escribe para filtrar postulantes' : 'Selecciona primero una vacante'}
                    disabled={!selectedVacante}
                  />
                  {selectedVacante && postulanteListOpen ? (
                    <div className="efmsg-selector-popover">
                      {postulantesLoading ? (
                        <p className="efmsg-selector-empty">Cargando postulantes...</p>
                      ) : null}
                      {!postulantesLoading && !filteredPostulantes.length ? (
                        <p className="efmsg-selector-empty">No hay postulantes disponibles para esta vacante.</p>
                      ) : null}
                      {!postulantesLoading && filteredPostulantes.map((postulante) => (
                        <button
                          key={`${postulante.candidato_id}-${postulante.id}`}
                          type="button"
                          className={`efmsg-selector-item ${Number(selectedPostulante?.candidato_id) === Number(postulante.candidato_id) ? 'is-active' : ''}`}
                          onMouseDown={() => {
                            setSelectedPostulante(postulante)
                            setPostulanteSearch(formatPostulanteLabel(postulante))
                            setPostulanteListOpen(false)
                          }}
                        >
                          <span className="efmsg-selector-main">{formatPostulanteLabel(postulante)}</span>
                          <small>Candidato #{postulante.candidato_id}</small>
                        </button>
                      ))}
                    </div>
                  ) : null}
                </label>
                {!selectedVacante ? (
                  <p className="efmsg-selector-help">Selecciona una vacante para ver sus postulantes.</p>
                ) : null}
                <button type="submit">Crear por vacante</button>
              </form>

              {role === 'administrador' || role === 'superadmin' ? (
                <form className="efmsg-modal-form" onSubmit={onCreateDirectConversation}>
                  <label>
                    ID usuario objetivo
                    <input
                      value={targetUserInput}
                      onChange={(event) => setTargetUserInput(event.target.value)}
                      placeholder="Ej. 7"
                    />
                  </label>
                  <button type="submit">Crear conversacion directa</button>
                </form>
              ) : null}
            </div>
          </div>
        ) : null}
      </main>
    </div>
  )
}
