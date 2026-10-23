import { randomBytes, randomInt } from 'node:crypto';

const CAMOUFLAGE_MAGIC = Buffer.from([0x4c, 0x55, 0x4e, 0x41]);
const HEADER_LENGTH = 8;
const MAX_DATAGRAM_LENGTH = 4096;

/**
 * LUNA's independent padded WSS framing. This is not Geny's proprietary protocol.
 * Frame: magic[4] | version[1] | type[1] | payload length[2] | payload | random padding.
 */
export function encodeCamouflageFrame(payload) {
  if (!Buffer.isBuffer(payload) || payload.length < 1 || payload.length > MAX_DATAGRAM_LENGTH) {
    throw new TypeError('payload must be a WireGuard datagram of 1–4096 bytes');
  }
  const header = Buffer.alloc(HEADER_LENGTH);
  CAMOUFLAGE_MAGIC.copy(header, 0);
  header[4] = 1;
  header[5] = 1;
  header.writeUInt16BE(payload.length, 6);
  const paddingLength = randomInt(12, 97);
  return Buffer.concat([header, payload, randomBytes(paddingLength)]);
}

/** Returns a packet, or null for malformed/ignored padding control frames. */
export function decodeCamouflageFrame(frame) {
  if (!Buffer.isBuffer(frame) || frame.length < HEADER_LENGTH ||
      !frame.subarray(0, 4).equals(CAMOUFLAGE_MAGIC) || frame[4] !== 1) return null;
  const type = frame[5];
  const length = frame.readUInt16BE(6);
  if (type === 2 && length === 0) return null;
  if (type !== 1 || length < 1 || length > MAX_DATAGRAM_LENGTH ||
      HEADER_LENGTH + length > frame.length) return null;
  return Buffer.from(frame.subarray(HEADER_LENGTH, HEADER_LENGTH + length));
}
