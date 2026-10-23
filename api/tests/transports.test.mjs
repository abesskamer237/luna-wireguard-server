import test from 'node:test';
import assert from 'node:assert/strict';
import { getWssTransportEndpoints, listTransportCapabilities } from '../transports.mjs';

test('requires a configured WSS URL on the expected route', () => {
  assert.equal(getWssTransportEndpoints(''), null);
  assert.equal(getWssTransportEndpoints('https://api.example.com/v1/tunnel/wss'), null);
  assert.equal(getWssTransportEndpoints('wss://user:pass@api.example.com/v1/tunnel/wss'), null);
  assert.equal(getWssTransportEndpoints('wss://api.example.com/v1/tunnel/wss?token=unsafe'), null);
  assert.equal(getWssTransportEndpoints('wss://api.example.com/other'), null);
});

test('derives the independent camouflage route from the configured WSS origin', () => {
  assert.deepEqual(getWssTransportEndpoints('wss://api.example.com/v1/tunnel/wss'), {
    wss: 'wss://api.example.com/v1/tunnel/wss',
    camouflage: 'wss://api.example.com/v1/tunnel/camouflage'
  });
});

test('only enables WSS and camouflage when the transport endpoint is configured', () => {
  const previous = process.env.WSS_PUBLIC_URL;
  delete process.env.WSS_PUBLIC_URL;
  try {
    const modes = listTransportCapabilities();
    assert.equal(modes.find((mode) => mode.id === 'wireguard-udp').available, true);
    assert.equal(modes.find((mode) => mode.id === 'wss').available, false);
    assert.equal(modes.find((mode) => mode.id === 'camouflage').available, false);
    assert.equal(modes.find((mode) => mode.id === 'slowdns').available, false);
    process.env.WSS_PUBLIC_URL = 'wss://api.example.com/v1/tunnel/wss';
    const configured = listTransportCapabilities();
    assert.equal(configured.find((mode) => mode.id === 'wss').available, true);
    assert.equal(configured.find((mode) => mode.id === 'camouflage').available, true);
    assert.equal(configured.find((mode) => mode.id === 'slowdns').available, false);
  } finally {
    if (previous === undefined) delete process.env.WSS_PUBLIC_URL;
    else process.env.WSS_PUBLIC_URL = previous;
  }
});
