import { loadEnv } from '@driverhub/config'

// Load once at import time; app factory uses getEnv() for the rest.
loadEnv()

export { getEnv, getFlags, corsOrigins } from '@driverhub/config'