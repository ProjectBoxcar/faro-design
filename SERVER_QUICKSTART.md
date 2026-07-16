# Server Quickstart Guide

Start the Brand App development server with access from localhost, local network, and Tailscale.

## Quick Start (Recommended)

### Option 1: Batch File (.bat) - Easiest
Double-click `start-server.bat` from the Brand App root directory, or run:

```cmd
cd "F:\Brand App"
start-server.bat
```

### Option 2: PowerShell Script (.ps1) - More Features
Run the PowerShell quickstart script from the Brand App root directory:

```powershell
cd "F:\Brand App"
.\start-server.ps1
```

Both scripts will:
- Install dependencies if needed
- Run database migrations if needed
- Display all available access URLs
- Start the development server on port 3100

*The PowerShell version automatically detects and displays your local network and Tailscale IPs.*

## Manual Start

If you prefer manual control:

```powershell
cd "F:\Brand App\app"
npm install              # First time only
npm run db:migrate       # First time only
npm run dev              # Start server
```

## Access URLs

Once running, the app will be available at:

### Localhost
- **http://localhost:3100**
- **http://127.0.0.1:3100**

### Local Network (Same Wi-Fi)
Find your machine's local IP and access from other devices:
- **http://YOUR_LOCAL_IP:3100** (e.g., http://192.168.1.15:3100)

To find your local IP:
```powershell
ipconfig
```
Look for "IPv4 Address" under your active network adapter.

### Tailscale (VPN)
If Tailscale is running, access from any device on your Tailnet:
- **http://YOUR_TAILSCALE_IP:3100** (e.g., http://100.x.x.x:3100)

To find your Tailscale IP:
```powershell
tailscale ip -4
```

Or check the Tailscale system tray/menu bar app.

## Configuration

Network access is configured in `app/next.config.ts`. The app accepts connections from:

- ✅ Localhost (127.0.0.1)
- ✅ Local networks (192.168.x.x, 10.x.x.x, 172.16.x.x)
- ✅ Tailscale VPN (100.x.x.x)
- ✅ Other private networks

No configuration changes needed for standard setups.

## File Association Issues

If `.bat` or `.ps1` files open in Typora instead of running:

### For .bat files:
1. Right-click `start-server.bat`
2. Select "Open with" → "Choose another app"
3. Select "Command Prompt" or "Windows Terminal"
4. Check "Always use this app to open .bat files"
5. Click OK

### For .ps1 files:
1. Right-click `start-server.ps1`
2. Select "Properties"
3. If "Opens with: Typora", click "Change"
4. Select "Windows PowerShell" or "Windows Terminal"
5. Click OK

### Alternative: Run from Command Prompt
```cmd
cd "F:\Brand App"
start-server.bat
```

Or for PowerShell:
```powershell
cd "F:\Brand App"
powershell -ExecutionPolicy Bypass -File start-server.ps1
```

## Troubleshooting

### Can't access from other devices
1. **Check Windows Firewall**: Allow Node.js/Next.js through firewall
   ```powershell
   # Allow Node.js through Windows Firewall
   New-NetFirewallRule -DisplayName "Node.js Server" -Direction Inbound -LocalPort 3100 -Protocol TCP -Action Allow
   ```

2. **Verify Tailscale is running**: 
   ```powershell
   tailscale status
   ```

3. **Check if port 3100 is in use**:
   ```powershell
   netstat -ano | findstr :3100
   ```

### Tailscale not detected
- Ensure Tailscale is installed and running
- Check that you're logged into your Tailnet
- Verify your machine has a Tailscale IP assigned

### Database errors
- Run `npm run db:migrate` to create/update the schema
- Check that `app/data/` directory exists and is writable

## Environment Setup

Ensure your `ANTHROPIC_API_KEY` is set in `app/.env.local`:

```env
ANTHROPIC_API_KEY=your_api_key_here
```

Without this key, the app will work for capture and evaluation, but AI draft features will be disabled.

## Production Mode

For better performance when sharing with others:

```powershell
cd "F:\Brand App\app"
npm run build
npm run start
```

This runs the optimized production build instead of the development server.