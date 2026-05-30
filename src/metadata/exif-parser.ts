/**
 * Minimal EXIF parser for extracting EXIF data from HEIC ISOBMFF containers
 * and raw EXIF APP1 segments.
 *
 * Handles: orientation, GPS, camera make/model, date, dimensions.
 * Zero external dependencies.
 */

const EXIF_HEADER = new Uint8Array([0x45, 0x78, 0x69, 0x66, 0x00, 0x00]); // "Exif\0\0"
const TIFF_LE = 0x4949; // "II" - little endian
const TIFF_BE = 0x4D4D; // "MM" - big endian

// Common EXIF IFD tags
const TAG_NAMES: Record<number, string> = {
  0x010E: 'ImageDescription',
  0x010F: 'Make',
  0x0110: 'Model',
  0x0112: 'Orientation',
  0x011A: 'XResolution',
  0x011B: 'YResolution',
  0x0131: 'Software',
  0x0132: 'DateTime',
  0x013B: 'Artist',
  0x8769: 'ExifIFDPointer',
  0x8825: 'GPSInfoIFDPointer',
  // Exif sub-IFD tags
  0x829A: 'ExposureTime',
  0x829D: 'FNumber',
  0x8827: 'ISOSpeedRatings',
  0x9000: 'ExifVersion',
  0x9003: 'DateTimeOriginal',
  0x9004: 'DateTimeDigitized',
  0x920A: 'FocalLength',
  0xA001: 'ColorSpace',
  0xA002: 'PixelXDimension',
  0xA003: 'PixelYDimension',
  0xA433: 'LensMake',
  0xA434: 'LensModel',
  // GPS tags
  0x0001: 'GPSLatitudeRef',
  0x0002: 'GPSLatitude',
  0x0003: 'GPSLongitudeRef',
  0x0004: 'GPSLongitude',
  0x0005: 'GPSAltitudeRef',
  0x0006: 'GPSAltitude',
};

export interface ExifData {
  [key: string]: unknown;
}

class DataReader {
  private view: DataView;
  private littleEndian: boolean;

  constructor(
    private data: Uint8Array,
    littleEndian: boolean,
    private baseOffset: number = 0,
  ) {
    this.view = new DataView(data.buffer, data.byteOffset, data.byteLength);
    this.littleEndian = littleEndian;
  }

  getUint8(offset: number): number {
    return this.view.getUint8(offset);
  }

  getUint16(offset: number): number {
    return this.view.getUint16(offset, this.littleEndian);
  }

  getUint32(offset: number): number {
    return this.view.getUint32(offset, this.littleEndian);
  }

  getInt32(offset: number): number {
    return this.view.getInt32(offset, this.littleEndian);
  }

  getString(offset: number, length: number): string {
    let str = '';
    for (let i = 0; i < length; i++) {
      const ch = this.data[offset + i];
      if (ch === 0) break;
      str += String.fromCharCode(ch);
    }
    return str;
  }

  getRational(offset: number): number {
    const num = this.getUint32(offset);
    const den = this.getUint32(offset + 4);
    return den === 0 ? 0 : num / den;
  }

  getSignedRational(offset: number): number {
    const num = this.getInt32(offset);
    const den = this.getInt32(offset + 4);
    return den === 0 ? 0 : num / den;
  }
}

function readTagValue(reader: DataReader, type: number, count: number, valueOffset: number): unknown {
  switch (type) {
    case 1: // BYTE
      return count === 1 ? reader.getUint8(valueOffset) : undefined;
    case 2: // ASCII
      return reader.getString(valueOffset, count);
    case 3: // SHORT
      return count === 1 ? reader.getUint16(valueOffset) : undefined;
    case 4: // LONG
      return count === 1 ? reader.getUint32(valueOffset) : undefined;
    case 5: // RATIONAL
      if (count === 1) return reader.getRational(valueOffset);
      if (count === 3) {
        return [
          reader.getRational(valueOffset),
          reader.getRational(valueOffset + 8),
          reader.getRational(valueOffset + 16),
        ];
      }
      return undefined;
    case 7: // UNDEFINED
      return reader.getString(valueOffset, Math.min(count, 32));
    case 10: // SRATIONAL
      if (count === 1) return reader.getSignedRational(valueOffset);
      return undefined;
    default:
      return undefined;
  }
}

function readIFD(reader: DataReader, ifdOffset: number, tiffStart: number): ExifData {
  const result: ExifData = {};

  if (ifdOffset + 2 > reader['data'].length) return result;

  const entryCount = reader.getUint16(ifdOffset);
  let offset = ifdOffset + 2;

  for (let i = 0; i < entryCount; i++) {
    if (offset + 12 > reader['data'].length) break;

    const tag = reader.getUint16(offset);
    const type = reader.getUint16(offset + 2);
    const count = reader.getUint32(offset + 4);

    // Calculate value size
    const typeSizes: Record<number, number> = { 1: 1, 2: 1, 3: 2, 4: 4, 5: 8, 7: 1, 9: 4, 10: 8 };
    const typeSize = typeSizes[type] || 1;
    const totalSize = typeSize * count;

    // If value fits in 4 bytes, it's inline; otherwise it's an offset
    let valueOffset: number;
    if (totalSize <= 4) {
      valueOffset = offset + 8;
    } else {
      valueOffset = tiffStart + reader.getUint32(offset + 8);
    }

    if (valueOffset < reader['data'].length) {
      const tagName = TAG_NAMES[tag] || `Tag_0x${tag.toString(16).padStart(4, '0')}`;

      // Handle sub-IFD pointers
      if (tag === 0x8769 || tag === 0x8825) {
        const subIfdOffset = tiffStart + reader.getUint32(offset + 8);
        const subData = readIFD(reader, subIfdOffset, tiffStart);
        Object.assign(result, subData);
      } else {
        const value = readTagValue(reader, type, count, valueOffset);
        if (value !== undefined) {
          result[tagName] = value;
        }
      }
    }

    offset += 12;
  }

  return result;
}

/**
 * Parse EXIF data from raw bytes.
 * Expects data starting with "Exif\0\0" or directly with TIFF header ("II"/"MM").
 */
export function parseExif(data: Uint8Array): ExifData | null {
  if (data.length < 14) return null;

  let tiffStart = 0;

  // Check for Exif header
  if (
    data[0] === EXIF_HEADER[0] &&
    data[1] === EXIF_HEADER[1] &&
    data[2] === EXIF_HEADER[2] &&
    data[3] === EXIF_HEADER[3]
  ) {
    tiffStart = 6;
  }

  // Check byte order
  const byteOrder = (data[tiffStart] << 8) | data[tiffStart + 1];
  let littleEndian: boolean;

  if (byteOrder === TIFF_LE) {
    littleEndian = true;
  } else if (byteOrder === TIFF_BE) {
    littleEndian = false;
  } else {
    return null;
  }

  const reader = new DataReader(data, littleEndian);

  // Verify TIFF magic number (42)
  const magic = reader.getUint16(tiffStart + 2);
  if (magic !== 42) return null;

  // Get offset to first IFD
  const ifdOffset = tiffStart + reader.getUint32(tiffStart + 4);

  return readIFD(reader, ifdOffset, tiffStart);
}

/**
 * Calculate the actual size of EXIF/TIFF data by walking IFD entries.
 * Returns the byte offset (relative to tiffStart) just past the last
 * referenced data, so we know where the EXIF payload truly ends.
 */
function calcTiffDataEnd(data: Uint8Array, tiffStart: number): number {
  if (tiffStart + 8 > data.length) return 8;

  const byteOrder = (data[tiffStart] << 8) | data[tiffStart + 1];
  const le = byteOrder === TIFF_LE;

  function u16(off: number): number {
    const abs = tiffStart + off;
    if (abs + 2 > data.length) return 0;
    return le
      ? data[abs] | (data[abs + 1] << 8)
      : (data[abs] << 8) | data[abs + 1];
  }

  function u32(off: number): number {
    const abs = tiffStart + off;
    if (abs + 4 > data.length) return 0;
    return le
      ? data[abs] | (data[abs + 1] << 8) | (data[abs + 2] << 16) | ((data[abs + 3] << 24) >>> 0)
      : ((data[abs] << 24) | (data[abs + 1] << 16) | (data[abs + 2] << 8) | data[abs + 3]) >>> 0;
  }

  const typeSizes: Record<number, number> = { 1: 1, 2: 1, 3: 2, 4: 4, 5: 8, 7: 1, 8: 2, 9: 4, 10: 8, 12: 8 };
  let furthest = 8; // minimum: TIFF header

  function walkIfd(ifdOffset: number, depth: number): void {
    if (depth > 4 || ifdOffset + 2 > data.length - tiffStart) return;
    const count = u16(ifdOffset);
    const ifdEnd = ifdOffset + 2 + count * 12 + 4; // +4 for next-IFD pointer
    if (ifdEnd > furthest) furthest = ifdEnd;

    for (let i = 0; i < count; i++) {
      const entryOff = ifdOffset + 2 + i * 12;
      if (tiffStart + entryOff + 12 > data.length) break;

      const tag = u16(entryOff);
      const type = u16(entryOff + 2);
      const cnt = u32(entryOff + 4);
      const sz = (typeSizes[type] || 1) * cnt;

      if (sz > 4) {
        const valOff = u32(entryOff + 8);
        const valEnd = valOff + sz;
        if (valEnd > furthest) furthest = valEnd;
      }

      // Follow sub-IFD pointers (ExifIFD, GPSIFD)
      if (tag === 0x8769 || tag === 0x8825) {
        const subOff = u32(entryOff + 8);
        walkIfd(subOff, depth + 1);
      }
    }

    // Follow next-IFD pointer
    const nextIfdOff = u32(ifdOffset + 2 + count * 12);
    if (nextIfdOff > 0) {
      walkIfd(nextIfdOff, depth + 1);
    }
  }

  const magic = u16(2);
  if (magic !== 42) return 8;

  const firstIfd = u32(4);
  if (firstIfd > 0) {
    walkIfd(firstIfd, 0);
  }

  return furthest;
}

/**
 * Extract raw EXIF bytes from a HEIC file's ISOBMFF container.
 * Searches for the Exif item in the meta box, then determines
 * the actual EXIF data extent by walking the TIFF IFD structure.
 */
export function extractExifFromHeic(data: Uint8Array): Uint8Array | null {
  // Search for "Exif" marker in the data
  for (let i = 0; i < data.length - 6; i++) {
    if (
      data[i] === 0x45 && // E
      data[i + 1] === 0x78 && // x
      data[i + 2] === 0x69 && // i
      data[i + 3] === 0x66 && // f
      data[i + 4] === 0x00 &&
      data[i + 5] === 0x00
    ) {
      // "Exif\0\0" header is 6 bytes, TIFF data starts at i+6
      const tiffStart = i + 6;
      if (tiffStart + 8 > data.length) return null;

      // Walk TIFF IFDs to find actual data extent
      const tiffLen = calcTiffDataEnd(data, tiffStart);
      const totalLen = 6 + tiffLen; // "Exif\0\0" + TIFF data

      // Clamp to APP1 max (65533 = 0xFFFF - 2 for length field)
      const safeLen = Math.min(totalLen, 65533, data.length - i);
      return data.slice(i, i + safeLen);
    }
  }

  return null;
}
