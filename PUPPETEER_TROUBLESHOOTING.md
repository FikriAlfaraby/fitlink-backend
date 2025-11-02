# Puppeteer Troubleshooting Guide

## Issue: Chrome Segmentation Fault

Chrome is crashing with a segmentation fault, which commonly happens in:
- WSL (Windows Subsystem for Linux)
- Docker containers without proper configuration
- Systems missing required libraries

## Solutions

### Solution 1: Use html-pdf-node (Recommended for WSL)

`html-pdf-node` uses a more stable Chrome binary that works better in WSL environments.

**Install:**
```bash
npm install html-pdf-node
```

**Update service to use html-pdf-node** - see the alternative implementation below.

### Solution 2: Install Chrome Dependencies (Linux)

If you're on a native Linux system, install Chrome dependencies:

```bash
# Ubuntu/Debian
sudo apt-get update
sudo apt-get install -y \
    ca-certificates \
    fonts-liberation \
    libappindicator3-1 \
    libasound2 \
    libatk-bridge2.0-0 \
    libatk1.0-0 \
    libc6 \
    libcairo2 \
    libcups2 \
    libdbus-1-3 \
    libexpat1 \
    libfontconfig1 \
    libgbm1 \
    libgcc1 \
    libglib2.0-0 \
    libgtk-3-0 \
    libnspr4 \
    libnss3 \
    libpango-1.0-0 \
    libpangocairo-1.0-0 \
    libstdc++6 \
    libx11-6 \
    libx11-xcb1 \
    libxcb1 \
    libxcomposite1 \
    libxcursor1 \
    libxdamage1 \
    libxext6 \
    libxfixes3 \
    libxi6 \
    libxrandr2 \
    libxrender1 \
    libxss1 \
    libxtst6 \
    lsb-release \
    wget \
    xdg-utils
```

### Solution 3: Use System Chrome

If you have Chrome installed on your system:

```bash
# Find Chrome path
which google-chrome-stable
# or
which chromium-browser
```

Then set environment variable:
```bash
export PUPPETEER_EXECUTABLE_PATH=/usr/bin/google-chrome-stable
```

### Solution 4: Docker Configuration

If running in Docker, add to your Dockerfile:

```dockerfile
RUN apt-get update && apt-get install -y \
    wget \
    ca-certificates \
    fonts-liberation \
    libappindicator3-1 \
    libasound2 \
    libatk-bridge2.0-0 \
    libatk1.0-0 \
    libcups2 \
    libdbus-1-3 \
    libgdk-pixbuf2.0-0 \
    libnspr4 \
    libnss3 \
    libx11-xcb1 \
    libxcomposite1 \
    libxdamage1 \
    libxrandr2 \
    libgbm1 \
    libxss1 \
    libxtst6 \
    --no-install-recommends \
    && rm -rf /var/lib/apt/lists/*
```

## Alternative Implementation (html-pdf-node)

Replace the Puppeteer code in `gym-invoice.service.ts` with:

```typescript
import * as htmlPdf from 'html-pdf-node';

// In getGymInvoicePdf method, replace the Puppeteer section with:

const options = {
    format: 'A4',
    printBackground: true,
    margin: {
        top: '20px',
        right: '20px',
        bottom: '20px',
        left: '20px'
    }
};

const file = { content: htmlTemplate };

try {
    const pdfBuffer = await htmlPdf.generatePdf(file, options);
    return pdfBuffer;
} catch (error) {
    throw new Error(`Failed to generate PDF: ${error.message}`);
}
```

## Testing

Test if Puppeteer works:
```bash
node test-puppeteer.js
```

## Current Status

- ✅ Puppeteer installed
- ✅ Chrome binary downloaded
- ❌ Chrome crashes with segmentation fault (likely WSL issue)
- 🔄 Installing html-pdf-node as alternative

## Recommendation

For WSL environments, use `html-pdf-node` instead of direct Puppeteer.
