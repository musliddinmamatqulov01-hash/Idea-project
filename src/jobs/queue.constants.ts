export const QUEUE_NAMES = {
  EMAIL: 'email',
  NOTIFICATIONS: 'notifications',
  AI: 'ai',
  SAVED_SEARCH_ALERTS: 'saved-search-alerts',
  DOCUMENT_PROCESSING: 'document-processing',
  ANALYTICS: 'analytics',
} as const;

export type QueueName = (typeof QUEUE_NAMES)[keyof typeof QUEUE_NAMES];

export const DEFAULT_JOB_OPTIONS = {
  attempts: 5,
  backoff: { type: 'exponential', delay: 2000 },
  removeOnComplete: 500,
  removeOnFail: 1000,
} as const;
