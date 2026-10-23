/**
 * Transport endpoint configuration.
 * WSS_PUBLIC_URL must be a wss:// URL ending in /v1/tunnel/wss.
 * Camouflage is this project's own WSS framing with variable padding; it is
 * not Geny's proprietary protocol and is not meant to imply deep traffic obfuscation.
 */
export function getWssTransportEndpoints(raw = process.env.WSS_PUBLIC_URL) {
  if (typeof raw !== 'string' || !raw.trim()) return null;
  try {
    const wss = new URL(raw.trim());
    if (wss.protocol !== 'wss:' ||
        !wss.hostname ||
        wss.username || wss.password ||
        wss.search || wss.hash ||
        !wss.pathname.endsWith('/v1/tunnel/wss')) return null;
    const camouflage = new URL(wss.toString());
    camouflage.pathname = wss.pathname.replace(/\/wss$/, '/camouflage');
    return { wss: wss.toString(), camouflage: camouflage.toString() };
  } catch {
    return null;
  }
}

/** "available" is configuration-backed, and clients still verify they received a peer token. */
export function listTransportCapabilities() {
  const wssConfigured = getWssTransportEndpoints() !== null;
  return [
    {
      id: 'wireguard-udp',
      label: 'WireGuard UDP',
      available: true,
      status: 'stable',
      description: 'WireGuard standard over UDP'
    },
    {
      id: 'wss',
      label: 'WSS sécurisé',
      available: wssConfigured,
      status: wssConfigured ? 'experimental' : 'not-configured',
      description: wssConfigured
        ? 'WireGuard datagrams relayed over authenticated TLS WebSocket'
        : 'Set WSS_PUBLIC_URL to enable the WSS relay'
    },
    {
      id: 'camouflage',
      label: 'Camouflage',
      available: wssConfigured,
      status: wssConfigured ? 'experimental' : 'not-configured',
      description: wssConfigured
        ? 'LUNA WSS framing with variable padding; not Geny-compatible'
        : 'Requires the WSS relay to be configured'
    },
    {
      id: 'slowdns',
      label: 'SlowDNS',
      available: false,
      status: 'not-implemented',
      description: 'Requires a separate DNS tunnel client/resolver with sequencing, fragmentation, rate limits, and abuse controls'
    }
  ];
}
