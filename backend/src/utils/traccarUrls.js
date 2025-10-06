export function parseTraccarBaseUrl(rawBaseURL) {
  if (!rawBaseURL) {
    return {
      rawBaseURL,
      trimmedBaseURL: undefined,
      httpBaseURL: undefined,
      apiBaseURL: undefined,
      error: "TRACCAR_BASE_URL não definido",
    };
  }

  const trimmedBaseURL = rawBaseURL.replace(/\/+$/, "");
  const maybeHttpBase = trimmedBaseURL.endsWith("/api")
    ? trimmedBaseURL.slice(0, -4)
    : trimmedBaseURL;

  try {
    const parsed = new URL(maybeHttpBase);
    if (!/^https?:$/.test(parsed.protocol)) {
      throw new Error("Protocol must be http or https");
    }

    const normalizedPath = parsed.pathname.replace(/\/+$/, "");
    const httpBaseURL = `${parsed.origin}${normalizedPath === "/" ? "" : normalizedPath}`;
    const apiBaseURL = `${httpBaseURL}/api`;

    return {
      rawBaseURL,
      trimmedBaseURL,
      httpBaseURL,
      apiBaseURL,
      error: null,
    };
  } catch (err) {
    return {
      rawBaseURL,
      trimmedBaseURL,
      httpBaseURL: undefined,
      apiBaseURL: undefined,
      error: err?.message || "URL inválida",
    };
  }
}

export function buildTraccarWsUrl(httpBaseURL) {
  const trimmed = httpBaseURL.replace(/\/+$/, "");
  const proto = trimmed.startsWith("https") ? "wss" : "ws";
  const host = trimmed.replace(/^https?:\/\//, "");
  return `${proto}://${host}/api/socket`;
}
