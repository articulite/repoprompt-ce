/**
 * Safely parse JSON from an MCP tool response text.
 * Falls back to null if the text is Markdown or other non-JSON.
 */
export function safeParseJSON<T = any>(text: string): T | null {
  if (!text || typeof text !== "string") return null;
  // Quick check: ToolOutputFormatter Markdown starts with "##" or "- "
  const trimmed = text.trimStart();
  if (trimmed.startsWith("#") || trimmed.startsWith("- **")) {
    console.warn("[safeParseJSON] Skipping Markdown response:", text.slice(0, 80));
    return null;
  }
  try {
    return JSON.parse(text) as T;
  } catch {
    console.warn("[safeParseJSON] Failed to parse:", text.slice(0, 120));
    return null;
  }
}

/**
 * Extract text content from an MCP tool result.
 */
export function getResultText(res: any): string | null {
  if (!res || res.isError) return null;
  return res.content?.[0]?.text ?? null;
}
