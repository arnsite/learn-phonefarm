# PhoneFarm Bot Controller

An Electron-based desktop application for managing and controlling Android bot automation across multiple devices.

## Features

- Multi-device Android bot management via ADB
- Real-time device monitoring and control
- User-friendly GUI interface
- Automated bot execution and coordination

## Prerequisites

- Node.js (v16 or higher)
- ADB (Android Debug Bridge) installed at `C:/adb/`
- Android devices with USB debugging enabled

## Installation

```bash
npm install
```

## Usage

### Development Mode

```bash
npm start
```

### Build

Build for Windows:

```bash
npm run build:win
```

Build for all platforms:

```bash
npm run build
```

## Project Structure

```
phonefarm/
├── src/
│   ├── main/          # Main process (Electron)
│   ├── renderer/      # Renderer process (UI)
│   └── shared/        # Shared utilities
├── bot.js             # Bot automation logic
├── adb.js             # ADB interface
└── package.json
```

## License

ISC
