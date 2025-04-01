# @wongcoin/swap-sdk

SDK for integrating swap functionality into your application.

## Installation

```bash
npm install @wongcoin/swap-sdk
# or
yarn add @wongcoin/swap-sdk
# or
pnpm add @wongcoin/swap-sdk
```

## Usage

### Core SDK

```typescript
import { SwapSDK } from '@wongcoin/swap-sdk';

const swapSDK = new SwapSDK({
    iframeUrl: 'https://metapolls.io/sdk',
    width: '100%',
    height: '600px',
    token: '0x123...', // Replace with actual token address
    chainId: 1 // Replace with desired chain ID
});

await swapSDK.initializeSwap();
```

### React Component

```tsx
import { SwapEmbed } from '@wongcoin/swap-sdk/react';

function App() {
    return (
        <SwapEmbed
            iframeUrl="https://metapolls.io/sdk"
            width="100%"
            height="600px"
            token="0x123..." // Replace with actual token address
            chainId={1} // Replace with desired chain ID
        />
    );
}
```

## API Reference

### SwapSDK

The core SDK class for programmatic interaction with the swap functionality.

#### Constructor

```typescript
constructor(config: {
    iframeUrl: string;
    width: string;
    height: string;
    token: string;
    chainId: number;
})
```

#### Methods

##### initializeSwap

Initializes the swap functionality and creates the iframe.

```typescript
async initializeSwap(): Promise<void>
```

##### disconnect

Cleans up resources and removes the iframe.

```typescript
disconnect(): void
```

### SwapEmbed

A React component that provides a simple way to integrate the swap functionality.

#### Props

```typescript
interface SwapEmbedProps {
    iframeUrl: string;
    width: string;
    height: string;
    token: string;
    chainId: number;
    className?: string;
}
```

## Features

- Easy integration with React applications
- Programmatic access through core SDK
- Customizable iframe dimensions
- Support for different tokens and chain IDs
- TypeScript support
- Modern ES modules support

## License

MIT 