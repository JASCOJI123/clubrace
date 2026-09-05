import { useMemo, useState } from 'react'
import { Button, Field, Input, Screen, Select, Text, tokens } from '@driverhub/ui'
import { meApi, carApi } from '../../lib/api'
import { useAuth } from '../../stores/auth'

/**
 * Onboarding (spec §5). Six steps, saved atomically on the last one:
 * name → phone → driver type → vehicle → income target → goal.
 * The API persists everything in one POST /me/onboarding call.
 */

const STEPS = 6

type DriverType = 'TAXI' | 'PRIVATE_DRIVER' | 'DELIVERY' | 'CARGO' | 'OTHER'
type PrimaryGoal = 'INCREASE_INCOME' | 'REDUCE_EXPENSES' | 'MAINTAIN_CAR' | 'SAVE_MONEY' | 'UNDERSTAND_PROFITABILITY'

interface OnboardingState {
  name: string
  phone: string
  driverType: DriverType | ''
  carBrand: string
  carModel: string
  fuelType: string
  incomeTarget: string
  primaryGoal: PrimaryGoal | ''
}

const GOALS: Array<{ value: PrimaryGoal; label: string }> = [
  { value: 'INCREASE_INCOME', label: '💰 Daromadni oshirish' },
  { value: 'REDUCE_EXPENSES', label: '📉 Xarajatlarni kamaytirish' },
  { value: 'MAINTAIN_CAR', label: '🔧 Mashinaga g‘amxo‘rlik' },
  { value: 'SAVE_MONEY', label: '🏦 Pul yig‘ish' },
  { value: 'UNDERSTAND_PROFITABILITY', label: '📊 Daromadlilikni tushunish' },
]

export function Onboarding() {
  const setUser = useAuth((s) => s.setUser)
  const [step, setStep] = useState(1)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [f, setF] = useState<OnboardingState>({
    name: '',
    phone: '',
    driverType: '',
    carBrand: '',
    carModel: '',
    fuelType: 'PETROL',
    incomeTarget: '',
    primaryGoal: '',
  })

  const set = <K extends keyof OnboardingState>(key: K, value: OnboardingState[K]) => setF((prev) => ({ ...prev, [key]: value }))

  const canNext = useMemo(() => {
    switch (step) {
      case 1:
        return f.name.trim().length >= 2
      case 2:
        return true
      case 3:
        return f.driverType !== ''
      case 4:
        return f.carBrand.trim().length >= 1 && f.carModel.trim().length >= 1
      case 5:
        return true
      case 6:
        return f.primaryGoal !== ''
      default:
        return false
    }
  }, [step, f])

  const submit = async () => {
    setSaving(true)
    setError(null)
    try {
      const incomeTarget = f.incomeTarget.replace(/[\s.,]/g, '')
      const res = await meApi.onboarding({
        name: f.name.trim(),
        phone: f.phone.trim() || undefined,
        driverType: f.driverType as DriverType,
        incomeTarget: incomeTarget ? Number(incomeTarget) : undefined,
        primaryGoal: f.primaryGoal as PrimaryGoal,
      })
      // also register the primary car so it appears on the dashboard (best effort)
      if (f.carBrand.trim() && f.carModel.trim()) {
        try {
          await carApi.create({
            brand: f.carBrand.trim(),
            model: f.carModel.trim(),
            fuelType: f.fuelType,
            mileageKms: 0,
            isPrimary: true,
          })
        } catch {
          /* car save is non-blocking */
        }
      }
      setUser({ ...res.user, onboardingDone: true })
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Saqlashda xatolik. Qayta urinib ko‘ring.')
      setSaving(false)
    }
  }

  return (
    <Screen>
      <ProgressDots step={step} />
      <div style={{ marginTop: 20 }}>
        {step === 1 && (
          <>
            <Title emoji="👋" title="Qanday murojaat qilamiz?" />
            <Field label="Ismingiz">
              <Input autoFocus value={f.name} onChange={(e) => set('name', e.target.value)} placeholder="Masalan: Aziz" maxLength={80} />
            </Field>
          </>
        )}
        {step === 2 && (
          <>
            <Title emoji="📞" title="Telefon raqamingiz" />
            <Field label="Telefon (ixtiyoriy)" hint="Chiptalar va mulohaza uchun ishlatamiz">
              <Input type="tel" value={f.phone} onChange={(e) => set('phone', e.target.value)} placeholder="+998 90 123 45 67" />
            </Field>
            <Text variant="body" tone="secondary" style={{ display: 'block', marginTop: 12 }}>
              Telefon qilish yoki cheklash uchun emas — faqat kerak bo‘lsa murojaat qilamiz.
            </Text>
          </>
        )}
        {step === 3 && (
          <>
            <Title emoji="🚖" title="Qaysi yo‘nalishda ishlaysiz?" />
            <div style={{ display: 'grid', gap: 8 }}>
              {(Object.keys(DRIVER_OPTIONS) as DriverType[]).map((dt) => {
                const active = f.driverType === dt
                return (
                  <button
                    key={dt}
                    onClick={() => set('driverType', dt)}
                    style={{
                      textAlign: 'left',
                      padding: 14,
                      borderRadius: tokens.radius.md,
                      background: active ? 'var(--dh-accent2-bg)' : 'var(--dh-surface-2)',
                      border: active ? '1px solid var(--dh-accent-2)' : '1px solid var(--dh-border)',
                      color: 'var(--dh-text)',
                      fontSize: 15,
                      cursor: 'pointer',
                    }}
                  >
                    <span style={{ fontWeight: 600 }}>{DRIVER_OPTIONS[dt].label}</span>
                    <span style={{ display: 'block', fontSize: 13, color: 'var(--dh-text-secondary)' }}>{DRIVER_OPTIONS[dt].hint}</span>
                  </button>
                )
              })}
            </div>
          </>
        )}
        {step === 4 && (
          <>
            <Title emoji="🚗" title="Asosiy mashinangiz" />
            <div style={{ display: 'grid', gap: 12 }}>
              <Field label="Brend">
                <Input value={f.carBrand} onChange={(e) => set('carBrand', e.target.value)} placeholder="Masalan: Chevrolet" />
              </Field>
              <Field label="Model">
                <Input value={f.carModel} onChange={(e) => set('carModel', e.target.value)} placeholder="Masalan: Cobalt" />
              </Field>
              <Field label="Yoqilg‘i turi">
                <Select value={f.fuelType} onChange={(e) => set('fuelType', e.target.value)}>
                  <option value="PETROL">Benzin</option>
                  <option value="DIESEL">Dizel</option>
                  <option value="GAS">Metan / gaz</option>
                  <option value="ELECTRIC">Elektr</option>
                  <option value="HYBRID">Gibrid</option>
                  <option value="OTHER">Boshqa</option>
                </Select>
              </Field>
            </div>
          </>
        )}
        {step === 5 && (
          <>
            <Title emoji="🎯" title="Oylik daromad maqsadi" hint="Ixtiyoriy — AI Coach rejani shunga moslaydi" />
            <Field label="Oylik maqsad (so‘m)">
              <Input
                type="text"
                inputMode="numeric"
                value={f.incomeTarget}
                onChange={(e) => set('incomeTarget', e.target.value)}
                placeholder="Masalan: 20000000"
              />
            </Field>
          </>
        )}
        {step === 6 && (
          <>
            <Title emoji="🧭" title="Eng muhim maqsadingiz" />
            <div style={{ display: 'grid', gap: 8 }}>
              {GOALS.map((g) => {
                const active = f.primaryGoal === g.value
                return (
                  <button
                    key={g.value}
                    onClick={() => set('primaryGoal', g.value)}
                    style={{
                      textAlign: 'left',
                      padding: 14,
                      borderRadius: tokens.radius.md,
                      background: active ? 'var(--dh-accent2-bg)' : 'var(--dh-surface-2)',
                      border: active ? '1px solid var(--dh-accent-2)' : '1px solid var(--dh-border)',
                      color: 'var(--dh-text)',
                      fontSize: 15,
                      cursor: 'pointer',
                    }}
                  >
                    {g.label}
                  </button>
                )
              })}
            </div>
          </>
        )}
      </div>

      {error && (
        <Text variant="caption" tone="danger" style={{ display: 'block', marginTop: 12 }}>
          {error}
        </Text>
      )}

      <div style={{ display: 'flex', gap: 10, marginTop: 24 }}>
        {step > 1 && (
          <Button variant="outline" onClick={() => setStep((s) => s - 1)}>
            ←
          </Button>
        )}
        {step < STEPS ? (
          <Button block disabled={!canNext} onClick={() => setStep((s) => s + 1)}>
            Davom etish
          </Button>
        ) : (
          <Button block loading={saving} disabled={!canNext} onClick={() => void submit()}>
            Yakunlash
          </Button>
        )}
      </div>
    </Screen>
  )
}

const DRIVER_OPTIONS: Record<DriverType, { label: string; hint: string }> = {
  TAXI: { label: '🚖 Taxi', hint: 'Yandex Go, inDrive… (kundalik daromad)' },
  PRIVATE_DRIVER: { label: '👔 Shaxsiy haydovchi', hint: 'Oilaviy / korporativ mijoz' },
  DELIVERY: { label: '📦 Dostavka', hint: 'Food, chakana, kur’er' },
  CARGO: { label: '🚚 Yuk tashish', hint: 'Kichik va o‘rta yuklar' },
  OTHER: { label: '🧩 Boshqa', hint: 'Boshqa turdagi faoliyat' },
}

function Title({ emoji, title, hint }: { emoji: string; title: string; hint?: string }) {
  return (
    <div style={{ marginBottom: 18 }}>
      <div style={{ fontSize: 42 }}>{emoji}</div>
      <Text variant="hero" tone="text" style={{ display: 'block', marginTop: 6 }}>
        {title}
      </Text>
      {hint && (
        <Text variant="body" tone="secondary" style={{ display: 'block', marginTop: 6 }}>
          {hint}
        </Text>
      )}
    </div>
  )
}

function ProgressDots({ step }: { step: number }) {
  return (
    <div style={{ display: 'flex', gap: 6, justifyContent: 'center' }}>
      {Array.from({ length: STEPS }).map((_, i) => (
        <span
          key={i}
          style={{
            width: 8,
            height: 8,
            borderRadius: '50%',
            background: i < step ? 'var(--dh-accent)' : 'var(--dh-surface-3)',
            transition: 'background .2s ease',
          }}
        />
      ))}
    </div>
  )
}