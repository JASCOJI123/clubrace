import { prisma, type AuditAction, type UserRole, type Prisma } from '@driverhub/database'

/** Write an audit log row (spec §67). Never throws on failure — audit must not break requests. */
export async function writeAudit(opts: {
  actorId?: string
  actorRole?: UserRole
  action: AuditAction
  targetType?: string
  targetId?: string
  metadata?: Record<string, unknown>
  ip?: string
}) {
  try {
    await prisma.auditLog.create({
      data: {
        actorId: opts.actorId,
        actorRole: opts.actorRole,
        action: opts.action,
        targetType: opts.targetType,
        targetId: opts.targetId,
        metadata: (opts.metadata ?? undefined) as Prisma.InputJsonValue | undefined,
        ip: opts.ip,
      },
    })
  } catch {
    // no-op — audit is best-effort
  }
}

/** Write an AdminAction row (spec §31: admin actions must be logged). */
export async function writeAdminAction(opts: {
  actorId: string
  action: AuditAction
  targetType?: string
  targetId?: string
  metadata?: Record<string, unknown>
  ip?: string
}) {
  try {
    await prisma.adminAction.create({
      data: {
        actorId: opts.actorId,
        action: opts.action,
        targetType: opts.targetType,
        targetId: opts.targetId,
        metadata: (opts.metadata ?? undefined) as Prisma.InputJsonValue | undefined,
        ip: opts.ip,
      },
    })
  } catch {
    // no-op
  }
  await writeAudit({ ...opts, actorId: opts.actorId, actorRole: 'ADMIN' })
}