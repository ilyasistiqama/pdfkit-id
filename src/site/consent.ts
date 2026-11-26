import { adsConfigured } from './ads'
import { analyticsReady } from './analytics'

export const consentNeeded = () => adsConfigured() || analyticsReady()
