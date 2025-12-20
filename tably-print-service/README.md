# Tably Print Service

A small local Node.js + TypeScript service that talks to receipt printers on your LAN. Version 1 supports ESC/POS over raw TCP (Epson LAN models and compatible). StarPRNT is stubbed and will be added later.

## Why a local service and not browser printing?

- Browsers cannot reliably open raw TCP sockets to port 9100 (printer port) due to security restrictions.
- ESC/POS requires sending binary command bytes directly to the device. This is a poor fit for browser APIs and CORS.
- A tiny local service avoids driver install complexities while keeping the POS app simple and secure.

## Architecture

- `src/index.ts` — Express app bootstrap (port 4010), health route, error handler.
- `src/routes/print.ts` — `/print/test` endpoint that accepts a printer definition and dispatches to the driver.
- `src/drivers/escposTcp.ts` — ESC/POS over TCP driver using Node's `net.Socket`. Sends init, formatting, text, and a full cut.
- `src/drivers/starprnt.ts` — Placeholder that throws `STARPRNT_NOT_SUPPORTED_YET`.

## API

- GET `/health` → `{ ok: true }`
- POST `/print/test`
  ```json
  {
    "printer": {
      "driver": "ESC_POS_TCP" | "STARPRNT",
      "host": "192.168.2.168",
      "port": 9100
    }
  }
  ```

If `driver` is `ESC_POS_TCP`, a test receipt is printed with:
- Title: `Tably — Testbon`
- Lines: protocol OK, target `IP:port`, and the current date
- A full cut at the end

If `driver` is `STARPRNT`, the service returns an error `{ ok: false, error: "STARPRNT_NOT_SUPPORTED_YET" }`.

## Development

```bash
# Install deps
npm install

# Run in dev (watch)
npm run dev

# Type-check
npm run typecheck

# Build for production
npm run build

# Start built server
npm start
```

The server listens on `http://localhost:4010`.

## Example cURL

```bash
curl -X POST http://localhost:4010/print/test \
  -H "Content-Type: application/json" \
  -d '{
    "printer": {"driver":"ESC_POS_TCP","host":"192.168.2.168","port":9100}
  }'
```

## Current status
- Epson/ESC/POS over TCP works now.
- StarPRNT is planned; the route will throw a clear error until native integration lands.
