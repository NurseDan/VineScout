export type VineChartAuthMode = "none" | "headers" | "bearer" | "basic";

export interface VineChartClientConfig {
  baseUrl: string;
  statusPath: string;
  seriesPath: string;
  ssePath?: string;
  authMode: VineChartAuthMode;
  clientId?: string;
  clientSecret?: string;
  apiKey?: string;
  clientIdHeader: string;
  clientSecretHeader: string;
  apiKeyHeader: string;
  requestTimeoutMs: number;
  userAgent: string;
}

export type VineChartQueryValue = string | number | boolean | null | undefined;

export interface VineChartSeriesQuery {
  [key: string]: VineChartQueryValue;
}

export interface VineChartSseEvent<T = unknown> {
  event?: string;
  id?: string;
  retry?: number;
  data: string;
  parsedData?: T;
  receivedAt: string;
}

export class VineChartApiError extends Error {
  readonly status: number;
  readonly url: string;
  readonly responseBody?: string;

  constructor(message: string, status: number, url: string, responseBody?: string) {
    super(message);
    this.name = "VineChartApiError";
    this.status = status;
    this.url = url;
    this.responseBody = responseBody;
  }
}
