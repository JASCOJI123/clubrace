import { Queue as BullQueue, Worker as BullWorker } from 'bullmq'
import { Redis } from 'ioredis'
import type { Env } from '@driverhub/config'

/**
 * Job queue abstraction (spec §33, M7).
 *
 * - REDIS_URL set  → real BullMQ Queue + Worker over Redis (production).
 * - REDIS_URL unset→ honest in-memory fallback that runs handlers in-process.
 *   Jobs still flow through the same `add`/handler API, cron schedules still
 *   fire — just no cross-process durability. This keeps local dev (no Redis)
 *   fully functional while production uses BullMQ.
 */

export type JobHandlers = Record<string, (data: unknown) => Promise<void>>

export interface JobQueue {
  /** Enqueue a job. `delayMs` applies only to the BullMQ path. */
  add: (name: string, data: unknown, opts?: { delayMs?: number }) => Promise<string>
  close: () => Promise<void>
  readonly usingRedis: boolean
}

export function createJobQueue(env: Env, handlers: JobHandlers): JobQueue {
  if (env.REDIS_URL) {
    return createBullQueue(env.REDIS_URL, handlers)
  }
  return createMemoryQueue(handlers)
}

function createBullQueue(redisUrl: string, handlers: JobHandlers): JobQueue {
  const connection = new Redis(redisUrl, { maxRetriesPerRequest: null })
  const queue = new BullQueue('driverhub', { connection })
  const worker = new BullWorker(
    'driverhub',
    async (job) => {
      const h = handlers[job.name]
      if (!h) {
        console.warn(`[worker] unknown job type "${job.name}" — skipped`)
        return
      }
      await h(job.data)
    },
    { connection }
  )
  worker.on('failed', (job, err) => {
    console.error(`[worker] job "${job?.name}" failed:`, err?.message ?? err)
  })

  return {
    usingRedis: true,
    add: async (name, data, opts) => {
      const job = await queue.add(name, data ?? {}, { delay: opts?.delayMs ?? 0 })
      return job.id ?? ''
    },
    close: async () => {
      await worker.close()
      await queue.close()
      connection.disconnect()
    },
  }
}

function createMemoryQueue(handlers: JobHandlers): JobQueue {
  const pending = new Set<string>()
  return {
    usingRedis: false,
    add: async (name, data) => {
      const id = `${name}-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`
      pending.add(id)
      // fire-and-forget, but keep the set until done so close() can drain
      void (async () => {
        try {
          const h = handlers[name]
          if (!h) {
            console.warn(`[worker] unknown job type "${name}" — skipped`)
            return
          }
          await h(data)
        } catch (err) {
          console.error(`[worker] job "${name}" failed:`, (err as Error)?.message ?? err)
        } finally {
          pending.delete(id)
        }
      })()
      return id
    },
    close: async () => {
      // wait for in-flight memory jobs to settle
      const deadline = Date.now() + 5_000
      while (pending.size > 0 && Date.now() < deadline) {
        await new Promise((r) => setTimeout(r, 50))
      }
      pending.clear()
    },
  }
}