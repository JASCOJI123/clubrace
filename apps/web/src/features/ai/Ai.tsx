import { useEffect, useRef, useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import { Badge, Button, Card, Input, Row, Screen, ScreenHeader, Text, tokens } from '@driverhub/ui'
import { aiApi } from '../../lib/api'
import { compactUzs } from '../../lib/format'
import { haptic } from '../../lib/telegram'

/**
 * AI Coach (spec §11, §12). Deterministic engine answers from the driver's own
 * records; answers carry FACT / ESTIMATE / RECOMMENDATION tags. The LLM is
 * only used when AI_API_KEY is configured (rule: never fake AI, spec §69 R5).
 */
export function Ai() {
  const stats = useQuery({ queryKey: ['ai-stats'], queryFn: aiApi.stats })

  return (
    <Screen>
      <ScreenHeader title="AI Coach" />
      <CoachCard />
      <ChatCard statsAvailable={Boolean(stats.data)} />
    </Screen>
  )
}

function CoachCard() {
  const { data, isLoading } = useQuery({ queryKey: ['ai-stats'], queryFn: aiApi.stats })
  const coach = useQuery({ queryKey: ['ai-coach'], queryFn: () => aiApi.coach() })

  if (isLoading) {
    return (
      <Card>
        <Text variant="body" tone="secondary">
          Reja tuzilmoqda…
        </Text>
      </Card>
    )
  }
  const ai = data
  if (!ai) return null

  const rows = [
    ['30 kundagi daromad', ai.income30d],
    ['30 kundagi xarajat', ai.expenses30d],
    ['Sof foyda', ai.netProfit30d],
    ['Soatdagi foyda', ai.avgHourlyNet],
    ['Kuzatilgan kunlar', ai.daysTracked30],
    ['Yoqilg‘i ulushi (xarajatda)', ai.fuelShareOfExpenses30d],
  ] as const

  return (
    <Card glow="accent2">
      <Row between>
        <Badge tone="accent">📋 Kunlik reja</Badge>
        {coach.data?.isEstimate ? <Badge tone="warning">Taxminiy</Badge> : <Badge tone="info">Fakt</Badge>}
      </Row>
      {coach.data?.formatted && (
        <pre
          style={{
            whiteSpace: 'pre-wrap',
            fontFamily: 'inherit',
            fontSize: 13.5,
            lineHeight: 1.6,
            color: 'var(--dh-text)',
            margin: '10px 0 0',
          }}
        >
          {coach.data.formatted}
        </pre>
      )}
      <div style={{ marginTop: 10 }}>
        {rows.map(([label, value]) => (
          <Row key={label} between style={{ padding: '4px 0' }}>
            <Text variant="caption" tone="secondary">
              {label}
            </Text>
            <Text variant="caption" tone="text" style={{ fontWeight: 600 }}>
              {value == null ? '—' : compactUzs(value)}
            </Text>
          </Row>
        ))}
      </div>
    </Card>
  )
}

interface ChatMessage {
  role: 'user' | 'ai'
  text: string
  facts?: { FACT: string[]; ESTIMATE: string[]; RECOMMENDATION: string[] }
  usedProvider?: string
}

const SUGGESTIONS = [
  'Bugun qancha ishladim?',
  'Qaysi xarajat ko‘paygan?',
  'Xarajatlarni qanday kamaytirish mumkin?',
  'Servis kerakmi?',
  'Maqsadga qachon yetaman?',
]

function ChatCard({ statsAvailable }: { statsAvailable: boolean }) {
  const [messages, setMessages] = useState<ChatMessage[]>([])
  const [input, setInput] = useState('')
  const [busy, setBusy] = useState(false)
  const scrollRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight, behavior: 'smooth' })
  }, [messages])

  const send = async (text: string) => {
    const message = text.trim()
    if (!message || busy) return
    setInput('')
    setMessages((m) => [...m, { role: 'user', text: message }])
    setBusy(true)
    try {
      const res = await aiApi.chat(message)
      setMessages((m) => [
        ...m,
        {
          role: 'ai',
          text: res.answer,
          facts: res.facts,
          usedProvider: res.usedProvider,
        },
      ])
      haptic('success')
    } catch (err) {
      setMessages((m) => [...m, { role: 'ai', text: err instanceof Error ? err.message : 'Xatolik yuz berdi' }])
      haptic('error')
    } finally {
      setBusy(false)
    }
  }

  return (
    <Card style={{ marginTop: 12 }}>
      <Text variant="label" tone="muted" style={{ display: 'block', marginBottom: 8 }}>
        Savol bering
      </Text>
      {messages.length === 0 && !statsAvailable && (
        <Text variant="caption" tone="muted" style={{ display: 'block', marginBottom: 8 }}>
          Ma’lumotlar yuklanmoqda…
        </Text>
      )}
      {messages.length === 0 && (
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6, marginBottom: 8 }}>
          {SUGGESTIONS.map((s) => (
            <button
              key={s}
              onClick={() => void send(s)}
              style={{
                background: 'var(--dh-surface-2)',
                border: '1px solid var(--dh-border)',
                color: 'var(--dh-text-secondary)',
                borderRadius: tokens.radius.full,
                padding: '6px 12px',
                fontSize: 12.5,
                cursor: 'pointer',
              }}
            >
              {s}
            </button>
          ))}
        </div>
      )}
      <div ref={scrollRef} style={{ maxHeight: 340, overflowY: 'auto', display: 'grid', gap: 8, paddingRight: 4 }}>
        {messages.map((m, i) =>
          m.role === 'user' ? (
            <div key={i} style={{ textAlign: 'right' }}>
              <span
                style={{
                  display: 'inline-block',
                  background: 'var(--dh-accent2-bg)',
                  border: '1px solid rgba(124,108,255,0.3)',
                  borderRadius: '14px 14px 2px 14px',
                  padding: '9px 12px',
                  fontSize: 14,
                  color: 'var(--dh-text)',
                  maxWidth: '85%',
                }}
              >
                {m.text}
              </span>
            </div>
          ) : (
            <div key={i}>
              <div
                style={{
                  background: 'var(--dh-surface-2)',
                  border: '1px solid var(--dh-border)',
                  borderRadius: '14px 14px 14px 2px',
                  padding: '11px 13px',
                  fontSize: 14,
                  color: 'var(--dh-text)',
                  lineHeight: 1.55,
                  whiteSpace: 'pre-wrap',
                }}
              >
                {m.text}
              </div>
              {m.facts && <FactTags facts={m.facts} />}
              {m.usedProvider && (
                <Text variant="caption" tone="muted" style={{ display: 'block', marginTop: 4 }}>
                  {m.usedProvider === 'deterministic' ? 'Deterministik javob' : 'AI model'}
                </Text>
              )}
            </div>
          )
        )}
        {busy && (
          <Text variant="caption" tone="secondary">
            O‘ylayapman…
          </Text>
        )}
      </div>

      <form
        onSubmit={(e) => {
          e.preventDefault()
          void send(input)
        }}
        style={{ display: 'flex', gap: 8, marginTop: 12 }}
      >
        <div style={{ flex: 1 }}>
          <Input value={input} onChange={(e) => setInput(e.target.value)} placeholder="Savolingizni yozing…" />
        </div>
        <Button type="submit" loading={busy} disabled={!input.trim()}>
          ➤
        </Button>
      </form>
    </Card>
  )
}

function FactTags({ facts }: { facts: ChatMessage['facts'] }) {
  if (!facts) return null
  const all: Array<[string, string[]]> = [
    ['FACT', facts.FACT],
    ['ESTIMATE', facts.ESTIMATE],
    ['RECOMMENDATION', facts.RECOMMENDATION],
  ]
  const present = all.filter(([, items]) => items.length > 0)
  return (
    <div style={{ marginTop: 6, display: 'grid', gap: 4 }}>
      {present.map(([kind, items]) => (
        <div key={kind}>
          <div style={{ display: 'flex', gap: 6, alignItems: 'center' }}>
            {items.map((t, i) => (
              <span key={i} style={{ fontSize: 12, color: 'var(--dh-text-secondary)', lineHeight: 1.5 }}>
                <b style={{ color: kind === 'FACT' ? 'var(--dh-accent)' : kind === 'ESTIMATE' ? 'var(--dh-warning)' : 'var(--dh-accent-2)' }}>
                  {kind}
                </b>
                {' '}· {t}
              </span>
            ))}
          </div>
        </div>
      ))}
    </div>
  )
}