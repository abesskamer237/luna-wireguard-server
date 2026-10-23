# LUNA transport status

## Implemented in this branch

| Mode | Status | Data path |
|---|---|---|
| WireGuard over UDP | Stable | Official Android WireGuard userspace backend to the server's wg0 UDP listener |
| WSS over TLS | Experimental | The Android client redirects the WireGuard backend's encrypted UDP datagrams to a loopback UDP socket; an authenticated WSS relay forwards those datagrams only to the fixed local WireGuard UDP port |
| Camouflage | Experimental | LUNA's own binary WSS frame with version/type/length and 12–96 bytes of random padding around the standard WireGuard datagram |
| SlowDNS | Not implemented | Requires a separate DNS tunnel client and authoritative/resolver-side server |

WSS and Camouflage are enabled for a peer only when the server is configured with `WSS_PUBLIC_URL`. Peer provisioning returns a separate 256-bit URL-safe credential; only its SHA-256 hash is stored in the server state. The client receives that credential once with the enrolled profile. Deleting the peer closes associated WSS sessions.

## Enable the WSS relay

Configure the server behind an HTTPS reverse proxy that forwards WebSocket upgrades to the local API listener. Then edit the root-only file `/etc/luna-wireguard-api.env`:

```dotenv
WSS_PUBLIC_URL=wss://api.pagnol.xyz/v1/tunnel/wss
WSS_WG_PORT=51820
MAX_WSS_SESSIONS=500
```

Use the actual public host and TLS certificate for your server. The relay does not listen on a separate public port; Caddy/Nginx must proxy the configured WSS path to the API's local HTTP listener and preserve the WebSocket Upgrade headers. The relay forwards packets only to `127.0.0.1:WSS_WG_PORT`; it never accepts a destination host or port from clients.

After updating the environment file, restart the service:

```bash
sudo systemctl restart luna-wireguard-api
curl --fail --silent --show-error https://api.pagnol.xyz/v1/transports
```

The returned capability list marks WSS and Camouflage as available only when `WSS_PUBLIC_URL` passes validation. Newly enrolled profiles will contain one-time transport credentials. Profiles created before WSS is enabled do not have them; issue a new enrollment code/profile.

## Security and limits

- The WebSocket relay requires a per-peer Bearer credential; it does not accept client-supplied UDP destinations.
- Only binary frames are forwarded. Datagrams are size-limited to 4096 bytes, connections are capped, and the relay applies a per-session packet-rate limit.
- Peer revocation and subscription expiry close active WSS sessions. The API should remain bound to loopback behind TLS; never expose the administrative API directly.
- Camouflage is an original LUNA frame-and-padding layer. It is not a claim of undetectable traffic, is not Geny's proprietary protocol, and has not been interoperability-tested against Geny.
- WSS and Camouflage must still pass real Android-to-VPS handshake, bidirectional traffic, MTU, DNS, network-change, battery/background, and revocation tests before being treated as production-ready.
- SlowDNS remains unavailable until a DNS tunnel protocol, resolver, sequencing/fragmentation, loss recovery and abuse controls are built and tested.
