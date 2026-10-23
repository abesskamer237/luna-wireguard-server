import test from 'node:test';
import assert from 'node:assert/strict';
import { listTransportCapabilities } from '../transports.mjs';

test('only exposes a transport as available when an end-to-end implementation exists', () => {
  const modes = listTransportCapabilities();
  assert.deepEqual(modes.map((mode) => mode.id), ['wireguard-udp', 'wss', 'camouflage', 'slowdns']);
  assert.equal(modes.find((mode) => mode.id === 'wireguard-udp').available, true);
  assert.equal(modes.find((mode) => mode.id === 'wss').available, false);
  assert.equal(modes.find((mode) => mode.id === 'camouflage').available, false);
  assert.equal(modes.find((mode) => mode.id === 'slowdns').available, false);
});

test('returns fresh capability objects so client changes cannot mutate server status', () => {
  const first = listTransportCapabilities();
  first[0].available = false;
  assert.equal(listTransportCapabilities()[0].available, true);
});
