import type { gmail_v1 } from "googleapis";

/**
 * Recursively extracts the first valid email body from a Gmail MIME payload.
 *
 * Handles deeply nested structures:
 *   multipart/mixed → multipart/alternative → text/html | text/plain
 *
 * Prefers text/html over text/plain.
 */
export function extractEmailBody(payload: gmail_v1.Schema$MessagePart | undefined): string {
    if (!payload) return "";

    // If payload has direct body data (non-multipart message)
    if (payload.body?.data) {
        return Buffer.from(payload.body.data, "base64").toString("utf8");
    }

    // If payload has nested parts, traverse them
    if (payload.parts && payload.parts.length > 0) {
        // First pass: look for text/html
        const htmlBody = findBodyByMimeType(payload.parts, "text/html");
        if (htmlBody) return htmlBody;

        // Second pass: fallback to text/plain
        const plainBody = findBodyByMimeType(payload.parts, "text/plain");
        if (plainBody) return plainBody;

        // Third pass: recurse into multipart containers
        for (const part of payload.parts) {
            if (part.mimeType?.startsWith("multipart/") && part.parts) {
                const nestedBody = extractEmailBody(part);
                if (nestedBody) return nestedBody;
            }
        }
    }

    return "";
}

/**
 * Searches parts (non-recursively at one level) for a specific MIME type
 * and decodes the body data.
 */
function findBodyByMimeType(
    parts: gmail_v1.Schema$MessagePart[],
    mimeType: string,
): string | null {
    for (const part of parts) {
        if (part.mimeType === mimeType && part.body?.data) {
            return Buffer.from(part.body.data, "base64").toString("utf8");
        }

        // Recurse into nested parts (e.g. multipart/alternative inside multipart/mixed)
        if (part.parts && part.parts.length > 0) {
            const nested = findBodyByMimeType(part.parts, mimeType);
            if (nested) return nested;
        }
    }
    return null;
}

/**
 * Extracts a clean email address from a Gmail "From" header value.
 *
 * Examples:
 *   "John Doe <john@example.com>" → "john@example.com"
 *   "john@example.com"            → "john@example.com"
 *   ""                            → ""
 */
export function extractSenderEmail(fromHeader: string): string {
    if (!fromHeader) return "";

    const match = fromHeader.match(/<(.+?)>/);
    return (match?.[1] || fromHeader).toLowerCase().trim();
}

/**
 * Extracts header value by name from Gmail message headers.
 */
export function getHeader(
    headers: gmail_v1.Schema$MessagePartHeader[] | undefined,
    name: string,
): string {
    if (!headers) return "";
    const header = headers.find((h) => h.name?.toLowerCase() === name.toLowerCase());
    return header?.value || "";
}
