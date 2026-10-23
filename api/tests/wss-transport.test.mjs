import test from 'node:test';
import assert from 'node:assert/strict';
import { encodeCamouflageFrame, decodeCamouflageFrame } from '../wss-transport.mjs';

test('round-trips a WireGuard datagram while adding variable padding', () => {
  const payload = Buffer.from([1, 2, 3, 4, 5, 6, 7]);
  const frame = encodeCamouflageFrame(payload);
  assert.ok(frame.length > payload.length + 8);
  assert.deepEqual(decodeCamouflageFrame(frame), payload);
});

test('rejects malformed frames and invalid payload lengths', () => {
  assert.equal(decodeCamouflageFrame(Buffer.from('bad')), null);
  assert.throws(() => encodeCamouflageFrame(Buffer.alloc(0)), /payload/);
  assert.throws(() => encodeCamouflageFrame(Buffer.alloc(4097)), /payload/);
  const good = encodeCamouflageFrame(Buffer.from([1, 2, 3]));
  const broken = Buffer.from(good);
  broken[6] = 0xff;
  broken[7] = 0xff;
  assert.equal(decodeCamouflageFrame(broken), null);
});

test('ignores padding control frames', () => {
  const frame = Buffer.from([0x4c,0x55,0x4e,0x41,1,2,0,0]);
  assert.equal(decodeCamouflageFrame(frame), null);
});
