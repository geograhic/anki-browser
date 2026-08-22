/**
 * Minimal, **lazy** ZIP reader.
 *
 * Why not `fflate.unzipSync`? It inflates every entry up front. An Anki
 * `.colpkg` backup can be 350 MB with ~1700 media files, so eager inflation is
 * a guaranteed out-of-memory in a browser tab. Instead we parse only the
 * central directory and inflate individual entries on demand.
 *
 * Convenient side effect: Anki stores its already-zstd-compressed payloads with
 * method 0 (stored), so reading them is a zero-copy slice.
 */
import { inflateSync } from 'fflate';

const SIG_EOCD = 0x06054b50;
const SIG_EOCD64 = 0x06064b50;
const SIG_EOCD64_LOC = 0x07064b50;
const SIG_CENTRAL = 0x02014b50;

const METHOD_STORED = 0;
const METHOD_DEFLATE = 8;

export interface ZipEntry {
  name: string;
  method: number;
  compressedSize: number;
  uncompressedSize: number;
  /** Offset of the local file header. */
  headerOffset: number;
}

export class ZipReadError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'ZipReadError';
  }
}

/** UTF-8 decoder shared across calls; ZIP names are UTF-8 in every Anki export. */
const utf8 = new TextDecoder('utf-8');

export class ZipArchive {
  private readonly view: DataView;
  readonly entries: Map<string, ZipEntry> = new Map();

  private constructor(private readonly bytes: Uint8Array) {
    this.view = new DataView(bytes.buffer, bytes.byteOffset, bytes.byteLength);
    this.readCentralDirectory();
  }

  static open(bytes: Uint8Array): ZipArchive {
    return new ZipArchive(bytes);
  }

  /** Locate the End Of Central Directory record by scanning backwards. */
  private findEocd(): number {
    const max = Math.min(this.bytes.length, 0xffff + 22);
    for (let i = 22; i <= max; i++) {
      const off = this.bytes.length - i;
      if (off < 0) break;
      if (this.view.getUint32(off, true) === SIG_EOCD) return off;
    }
    throw new ZipReadError('Not a ZIP file (no End Of Central Directory record found)');
  }

  private readCentralDirectory(): void {
    const eocd = this.findEocd();
    let entryCount = this.view.getUint16(eocd + 10, true);
    let cdOffset = this.view.getUint32(eocd + 16, true);

    // ZIP64: when counts/offsets are saturated the real values live in the
    // ZIP64 EOCD record, located via the ZIP64 EOCD locator just before EOCD.
    if (entryCount === 0xffff || cdOffset === 0xffffffff) {
      const locOff = eocd - 20;
      if (locOff >= 0 && this.view.getUint32(locOff, true) === SIG_EOCD64_LOC) {
        const z64 = Number(this.view.getBigUint64(locOff + 8, true));
        if (this.view.getUint32(z64, true) !== SIG_EOCD64) {
          throw new ZipReadError('Corrupt ZIP64 End Of Central Directory record');
        }
        entryCount = Number(this.view.getBigUint64(z64 + 32, true));
        cdOffset = Number(this.view.getBigUint64(z64 + 48, true));
      }
    }

    let p = cdOffset;
    for (let i = 0; i < entryCount; i++) {
      if (this.view.getUint32(p, true) !== SIG_CENTRAL) {
        throw new ZipReadError(`Corrupt central directory entry at offset ${p}`);
      }
      const method = this.view.getUint16(p + 10, true);
      let compressedSize = this.view.getUint32(p + 20, true);
      let uncompressedSize = this.view.getUint32(p + 24, true);
      const nameLen = this.view.getUint16(p + 28, true);
      const extraLen = this.view.getUint16(p + 30, true);
      const commentLen = this.view.getUint16(p + 32, true);
      let headerOffset = this.view.getUint32(p + 42, true);
      const name = utf8.decode(this.bytes.subarray(p + 46, p + 46 + nameLen));

      // Parse the ZIP64 extended information extra field when values overflow.
      if (
        compressedSize === 0xffffffff ||
        uncompressedSize === 0xffffffff ||
        headerOffset === 0xffffffff
      ) {
        let e = p + 46 + nameLen;
        const end = e + extraLen;
        while (e + 4 <= end) {
          const headerId = this.view.getUint16(e, true);
          const size = this.view.getUint16(e + 2, true);
          if (headerId === 0x0001) {
            let q = e + 4;
            if (uncompressedSize === 0xffffffff) {
              uncompressedSize = Number(this.view.getBigUint64(q, true));
              q += 8;
            }
            if (compressedSize === 0xffffffff) {
              compressedSize = Number(this.view.getBigUint64(q, true));
              q += 8;
            }
            if (headerOffset === 0xffffffff) {
              headerOffset = Number(this.view.getBigUint64(q, true));
            }
            break;
          }
          e += 4 + size;
        }
      }

      this.entries.set(name, { name, method, compressedSize, uncompressedSize, headerOffset });
      p += 46 + nameLen + extraLen + commentLen;
    }
  }

  has(name: string): boolean {
    return this.entries.has(name);
  }

  get names(): string[] {
    return [...this.entries.keys()];
  }

  /** Read and decompress a single entry. Throws if the entry is missing. */
  read(name: string): Uint8Array {
    const entry = this.entries.get(name);
    if (!entry) throw new ZipReadError(`Entry not found in package: ${name}`);

    // Local header: 30 fixed bytes + name + extra, then the payload.
    const lh = entry.headerOffset;
    const nameLen = this.view.getUint16(lh + 26, true);
    const extraLen = this.view.getUint16(lh + 28, true);
    const dataStart = lh + 30 + nameLen + extraLen;
    const raw = this.bytes.subarray(dataStart, dataStart + entry.compressedSize);

    if (entry.method === METHOD_STORED) return raw;
    if (entry.method === METHOD_DEFLATE) {
      return inflateSync(raw, { out: new Uint8Array(entry.uncompressedSize) });
    }
    throw new ZipReadError(`Unsupported ZIP compression method ${entry.method} for "${name}"`);
  }
}
