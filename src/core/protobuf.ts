/**
 * Minimal protobuf wire-format reader.
 *
 * Anki's modern collection schema (v18) stores notetype config, card templates,
 * deck kind and the media index as protobuf blobs. We only ever need a handful
 * of scalar fields, so pulling in protobufjs (+ generated code + the whole
 * `anki/*.proto` tree) would be dead weight. This reads the wire format
 * directly, which is stable by design — protobuf guarantees unknown fields can
 * be skipped, so this stays forward-compatible with future Anki releases.
 *
 * Reference: Anki `proto/anki/notetypes.proto`, `proto/anki/decks.proto`,
 * `proto/anki/import_export.proto`.
 */

export const WIRE_VARINT = 0;
export const WIRE_FIXED64 = 1;
export const WIRE_LENGTH = 2;
export const WIRE_FIXED32 = 5;

export type PbField =
  | { wire: typeof WIRE_VARINT; value: number }
  | { wire: typeof WIRE_LENGTH; bytes: Uint8Array }
  | { wire: typeof WIRE_FIXED32 | typeof WIRE_FIXED64; raw: Uint8Array };

/** Decoded message: field number -> every occurrence (protobuf allows repeats). */
export type PbMessage = Map<number, PbField[]>;

const utf8 = new TextDecoder('utf-8');

class Cursor {
  pos = 0;
  constructor(readonly buf: Uint8Array) {}

  get done(): boolean {
    return this.pos >= this.buf.length;
  }

  varint(): number {
    let result = 0;
    let shift = 0;
    while (this.pos < this.buf.length) {
      const byte = this.buf[this.pos++];
      // Number is safe here: all Anki varints we read are ids/enums/sizes.
      result += (byte & 0x7f) * Math.pow(2, shift);
      if ((byte & 0x80) === 0) return result;
      shift += 7;
      if (shift > 70) throw new Error('protobuf: varint too long');
    }
    throw new Error('protobuf: truncated varint');
  }
}

/** Decode a protobuf message into a field map. Unknown fields are preserved. */
export function decodeMessage(buf: Uint8Array): PbMessage {
  const out: PbMessage = new Map();
  const c = new Cursor(buf);

  const push = (field: number, v: PbField) => {
    const list = out.get(field);
    if (list) list.push(v);
    else out.set(field, [v]);
  };

  while (!c.done) {
    const key = c.varint();
    const field = key >>> 3;
    const wire = key & 0x07;

    switch (wire) {
      case WIRE_VARINT:
        push(field, { wire: WIRE_VARINT, value: c.varint() });
        break;
      case WIRE_LENGTH: {
        const len = c.varint();
        const bytes = c.buf.subarray(c.pos, c.pos + len);
        c.pos += len;
        push(field, { wire: WIRE_LENGTH, bytes });
        break;
      }
      case WIRE_FIXED64:
        push(field, { wire: WIRE_FIXED64, raw: c.buf.subarray(c.pos, c.pos + 8) });
        c.pos += 8;
        break;
      case WIRE_FIXED32:
        push(field, { wire: WIRE_FIXED32, raw: c.buf.subarray(c.pos, c.pos + 4) });
        c.pos += 4;
        break;
      default:
        // Deprecated group wire types (3/4) never appear in Anki's protos.
        throw new Error(`protobuf: unsupported wire type ${wire} for field ${field}`);
    }
  }
  return out;
}

/** Read a length-delimited field as a UTF-8 string; `fallback` when absent. */
export function pbString(msg: PbMessage, field: number, fallback = ''): string {
  const f = msg.get(field)?.[0];
  if (!f || f.wire !== WIRE_LENGTH) return fallback;
  return utf8.decode(f.bytes);
}

/** Read a varint field; `fallback` when absent (protobuf omits default values). */
export function pbVarint(msg: PbMessage, field: number, fallback = 0): number {
  const f = msg.get(field)?.[0];
  if (!f || f.wire !== WIRE_VARINT) return fallback;
  return f.value;
}

/** Read raw bytes of a length-delimited field. */
export function pbBytes(msg: PbMessage, field: number): Uint8Array | undefined {
  const f = msg.get(field)?.[0];
  if (!f || f.wire !== WIRE_LENGTH) return undefined;
  return f.bytes;
}

/** Read every occurrence of a repeated length-delimited (usually nested) field. */
export function pbRepeated(msg: PbMessage, field: number): Uint8Array[] {
  const list = msg.get(field);
  if (!list) return [];
  const out: Uint8Array[] = [];
  for (const f of list) if (f.wire === WIRE_LENGTH) out.push(f.bytes);
  return out;
}

/** True when a field is present at all, regardless of value (for `oneof` probing). */
export function pbHas(msg: PbMessage, field: number): boolean {
  return msg.has(field);
}
