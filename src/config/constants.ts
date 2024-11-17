export const CONFIG = {
  SERVICE_URL: 'https://roam.1866.tech',
  PARSE_URL_API: '/api/parse-url',
  RETRY_ATTEMPTS: 3,
  RETRY_DELAY: 1000,
  OBSERVER_TIMEOUT: 30000,
  MAX_CHECK_ATTEMPTS: 20,
  CHECK_INTERVAL: 150,
  QUEUE_RETRY_DELAY: 200,
  REQUEST_TIMEOUT: 10000,
  CURSOR_UPDATE_DELAY: 100,
  EXCLUDED_URLS: [
    'https://firebasestorage.googleapis.com/v0/b/firescript-577a2.appspot.com',
    'https://roamresearch.com'
  ]
} as const; 