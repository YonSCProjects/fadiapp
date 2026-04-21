// Thin wrapper over app.json that injects secrets from env at build/bundle time.
// Expo loads .env and .env.local automatically, so local dev just works.
// For CI / EAS builds, the env vars are set on the build machine.

module.exports = ({ config }) => {
  const workerBaseUrl = process.env.WORKER_BASE_URL;
  const workerSharedSecret = process.env.WORKER_SHARED_SECRET;

  if (!workerBaseUrl || !workerSharedSecret) {
    // Soft warning, not a throw — this lets `expo install`-type commands run
    // without a worker configured. Runtime calls will surface a clear error.
    console.warn(
      '[app.config] WORKER_BASE_URL and/or WORKER_SHARED_SECRET missing from env. ' +
        'Copy .env.example to .env.local and fill the values.',
    );
  }

  return {
    ...config,
    extra: {
      ...config.extra,
      workerBaseUrl: workerBaseUrl ?? 'https://fadiapp-worker.example.workers.dev',
      workerSharedSecret: workerSharedSecret ?? 'REPLACE_VIA_ENV',
    },
  };
};
