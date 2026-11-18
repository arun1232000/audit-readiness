/** Build the app's dependencies from env. Shared by the long-running server and serverless adapters. */
import path from 'node:path';
import { loadConfig, type Config } from './config';
import { createLogger } from './lib/logger';
import { HubSpotClient, MockHubSpot, type HubSpotSync } from './services/hubspot';
import { FileQueue } from './services/queue';

export function bootstrap(env: NodeJS.ProcessEnv = process.env) {
  const config: Config = loadConfig(env);
  const log = createLogger(config.LOG_LEVEL, config.NODE_ENV === 'development');
  const hubspot: HubSpotSync = config.HUBSPOT_MOCK
    ? new MockHubSpot({ fail: config.HUBSPOT_MOCK_FAIL })
    : new HubSpotClient({
        token: config.HUBSPOT_ACCESS_TOKEN!,
        baseUrl: config.HUBSPOT_BASE_URL,
        timeoutMs: config.HUBSPOT_TIMEOUT_MS,
        maxRetries: config.HUBSPOT_MAX_RETRIES,
        lifecycleStage: config.HUBSPOT_LIFECYCLE_STAGE,
        leadStatus: config.HUBSPOT_LEAD_STATUS,
      });
  const queue = new FileQueue(path.resolve(config.QUEUE_DIR));
  return { config, log, hubspot, queue };
}
