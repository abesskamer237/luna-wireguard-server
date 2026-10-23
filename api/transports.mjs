/**
 * Public transport capabilities. "Available" means the end-to-end client and
 * server data path is implemented and tested, not merely that the UI knows a name.
 */
const TRANSPORTS = Object.freeze([
  Object.freeze({
    id: 'wireguard-udp',
    label: 'WireGuard UDP',
    available: true,
    status: 'stable',
    description: 'WireGuard standard over UDP'
  }),
  Object.freeze({
    id: 'wss',
    label: 'WSS sécurisé',
    available: false,
    status: 'not-implemented',
    description: 'Requires a custom wireguard-go Bind, Android socket protection, and a TLS WebSocket-to-UDP relay'
  }),
  Object.freeze({
    id: 'camouflage',
    label: 'Camouflage',
    available: false,
    status: 'not-implemented',
    description: 'Requires a separately specified and tested framing/transport pair'
  }),
  Object.freeze({
    id: 'slowdns',
    label: 'SlowDNS',
    available: false,
    status: 'not-implemented',
    description: 'Requires a DNS tunnel client/resolver pair with fragmentation, sequencing, rate limits, and abuse controls'
  })
]);

export function listTransportCapabilities() {
  return TRANSPORTS.map((transport) => ({ ...transport }));
}
