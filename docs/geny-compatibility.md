# Geny compatibility assessment

The supplied APK contains a custom native engine and string-level evidence for transport selector `wss`, `camouflage`, or `slowdns`, plus Geny-specific headers. This does not disclose enough framing, cryptographic handshake, relay state machine, authentication proof calculation, or server behavior to recreate a compatible endpoint.

This server implements standard WireGuard over UDP only. It is deliberately not presented as Geny-compatible. Obtain an authorized protocol specification or build a new independently designed transport/client-server pair. Wrapping UDP in WebSocket does not by itself make it compatible with the proprietary server.


## What the supplied `.conf` tells us

The sample client file follows the ordinary WireGuard profile format: an `[Interface]` with a private key, one client address, DNS and MTU, plus a `[Peer]` with a server public key, endpoint, allowed routes and keepalive. Its `10.231.0.x/32` address and `10.231.0.1` DNS are consistent with a separate peer-sharing subnet; an endpoint in `192.168.x.x` is a private address and is reachable only where that private network is routed. The `.conf` alone does not prove that Internet forwarding, DNS forwarding, or a remote production endpoint is working.

LUNA's implementation keeps the same portable WireGuard `.conf` interoperability but uses its own server configuration and address pool. A single-use LUNA enrollment URI can transfer a short-lived enrollment code between devices without putting any WireGuard private key in a link. It is not a drop-in replica of Geny's local Wi-Fi/Wi-Fi Direct sharing server.

## Explicit boundaries

- Implemented on the LUNA baseline: standard WireGuard/UDP profiles, official Android WireGuard engine, one-time enrollment tokens, profile export/import, and server-side peer revocation.
- Not implemented by the provided source archive: Geny's complete custom WSS/camouflage/SlowDNS protocol, its production relay/server behavior, or the complete local sharing/forwarding stack.
- The provided sample `.conf` contains a client private key. If it was shared outside the owner's trusted environment, revoke that peer or regenerate the profile before reuse.
