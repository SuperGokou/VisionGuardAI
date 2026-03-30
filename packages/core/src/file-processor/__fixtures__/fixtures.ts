/**
 * Minimal valid test fixtures as byte arrays.
 * These represent the smallest valid files for each supported format.
 */

/**
 * Minimal valid PNG file (1x1 pixel, red).
 * PNG signature + IHDR + IDAT + IEND chunks.
 */
export const VALID_PNG_BYTES = Buffer.from([
  // PNG signature
  0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a,
  // IHDR chunk (13 bytes: 1x1, 8-bit RGB)
  0x00, 0x00, 0x00, 0x0d, // length = 13
  0x49, 0x48, 0x44, 0x52, // "IHDR"
  0x00, 0x00, 0x00, 0x01, // width = 1
  0x00, 0x00, 0x00, 0x01, // height = 1
  0x08,                   // bit depth = 8
  0x02,                   // color type = RGB
  0x00, 0x00, 0x00,       // compression, filter, interlace
  0x90, 0x77, 0x53, 0xde, // CRC
  // IDAT chunk (minimal compressed data for 1x1 RGB pixel)
  0x00, 0x00, 0x00, 0x0c, // length = 12
  0x49, 0x44, 0x41, 0x54, // "IDAT"
  0x08, 0xd7, 0x63, 0xf8, 0xcf, 0xc0, 0x00, 0x00,
  0x01, 0x01, 0x01, 0x00, // compressed data
  0x18, 0xdd, 0x8d, 0xb4, // CRC
  // IEND chunk
  0x00, 0x00, 0x00, 0x00, // length = 0
  0x49, 0x45, 0x4e, 0x44, // "IEND"
  0xae, 0x42, 0x60, 0x82, // CRC
]);

/**
 * Minimal valid JPEG file header.
 * SOI marker + APP0 (JFIF) header.
 */
export const VALID_JPEG_BYTES = Buffer.from([
  0xff, 0xd8, 0xff, 0xe0, // SOI + APP0 marker
  0x00, 0x10,             // length = 16
  0x4a, 0x46, 0x49, 0x46, 0x00, // "JFIF\0"
  0x01, 0x01,             // version 1.1
  0x00,                   // aspect ratio units
  0x00, 0x01,             // X density
  0x00, 0x01,             // Y density
  0x00, 0x00,             // thumbnail dimensions
  0xff, 0xd9,             // EOI marker
]);

/**
 * Minimal valid WebP file header.
 * RIFF header + WEBP signature + VP8 chunk.
 */
export const VALID_WEBP_BYTES = Buffer.from([
  0x52, 0x49, 0x46, 0x46, // "RIFF"
  0x24, 0x00, 0x00, 0x00, // file size - 8
  0x57, 0x45, 0x42, 0x50, // "WEBP"
  0x56, 0x50, 0x38, 0x20, // "VP8 "
  0x18, 0x00, 0x00, 0x00, // chunk size
  0x30, 0x01, 0x00, 0x9d, // VP8 bitstream header
  0x01, 0x2a, 0x01, 0x00, // width=1
  0x01, 0x00, 0x01, 0x40, // height=1
  0x25, 0xa4, 0x00, 0x03, // partition data
  0x70, 0x00, 0xfe, 0xfb,
  0x94, 0x00, 0x00,
]);

/**
 * Minimal valid PDF file (1 page).
 */
export const VALID_PDF_BYTES = Buffer.from(
  "%PDF-1.4\n" +
  "1 0 obj\n<< /Type /Catalog /Pages 2 0 R >>\nendobj\n" +
  "2 0 obj\n<< /Type /Pages /Kids [3 0 R] /Count 1 >>\nendobj\n" +
  "3 0 obj\n<< /Type /Page /Parent 2 0 R /MediaBox [0 0 612 792] >>\nendobj\n" +
  "xref\n0 4\n" +
  "0000000000 65535 f \n" +
  "0000000009 00000 n \n" +
  "0000000058 00000 n \n" +
  "0000000115 00000 n \n" +
  "trailer\n<< /Size 4 /Root 1 0 R >>\nstartxref\n195\n%%EOF\n",
);

/**
 * Corrupted PNG (invalid magic bytes after the PNG signature).
 */
export const CORRUPTED_PNG_BYTES = Buffer.from([
  0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a,
  0x00, 0x00, 0x00, 0x00, // Invalid IHDR length
  0xDE, 0xAD, 0xBE, 0xEF, // Invalid chunk type
]);

/**
 * Random bytes that don't match any supported signature.
 */
export const UNSUPPORTED_BYTES = Buffer.from([
  0x00, 0x01, 0x02, 0x03, 0x04, 0x05, 0x06, 0x07,
  0x08, 0x09, 0x0a, 0x0b, 0x0c, 0x0d, 0x0e, 0x0f,
]);

/**
 * Multi-page PDF fixture (2 pages).
 */
export const MULTI_PAGE_PDF_BYTES = Buffer.from(
  "%PDF-1.4\n" +
  "1 0 obj\n<< /Type /Catalog /Pages 2 0 R >>\nendobj\n" +
  "2 0 obj\n<< /Type /Pages /Kids [3 0 R 4 0 R] /Count 2 >>\nendobj\n" +
  "3 0 obj\n<< /Type /Page /Parent 2 0 R /MediaBox [0 0 612 792] >>\nendobj\n" +
  "4 0 obj\n<< /Type /Page /Parent 2 0 R /MediaBox [0 0 612 792] >>\nendobj\n" +
  "xref\n0 5\n" +
  "0000000000 65535 f \n" +
  "0000000009 00000 n \n" +
  "0000000058 00000 n \n" +
  "0000000125 00000 n \n" +
  "0000000196 00000 n \n" +
  "trailer\n<< /Size 5 /Root 1 0 R >>\nstartxref\n267\n%%EOF\n",
);
