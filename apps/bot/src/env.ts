import { loadEnv } from '@driverhub/config'

// Load once at import time; everything else uses getEnv().
loadEnv()

export { getEnv, getFlags } from '@driverhub/config'