import { useEffect, useState } from 'react'
import { useQueryClient } from '@tanstack/react-query'
import { Badge, Button, Card, Row, Text } from '@driverhub/ui'
import { workApi } from '../lib/api'

/**
 * "Ishni boshla / tugat" banner (spec §8 work sessions). Renders on Home and
 * Money when a session is active (or offers to start one). Elapsed time ticks
 * locally each minute. All amounts come from the API — the banner never
 * fabricates income; income during a session must be logged in the Money tab.
 */
export function WorkSessionBanner({ sessionId }: { sessionId: string | null }) {
  const queryClient = useQueryClient()
  const [now, setNow] = useState(() => new Date())

  useEffect(() => {
    const t = setInterval(() => setNow(new Date()), 60_000)
    return () => clearInterval(t)
  }, [])

  const refresh = () => {
    void queryClient.invalidateQueries({ queryKey: ['dashboard'] })
    void queryClient.invalidateQueries({ queryKey: ['ws-current'] })
  }

  const finish = async () => {
    await workApi.finish(sessionId!)
    refresh()
  }

  if (sessionId) {
    return (
      <Card style={{ borderColor: 'rgba(43,217,163,0.4)', background: 'var(--dh-surface-2)' }}>
        <Row between>
          <div>
            <Badge tone="success">● Ish davom etmoqda</Badge>
            <Text variant="body" tone="text" style={{ display: 'block', marginTop: 6 }}>
              Boshlangan: {now.toLocaleTimeString('uz-UZ', { hour: '2-digit', minute: '2-digit' })}
            </Text>
          </div>
          <Button variant="danger" size="sm" onClick={() => void finish()}>
            Tugatish
          </Button>
        </Row>
        <Text variant="caption" tone="muted" style={{ display: 'block', marginTop: 6 }}>
          Daromad va xarajatni «Pul» bo‘limida shu smenaga bog‘lab kiriting.
        </Text>
      </Card>
    )
  }

  return null
}