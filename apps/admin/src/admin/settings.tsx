import { useState } from 'react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { Badge, Button, Card, Field, Input, Text } from '@driverhub/ui'
import { adminApi } from '../api'
import { PageHeader, Panel, SectionTitle } from '../components'

/** Product settings (spec §60, §29): PRO price, marketplace commission, demo mode. Audit-logged. */
export function SettingsPage() {
  const queryClient = useQueryClient()
  const data = useQuery({ queryKey: ['admin-settings'], queryFn: adminApi.settings })

  const [proPrice, setProPrice] = useState<string>('')
  const [commission, setCommission] = useState<string>('')
  const [demoMode, setDemoMode] = useState<boolean | null>(null)
  // From the server:
  const loadedPrice = data.data?.proPriceMonth

  const save = useMutation({
    mutationFn: () =>
      adminApi.patchSettings({
        ...(proPrice !== '' && Number(proPrice) !== loadedPrice ? { proPriceMonth: Number(proPrice) } : {}),
        ...(commission !== '' && Number(commission) !== data.data?.marketplaceCommissionPercent
          ? { marketplaceCommissionPercent: Number(commission) }
          : {}),
        ...(demoMode !== null && demoMode !== data.data?.demoMode ? { demoMode } : {}),
      }),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ['admin-settings'] })
      setDemoMode(null)
    },
  })

  return (
    <div>
      <PageHeader title="Sozlamalar" subtitle="Mahsulot narxi va demo rejim — har bir o‘zgarish audit logda" />

      {data.isLoading && (
        <Card>
          <Text variant="body" tone="secondary">Yuklanmoqda…</Text>
        </Card>
      )}
      {data.isError && (
        <Card>
          <Text variant="body" tone="danger">{(data.error as Error).message}</Text>
        </Card>
      )}

      {data.data && (
        <>
          <Panel style={{ maxWidth: 520 }}>
            <SectionTitle>PRO narxi</SectionTitle>
            <Text variant="caption" tone="muted" style={{ display: 'block', marginBottom: 10 }}>
              Joriy: <b style={{ color: 'var(--dh-text)' }}>{data.data.proPriceMonth.toLocaleString('ru-RU')} so‘m/oy</b> — narx client-da hardcode qilinmaydi
            </Text>
            <Field label="Yangi oylik narx (so‘m)">
              <Input
                type="number"
                min={0}
                step={1000}
                value={proPrice}
                onChange={(e) => setProPrice(e.target.value)}
                placeholder={String(data.data.proPriceMonth)}
              />
            </Field>
          </Panel>

          <Panel style={{ maxWidth: 520 }}>
            <SectionTitle>Marketplace komissiyasi</SectionTitle>
            <Text variant="caption" tone="muted" style={{ display: 'block', marginBottom: 10 }}>
              Joriy: <b style={{ color: 'var(--dh-text)' }}>{data.data.marketplaceCommissionPercent}%</b>
            </Text>
            <Field label="Yangi % (0–50)">
              <Input
                type="number"
                min={0}
                max={50}
                step={0.5}
                value={commission}
                onChange={(e) => setCommission(e.target.value)}
                placeholder={String(data.data.marketplaceCommissionPercent)}
              />
            </Field>
          </Panel>

          <Panel style={{ maxWidth: 520 }}>
            <SectionTitle>Demo rejim</SectionTitle>
            <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 12 }}>
              <Badge tone={data.data.demoMode ? 'warning' : 'neutral'}>
                {data.data.demoMode ? 'DEMO yoqilgan' : 'DEMO o‘chiq'}
              </Badge>
              <Text variant="caption" tone="muted">
                dev-login va demo ma’lumotlar faqat ushbu rejimda
              </Text>
            </div>
            <div style={{ display: 'flex', gap: 8 }}>
              <Button size="sm" variant="outline" onClick={() => setDemoMode(true)}>
                Yoqish
              </Button>
              <Button size="sm" variant="ghost" onClick={() => setDemoMode(false)}>
                O‘chirish
              </Button>
            </div>
          </Panel>

          <div style={{ marginTop: 20 }}>
            <Button loading={save.isPending} onClick={() => void save.mutateAsync()}>
              Saqlash
            </Button>
            {save.data && (
              <Badge tone="success" style={{ marginLeft: 10 }}>
                ✓ Saqlandi
              </Badge>
            )}
            {save.isError && (
              <Text variant="caption" tone="danger" style={{ display: 'block', marginTop: 8 }}>
                {(save.error as Error).message}
              </Text>
            )}
          </div>
        </>
      )}
    </div>
  )
}