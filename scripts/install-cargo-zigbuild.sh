#!/bin/sh
# Installs the pinned cargo-zigbuild used by every cross-compiled target.
#
# The version lives here and nowhere else. ci.yml and release.yml both cross-compile
# the musl and aarch64 targets, so a version skew between the two would mean the
# artifact CI proved is not the artifact the release publishes.
#
# `cargo install cargo-zigbuild` rebuilds the tool from source on every run, which
# costs minutes on the critical path of the slowest jobs. The upstream release ships
# prebuilt binaries, so prefer those and verify them against a pinned checksum.
# Anything unexpected - an unsupported platform, a missing tool, a failed download -
# falls back to building from source, so the worst case is the previous behaviour.
set -eu

VERSION='0.23.4'
# sha256 of cargo-zigbuild-x86_64-unknown-linux-musl.tar.xz from the v0.23.4 release.
# Update together with VERSION; a mismatch is a hard failure, never a fallback.
CHECKSUM_LINUX_X86_64='9e3cf73485edbd45905c8aadbc0fdf869c7ddc3848f0c898229f2680db52e44b'

cargo_bin="${CARGO_HOME:-$HOME/.cargo}/bin"

install_from_source() {
  echo "Building cargo-zigbuild $VERSION from source"
  cargo install cargo-zigbuild --version "$VERSION" --locked
  exit $?
}

installed_version() {
  command -v cargo-zigbuild >/dev/null 2>&1 || return 1
  cargo-zigbuild --version 2>/dev/null | awk '{ print $2 }'
}

if [ "$(installed_version || true)" = "$VERSION" ]; then
  echo "cargo-zigbuild $VERSION already installed"
  exit 0
fi

# The musl build is statically linked, so it runs on any x86_64 Linux image.
case "$(uname -s)-$(uname -m)" in
  Linux-x86_64)
    asset='cargo-zigbuild-x86_64-unknown-linux-musl'
    checksum="$CHECKSUM_LINUX_X86_64"
    ;;
  *)
    echo "No pinned prebuilt cargo-zigbuild for $(uname -s)-$(uname -m)"
    install_from_source
    ;;
esac

for tool in curl sha256sum tar; do
  command -v "$tool" >/dev/null 2>&1 || {
    echo "$tool is unavailable"
    install_from_source
  }
done

workdir="$(mktemp -d)"
trap 'rm -rf "$workdir"' EXIT

tarball="${asset}.tar.xz"
url="https://github.com/rust-cross/cargo-zigbuild/releases/download/v${VERSION}/${tarball}"

if ! curl -sSfL --retry 3 --retry-delay 2 -o "$workdir/$tarball" "$url"; then
  echo "Could not download $url"
  install_from_source
fi

# A bad checksum means the pin and the artifact disagree. That is not a slow
# network, so do not paper over it by building from source.
echo "${checksum}  ${workdir}/${tarball}" | sha256sum -c - >/dev/null || {
  echo "Checksum mismatch for $tarball; refusing to install" >&2
  exit 1
}

if ! tar -xJf "$workdir/$tarball" -C "$workdir"; then
  echo "Could not extract $tarball"
  install_from_source
fi

mkdir -p "$cargo_bin"
install -m 0755 "$workdir/${asset}/cargo-zigbuild" "$cargo_bin/cargo-zigbuild"
echo "Installed prebuilt cargo-zigbuild $VERSION into $cargo_bin"
