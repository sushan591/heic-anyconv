/**
 * Extract XMP metadata from a HEIC file.
 * XMP is stored as XML in the ISOBMFF container with content type "application/rdf+xml".
 */

const XMP_START = '<x:xmpmeta';
const XMP_END = '</x:xmpmeta>';

/**
 * Extract XMP XML string from HEIC file data.
 */
export function extractXmpFromHeic(data: Uint8Array): string | null {
  // Convert to string and search for XMP markers
  // XMP is typically a small portion of the file, but we need to find it
  // Use a sliding window approach to avoid creating a huge string
  const chunkSize = 65536;
  let xmpStart = -1;
  let xmpEnd = -1;

  for (let i = 0; i < data.length; i += chunkSize - 100) {
    const end = Math.min(i + chunkSize, data.length);
    const chunk = new TextDecoder('utf-8', { fatal: false }).decode(data.subarray(i, end));

    if (xmpStart === -1) {
      const startIdx = chunk.indexOf(XMP_START);
      if (startIdx !== -1) {
        xmpStart = i + startIdx;
      }
    }

    if (xmpStart !== -1) {
      const searchFrom = Math.max(0, xmpStart - i);
      const endIdx = chunk.indexOf(XMP_END, searchFrom);
      if (endIdx !== -1) {
        xmpEnd = i + endIdx + XMP_END.length;
        break;
      }
    }
  }

  if (xmpStart === -1 || xmpEnd === -1) return null;

  const xmpBytes = data.subarray(xmpStart, xmpEnd);
  return new TextDecoder('utf-8').decode(xmpBytes);
}
