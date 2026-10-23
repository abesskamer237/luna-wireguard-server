# LUNA transport status

## Current support

| Mode | End-to-end status | Reason |
|---|---|---|
| WireGuard over UDP | Available | Uses the standard WireGuard Android userspace engine and the configured `wg0` server |
| WSS over TLS | Not enabled | The current Android `GoBackend` uses its standard UDP bind. A functioning WSS mode needs a custom `wireguard-go conn.Bind`, VpnService socket protection, and a server WebSocket-to-local-UDP relay |
| Camouflage | Not enabled | No original framing/handshake specification or paired client/server implementation is present yet |
| SlowDNS | Not enabled | Needs a DNS tunnel protocol, resolver, fragment/reassembly, loss recovery, congestion/rate limits, and abuse controls |

The mobile settings page may display these modes as planned options, but it must not start a tunnel when a mode is not available. The public `GET /v1/transports` endpoint is the authoritative capability list. This avoids confusing a UI choice with a functional data path.

## Independent design boundary

LUNA may implement its own documented transport protocols, but this repository does not contain enough information to reproduce Geny's proprietary wire format, session proofs, relay state, or production server. A standard WireGuard `.conf` is not a configuration for Geny's custom transports. Do not label an independently developed WSS relay "Geny-compatible" without a protocol specification and interoperability tests.

## WSS implementation checklist

1. Define an authenticated, versioned WebSocket relay protocol that forwards only bounded binary WireGuard datagrams to a fixed local WireGuard UDP socket; never accept client-supplied UDP destinations.
2. Add per-peer transport credentials, token hashing and rotation, strict frame sizes, connection/packet rate limits, timeouts, and structured audit/abuse counters.
3. Build a custom Android WireGuard userspace `conn.Bind` and ensure transport sockets are protected by Android `VpnService.protect()` to avoid routing loops.
4. Integrate the bind in the native Android engine and include ABI-specific build/release workflows.
5. Test handshake and bidirectional traffic, reconnects, NAT timeouts, packet loss, MTU, DNS, battery/background restrictions, and revocation.
6. Only flip `available` to true after automated tests plus a real Android-to-VPS handshake and traffic test pass.

## SlowDNS implementation checklist

SlowDNS should be a separate transport rather than a label alias for WSS. It needs explicit DNS query/response framing, server-owned zone/resolver configuration, sequencing, fragmentation, congestion management, amplification prevention, and strict rate limits. Throughput and latency will be materially worse than UDP or WSS; the UI must say so.

