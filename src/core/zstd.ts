/**
 * Zstandard decompression, isolated behind a one-function interface.
 *
 * Anki 2.1.50+ ("package version 3") zstd-compresses the collection database,
 * the media index and every individual media file. `fzstd` is a dependency-free
 * pure-JS decompressor, so this works identically in the browser, a Web Worker
 * and Node without shipping another WASM blob.
 */
import { decompress } from 'fzstd';

/** Zstandard frame magic number: 0xFD2FB528, little-endian on disk. */
const ZSTD_MAGIC = [0x28, 0xb5, 0x2f, 0xfd];

/** Cheap sniff so callers can stay tolerant of mixed-format packages. */
export function isZstd(bytes: Uint8Array): boolean {
  if (bytes.length < 4) return false;
  for (let i = 0; i < 4; i++) if (bytes[i] !== ZSTD_MAGIC[i]) return false;
  return true;
}

/** Decompress a zstd frame. */
export function zstdDecompress(bytes: Uint8Array): Uint8Array {
  return decompress(bytes);
}

/** Decompress only when the payload actually is a zstd frame. */
export function maybeZstdDecompress(bytes: Uint8Array): Uint8Array {
  return isZstd(bytes) ? decompress(bytes) : bytes;
}
