/**
 * Scheme allowlist for URLs that come from the API and end up in an anchor
 * `href` or `window.location`. Only `http(s)` is permitted: a `javascript:`,
 * `data:`, `vbscript:`, or `blob:` URL in an href executes on click (DOM-XSS),
 * so any value that isn't a parseable http/https URL is treated as unsafe and
 * must not be rendered as a link or navigated to.
 *
 * Uses the URL parser (not a regex) so leading control characters / whitespace
 * that browsers strip before dispatching the scheme cannot smuggle a dangerous
 * scheme past the check.
 */
export function isSafeHttpUrl(url: string | null | undefined): url is string {
  if (!url) {
    return false;
  }
  try {
    const protocol = new URL(url).protocol;
    return protocol === "http:" || protocol === "https:";
  } catch {
    return false;
  }
}
