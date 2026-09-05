import { loadEnv } from '@driverhub/config'

/** Worker environment — same central Zod env as every other app. */
export function getEnv() {
  return loadEnv()
}