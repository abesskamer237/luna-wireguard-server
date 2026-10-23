#!/usr/bin/env bash
set -euo pipefail
if [[ ${EUID} -ne 0 ]]; then echo "Run with sudo."; exit 1; fi

export DEBIAN_FRONTEND=noninteractive
apt-get update
apt-get install -y wireguard wireguard-tools iptables curl openssl

umask 077
mkdir -p /etc/wireguard
if [[ ! -f /etc/wireguard/server_private.key ]]; then
  wg genkey | tee /etc/wireguard/server_private.key | wg pubkey > /etc/wireguard/server_public.key
fi
chmod 600 /etc/wireguard/server_private.key /etc/wireguard/server_public.key

if [[ ! -f /etc/wireguard/wg0.conf ]]; then
  # Detect the VPS's real outbound interface; many providers do not call it eth0.
  WAN_IF="$(ip -o -4 route get 1.1.1.1 | awk '{for (i=1;i<=NF;i++) if ($i=="dev") {print $(i+1); exit}}')"
  if [[ -z "$WAN_IF" ]]; then
    echo "Cannot determine outbound network interface. Refusing to create wg0.conf."
    exit 1
  fi
  cp "$(dirname "$0")/../deploy/wg0.conf.example" /etc/wireguard/wg0.conf
  sed -i "s|REPLACE_WITH_SERVER_PRIVATE_KEY|$(cat /etc/wireguard/server_private.key)|" /etc/wireguard/wg0.conf
  sed -i "s| -o eth0 | -o ${WAN_IF} |g" /etc/wireguard/wg0.conf
  chmod 600 /etc/wireguard/wg0.conf
fi

# Enable IPv4 forwarding for WireGuard clients and persist it across reboots.
cat >/etc/sysctl.d/99-luna-wireguard.conf <<'SYSCTL'
net.ipv4.ip_forward=1
SYSCTL
sysctl -w net.ipv4.ip_forward=1 >/dev/null

# If UFW is active, allow WireGuard's UDP listener without changing other rules.
if command -v ufw >/dev/null 2>&1 && ufw status 2>/dev/null | grep -qi 'Status: active'; then
  ufw allow 51820/udp
fi

systemctl enable --now wg-quick@wg0
echo "WireGuard server public key:"
cat /etc/wireguard/server_public.key
echo "wg0 is enabled. Ensure UDP/51820 is also allowed in the VPS provider firewall."
