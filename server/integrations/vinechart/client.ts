import {
  VineChartApiError,
  type VineChartClientConfig,
  type VineChartQueryValue,
  type VineChartSeriesQuery,
  type VineChartSseEvent,
} from "./types";

function appendQuery(url: URL, query?: Record<string, VineChartQueryValue>) {
  if (!query) return;

  for (const [key, value] of Object.entries(query)) {
    if (value === undefined || value === null) continue;
    url.searchParams.set(key, String(value));
  }
}

function tryParseJson(value: string): unknown {
  try {
    return JSON.parse(value);
  } catch {
    return undefined;
  }
}

function parseSseFrame(frame: string): VineChartSseEvent | null {
  if (!frame.trim()) return null;

  let event: string | undefined;
  let id: string | undefined;
  let retry: number | undefined;
  const dataLines: string[] = [];

  for (const rawLine of frame.split(/\r?\n/)) {
    if (!rawLine || rawLine.startsWith(":")) continue;

    const separator = rawLine.indexOf(":");
    const field = separator === -1 ? rawLine : rawLine.slice(0, separator);
    let value = separator === -1 ? "" : rawLine.slice(separator + 1);
    if (value.startsWith(" ")) value = value.slice(1);

    if (field === "event") event = value;
    else if (field === "id") id = value;
    else if (field === "retry") {
      const parsed = Number(value);
      if (Number.isFinite(parsed)) retry = parsed;
    } else if (field === "data") {
      dataLines.push(value);
    }
  }

  const data = dataLines.join("\n");
  return {
    event,
    id,
    retry,
    data,
    parsedData: data ? tryParseJson(data) : undefined,
    receivedAt: new Date().toISOString(),
  };
}

export class VineChartClient {
  constructor(private readonly config: VineChartClientConfig) {}

  async getStatus<T = unknown>(signal?: AbortSignal): Promise<T> {
    return this.requestJson<T>(this.config.statusPath, undefined, signal);
  }

  async getSeries<T = unknown>(
    query?: VineChartSeriesQuery,
    signal?: AbortSignal,
  ): Promise<T> {
    return this.requestJson<T>(this.config.seriesPath, query, signal);
  }

  async *stream<T = unknown>(
    signal?: AbortSignal,
  ): AsyncGenerator<VineChartSseEvent<T>, void, void> {
    if (!this.config.ssePath) {
      throw new Error("VINECHART_SSE_PATH is not configured");
    }

    const url = new URL(this.config.ssePath, this.config.baseUrl);
    const controller = new AbortController();
    const onAbort = () => controller.abort(signal?.reason);
    signal?.addEventListener("abort", onAbort, { once: true });

    try {
      const response = await fetch(url, {
        method: "GET",
        headers: this.buildHeaders("text/event-stream"),
        signal: controller.signal,
      });

      if (!response.ok) {
        const body = await response.text().catch(() => undefined);
        throw new VineChartApiError(
          `VineChart SSE request failed with HTTP ${response.status}`,
          response.status,
          url.toString(),
          body,
        );
      }

      if (!response.body) {
        throw new Error("VineChart SSE response did not include a response body");
      }

      const reader = response.body.getReader();
      const decoder = new TextDecoder();
      let buffer = "";

      while (true) {
        const { value, done } = await reader.read();
        if (done) break;

        buffer += decoder.decode(value, { stream: true });

        let boundary: number;
        while ((boundary = buffer.search(/\r?\n\r?\n/)) !== -1) {
          const frame = buffer.slice(0, boundary);
          const separatorMatch = buffer.slice(boundary).match(/^(?:\r?\n){2}/);
          buffer = buffer.slice(boundary + (separatorMatch?.[0].length ?? 2));

          const parsed = parseSseFrame(frame);
          if (parsed) yield parsed as VineChartSseEvent<T>;
        }
      }

      buffer += decoder.decode();
      const trailing = parseSseFrame(buffer);
      if (trailing) yield trailing as VineChartSseEvent<T>;
    } finally {
      signal?.removeEventListener("abort", onAbort);
      controller.abort();
    }
  }

  private async requestJson<T>(
    path: string,
    query?: Record<string, VineChartQueryValue>,
    signal?: AbortSignal,
  ): Promise<T> {
    const url = new URL(path, this.config.baseUrl);
    appendQuery(url, query);

    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), this.config.requestTimeoutMs);
    const onAbort = () => controller.abort(signal?.reason);
    signal?.addEventListener("abort", onAbort, { once: true });

    try {
      const response = await fetch(url, {
        method: "GET",
        headers: this.buildHeaders("application/json"),
        signal: controller.signal,
      });

      if (!response.ok) {
        const body = await response.text().catch(() => undefined);
        throw new VineChartApiError(
          `VineChart request failed with HTTP ${response.status}`,
          response.status,
          url.toString(),
          body,
        );
      }

      return (await response.json()) as T;
    } finally {
      clearTimeout(timeout);
      signal?.removeEventListener("abort", onAbort);
    }
  }

  private buildHeaders(accept: string): Headers {
    const headers = new Headers({
      Accept: accept,
      "User-Agent": this.config.userAgent,
    });

    switch (this.config.authMode) {
      case "none":
        break;
      case "headers":
        headers.set(this.config.clientIdHeader, this.config.clientId!);
        headers.set(this.config.clientSecretHeader, this.config.clientSecret!);
        if (this.config.apiKey) {
          headers.set(this.config.apiKeyHeader, this.config.apiKey);
        }
        break;
      case "bearer": {
        const token = this.config.apiKey ?? this.config.clientSecret!;
        headers.set("Authorization", `Bearer ${token}`);
        if (this.config.clientId) {
          headers.set(this.config.clientIdHeader, this.config.clientId);
        }
        break;
      }
      case "basic": {
        const encoded = Buffer.from(
          `${this.config.clientId!}:${this.config.clientSecret!}`,
          "utf8",
        ).toString("base64");
        headers.set("Authorization", `Basic ${encoded}`);
        break;
      }
    }

    return headers;
  }
}
