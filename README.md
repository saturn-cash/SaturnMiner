# Saturn Miner

Desktop miner and Bitaxe controller for [Saturn Core](https://github.com/saturn-cash/saturn-core).
Every screen is a place in the Saturn system: the app flies you between Saturn's rings, Titan, Mimas,
Enceladus and Iapetus while it shows your hashrate, wallet, network and hardware.

- **Windows, macOS, Linux** desktop app (Tauri 2 + Next.js)
- **Bitaxe control** over AxeOS: live stats, one-click "point at Saturn" pool, clock presets, fan, restart
- Real-time 3D Saturn system with all 23 named moons, synthesized sound, liquid-glass UI

> **Status:** the CPU miner is **simulated** in this release (the UI is complete; the native mining
> engine is not built yet). Bitaxe control is real and talks to devices on your local network.

## Download

Grab the installer for your computer from the [Releases](../../releases) page:

| Computer | File |
| --- | --- |
| Windows | `Saturn Miner_x.y.z_x64_en-US.msi` or `…_x64-setup.exe` |
| Mac with Apple silicon (M1–M4) | `Saturn Miner_x.y.z_aarch64.dmg` |
| Mac with Intel | `Saturn Miner_x.y.z_x64.dmg` |
| Linux (any distro) | `saturn-miner_x.y.z_amd64.AppImage` |
| Ubuntu / Debian | `saturn-miner_x.y.z_amd64.deb` |
| Fedora / RHEL | `saturn-miner-x.y.z-1.x86_64.rpm` |

**macOS note:** until the app is signed with an Apple Developer certificate, macOS will say it
"can't be opened". Right-click the app → **Open** → **Open** the first time.

## Develop

Requirements: [Node.js LTS](https://nodejs.org), [pnpm](https://pnpm.io/installation), and for the desktop
app [Rust](https://rustup.rs) plus the [Tauri prerequisites](https://v2.tauri.app/start/prerequisites/)
for your OS.

```bash
pnpm install
pnpm dev            # browser preview at http://localhost:3000 (simulated data, demo Bitaxe)
pnpm desktop        # desktop app with hot reload
pnpm desktop:build  # installers for this OS → src-tauri/target/release/bundle/
```

## Release

GitHub Actions builds every platform for you (`.github/workflows/release.yml`):

1. Bump the version in `package.json`, `src-tauri/tauri.conf.json` and `src-tauri/Cargo.toml`.
2. Commit, then tag and push:
   ```bash
   git tag v0.2.0
   git push origin main v0.2.0
   ```
3. Wait for the four build jobs (Windows, Mac ARM, Mac Intel, Linux) under **Actions**.
4. Open **Releases**, check the draft, and press **Publish release**.

If a job fails with "Resource not accessible by integration", enable
**Settings → Actions → General → Workflow permissions → Read and write permissions**.

## Project layout

```
app/, components/, lib/   Next.js frontend (exported as static files for Tauri)
  components/cosmos/      the 3D Saturn system (react-three-fiber + custom shaders)
  lib/cosmos/moons.ts     every moon's orbit, size and terrain
  lib/hardware/           Bitaxe (AxeOS) client, fleet store, demo device
  lib/audio/sound.ts      synthesized soundscape
  lib/miner/              miner state, simulation, Tauri bridge
src-tauri/                desktop shell (Rust)
  src/lib.rs              registers commands; backend_info reports what's native
  src/bitaxe.rs           LAN-only AxeOS proxy + network scan
```

## Chain defaults

Matches Saturn Core mainnet: RPC `127.0.0.1:8332`, P2P port `9999`, bech32 addresses `sat1…`,
50 SAT block reward, 10-minute blocks, coinbase maturity 100.
