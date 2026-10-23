# LUNA WireGuard Control Server

Clean-room LUNA WireGuard service with an administrative peer-provisioning API and short-lived, one-time enrollment codes. Its standard mode is WireGuard over UDP; optional experimental WSS and LUNA padded-WSS relay modes encapsulate the same standard WireGuard datagrams and are not compatible with Geny's proprietary transport.

## Requirements

- Ubuntu/Debian server with WireGuard tools installed and a configured wg0 interface.
- Node.js 20 or newer (CI tests on Node 22).
- A valid server public key and endpoint configured in /etc/luna-wireguard-api.env.

## Install and protect the API

Review the scripts and configuration examples before running them. The API installer runs the API as root because it updates WireGuard configuration. Keep it bound to 127.0.0.1 and expose it only through a properly authenticated TLS reverse proxy. Do not expose the administrative API directly to the Internet.

Set a random ADMIN_TOKEN of at least 32 characters in the protected service environment. Store it securely. Never embed it in Android or commit it to Git. If you deploy through your own install script, ensure it generates this secret and restricts the environment file to root.

## API routes

- GET /health — basic process health (no authentication).
- GET /v1/transports — public capability list. WireGuard UDP is stable; WSS and LUNA's padded WebSocket mode are experimental when `WSS_PUBLIC_URL` is configured; SlowDNS remains unavailable. See `docs/transports.md`.
- POST /v1/subscriptions — **admin only**. JSON: {"customerId":"client-01","plan":"Mensuel","amountXaf":2500,"currency":"XAF","durationDays":30,"maxDevices":2}. Creates a pending-payment subscription.
- GET /v1/subscriptions — **admin only**. Lists subscriptions; payment references are masked.
- POST /v1/subscriptions/:id/confirm-payment — **admin only**, for manual confirmation after checking the actual payment in the provider dashboard. JSON: {"paymentReference":"provider-reference"}.
- POST /v1/payments/monetbil/checkout — public checkout creation for a pending subscription. JSON: {"subscriptionId":"sub_...","phone":"2376XXXXXXXX"}; returns a Monetbil payment URL. Requires MONETBIL_SERVICE_KEY and HTTPS PUBLIC_API_BASE_URL.
- GET/POST /v1/webhooks/monetbil — verifies Monetbil's signed notification using MONETBIL_SERVICE_SECRET, checks service, status, amount, XAF currency and order reference, then activates the subscription. Configure the same notification URL in Monetbil.
- POST /v1/webhooks/payment — internal canonical HMAC-SHA256 webhook fallback; requires PAYMENT_WEBHOOK_SECRET and X-Abess-Signature.
- POST /v1/enrollment-tokens — **admin only**. JSON: {"name":"phone-01","subscriptionId":"sub_...","ttlSeconds":300}. A paid, active, unexpired subscription is required; device-limit checks happen before issuing the code. Allowed code lifetime is 60–3600 seconds. The code is returned only once; only its SHA-256 hash is stored.
- POST /v1/enroll — public client endpoint, intended to be exposed only through HTTPS. JSON: {"token":"<one-time-code>"}. Consumes the code and returns a WireGuard configuration. Replays, expired codes, and invalid codes are rejected.
- POST /v1/peers — **admin only**. JSON: {"name":"device-01"}. Creates a peer and returns its client configuration.
- DELETE /v1/peers/:name — **admin only**. Revokes a managed peer.

Admin routes require Authorization: Bearer <ADMIN_TOKEN>. The Android app must use only the short-lived enrollment code; never give the admin token to a client.

## Monetbil configuration

Set these in the protected `/etc/luna-wireguard-api.env` file (never commit credentials):

- `MONETBIL_SERVICE_KEY` — service key from the Monetbil dashboard.
- `MONETBIL_SERVICE_SECRET` — service secret used to verify Monetbil notification signatures.
- `PUBLIC_API_BASE_URL` — public HTTPS API origin, for example `https://api.pagnol.xyz`.
- `WSS_PUBLIC_URL` — optional WSS entry URL, for example `wss://api.pagnol.xyz/v1/tunnel/wss`. Configure the TLS reverse proxy to forward WebSocket upgrades to the API's local listener. It enables experimental WSS and padded Camouflage metadata for newly provisioned peers.
- `WSS_WG_PORT` — local WireGuard UDP listener port forwarded by the WSS relay (default `51820`); the destination address is fixed to `127.0.0.1`.
- `MAX_WSS_SESSIONS` — optional relay session cap (default `500`).

The checkout uses Monetbil Widget API v2.1 for Cameroon/XAF. Monetbil's signed callback activates a subscription only if the service key, signature, success status, order reference, amount and currency match. Test with Monetbil sandbox credentials first. The Android client still needs a customer-facing plan/account flow; checkout currently requires a pending subscription ID created through the admin API.

## Deployment

A GitHub Actions deployment workflow can deploy this repository to your VPS after the SSH connection secrets are configured. See `.github/workflows/deploy-vps.yml`.

## Limitations before production

The enrollment token is single-use and time-limited, but this remains a prototype. Before public launch, connect and test a provider-specific payment adapter, add rate limiting, audit logs, monitoring, per-customer authentication, and robust secret/key lifecycle management. A peer's private key is generated on the server and returned once to the enrolling client; protect responses and device storage.

## Tests

    cd api
    npm test
    node --check server.mjs
    node --check peer-config.mjs
    node --check enrollment-token.mjs
    node --check access-control.mjs
    node --check payment-webhook.mjs
    node --check monetbil.mjs

GitHub Actions runs the test suite and syntax checks on pushes and pull requests.

## GitHub Actions deployment to Contabo

The workflow `.github/workflows/deploy-vps.yml` tests the API on every push and deploys on pushes to `main` only after tests pass.

Configure these repository secrets under **Settings → Secrets and variables → Actions**:

- `VPS_HOST`: public IP address of the VPS.
- `VPS_USER`: SSH login, normally `root` for this first-install script.
- `VPS_SSH_KEY`: **recommended**. The private OpenSSH key used by GitHub Actions; store it only as a repository secret, never in Git.
- `VPS_PASSWORD`: optional fallback SSH password. Never write it in the repository or workflow.
- `VPS_PORT`: optional SSH port (default 22).

Automatic deployment is disabled until you explicitly enable the repository variable `ENABLE_VPS_DEPLOY` with the value `true` under **Settings → Secrets and variables → Actions → Variables**. This prevents a push from attempting SSH before you have configured the credentials.

This workflow is prepared for the API domain `api.pagnol.xyz`. Before enabling deployment, create an A record for `api.pagnol.xyz` pointing to the VPS public IPv4 address and allow inbound TCP 80/443 plus UDP 51820 in the Contabo firewall. The workflow validates DNS against the target VPS, configures Caddy for automatic HTTPS, and defaults `PUBLIC_API_BASE_URL` to `https://api.pagnol.xyz` and `WSS_PUBLIC_URL` to `wss://api.pagnol.xyz/v1/tunnel/wss`. Only enable deployment after SSH authentication works.

The workflow requires root SSH access because the installer creates a systemd service and writes protected files. Prefer `VPS_SSH_KEY`: install its matching public key in `/root/.ssh/authorized_keys` on the VPS, then save the private key contents as the repository secret. Do not send the private key in chat. `VPS_PASSWORD` remains as a fallback, but the previous deployment logs showed SSH password authentication being rejected. Keep GitHub secrets protected and enable required reviewers/environment protection for production where available.

Before the first deployment, the VPS must have Node.js 22+, Git, WireGuard installed, and a valid `/etc/wireguard/wg0.conf`; the `wg0` interface must be active or startable. Open UDP/51820 and correct the outbound interface in the WireGuard configuration. The installer creates `/etc/luna-wireguard-api.env` on first run. Configure `SERVER_ENDPOINT`, `MONETBIL_SERVICE_KEY`, `MONETBIL_SERVICE_SECRET`, and `PUBLIC_API_BASE_URL` in that root-only file, then restart `luna-wireguard-api`. These values must never be added to GitHub code. The deployment workflow does not provision the WireGuard network/firewall from scratch and will fail clearly if prerequisites are missing.

Check deployment status under the repository **Actions** tab. A successful SSH deploy checks `systemd` and the local `/health` endpoint; it does not replace end-to-end WireGuard handshake and Monetbil sandbox tests.


Deployment workflow last prepared on 2026-10-23. Deployment is gated by the repository variable `ENABLE_VPS_DEPLOY=true`; review the run result in Actions before treating a VPS rollout as complete.
