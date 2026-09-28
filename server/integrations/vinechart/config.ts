import type { VineChartAuthMode, VineChartClientConfig } from "./types";

function env(name: string): string | undefined {
  const value = process.env[name]?.trim();
  return value ? value : undefined;
}

function parseAuthMode(value?: string): VineChartAuthMode {
  const mode = value ?? "none";
  if (mode === "none" || mode === "headers" || mode === "bearer" || mode === "basic") {
    return mode;
  }
  throw new Error(`Invalid VINECHART_AUTH_MODE: ${mode}`);
}

function normalizePath(value: string | undefined, fallback: string): string {
  const path = value ?? fallback;
  return path.startsWith("/") ? path : `/${path}`;
}

export function loadVineChartConfig(): VineChartClientConfig {
  const authMode = parseAuthMode(env("VINECHART_AUTH_MODE"));
  const clientId = env("VINECHART_CLIENT_ID");
  const clientSecret = env("VINECHART_CLIENT_SECRET");
  const apiKey = env("VINECHART_API_KEY");

  if ((authMode === "headers" || authMode === "basic") && (!clientId || !clientSecret)) {
    throw new Error(`VINECHART_CLIENT_ID and VINECHART_CLIENT_SECRET are required for ${authMode} auth`);
  }

  if (authMode === "bearer" && !apiKey && !clientSecret) {
    throw new Error("VINECHART_API_KEY or VINECHART_CLIENT_SECRET is required for bearer auth");
  }

  const baseUrl = env("VINECHART_BASE_URL") ?? "https://vinechart.com";
  new URL(baseUrl);

  return {
    baseUrl: baseUrl.replace(/\/$/, ""),
    statusPath: normalizePath(env("VINECHART_STATUS_PATH"), "/api/status"),
    seriesPath: normalizePath(env("VINECHART_SERIES_PATH"), "/api/series"),
    ssePath: env("VINECHART_SSE_PATH")
      ? normalizePath(env("VINECHART_SSE_PATH"), "/api/events")
      : undefined,
    authMode,
    clientId,
    clientSecret,
    apiKey,
    clientIdHeader: env("VINECHART_CLIENT_ID_HEADER") ?? "X-Client-ID",
    clientSecretHeader: env("VINECHART_CLIENT_SECRET_HEADER") ?? "X-Client-Secret",
    apiKeyHeader: env("VINECHART_API_KEY_HEADER") ?? "X-API-Key",
    requestTimeoutMs: Number(env("VINECHART_REQUEST_TIMEOUT_MS") ?? "10000"),
    userAgent: env("VINECHART_USER_AGENT") ?? "VineScout/0.1 (authorized VineChart client)",
  };
}
