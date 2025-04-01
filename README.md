# @wongcoin/swap-sdk

A framework-agnostic SDK for integrating swap functionality into your application.

## Installation

```bash
npm install @wongcoin/swap-sdk
# or
yarn add @wongcoin/swap-sdk
```

## Usage

### Core SDK

The SDK provides a core class for non-React applications to integrate the swap functionality:

```typescript
import { SwapSDK } from '@wongcoin/swap-sdk';

const sdk = new SwapSDK();

// Initialize a swap
await sdk.initializeSwap({
  iframeUrl: 'http://192.168.1.125:3000/sdk',
  token: '0XD6E4DF460D9BA104DFC5DC57DB392C177083D20C',
  chainId: '33139',
  width: '100%',
  height: '600',
  className: 'chainblock relative'
});

// Clean up when done
await sdk.disconnect();
```

### React Component

The SDK also provides a React component for easy integration in React applications:

```typescript
import { SwapEmbed } from '@wongcoin/swap-sdk/react';

function App() {
  return (
    <SwapEmbed
      iframeUrl="http://192.168.1.125:3000/sdk"
      token="0XD6E4DF460D9BA104DFC5DC57DB392C177083D20C"
      chainId="33139"
      width="100%"
      height="600"
      className="chainblock relative"
    />
  );
}
```

## API Reference

### Core SDK

#### `SwapSDK`

The main SDK class that handles the swap functionality.

##### Constructor

```typescript
new SwapSDK()
```

##### Methods

- `initializeSwap(config: SwapConfig): Promise<void>`
  - Initializes a new swap transaction
  - Parameters:
    - `config`: Configuration object containing:
      - `iframeUrl`: The URL of the swap UI page to load in the iframe (required)
      - `width`: Width of the iframe (optional, default: '100%')
      - `height`: Height of the iframe (optional, default: '600px')
      - `token`: Initial token address to configure in the iframe (optional)
      - `chainId`: Initial chain ID to configure in the iframe (optional)
      - `className`: Optional class name for the iframe container (optional)

- `disconnect(): Promise<void>`
  - Cleans up resources and disconnects from the provider

### React Component

#### `SwapEmbed`

A React component for embedding the swap functionality via an iframe.

##### Props

- `iframeUrl`: The URL of the swap UI page to load in the iframe (required)
- `width`: Width of the iframe (optional, default: '100%')
- `height`: Height of the iframe (optional, default: '600px')
- `token`: Initial token address to configure in the iframe (optional)
- `chainId`: Initial chain ID to configure in the iframe (optional)
- `className`: Optional class name for the iframe container (optional)

##### Features

- **Secure Communication**: Uses postMessage API for secure communication between the parent application and the iframe
- **Automatic Provider Detection**: Automatically detects and uses the available Ethereum provider (e.g., MetaMask)
- **Chunked Message Support**: Handles large messages through automatic chunking and reassembly
- **Error Handling**: Comprehensive error handling for network and provider issues
- **Responsive Design**: Customizable dimensions and styling through props

##### Technical Details

The component implements a JSON-RPC communication layer that:
- Handles large message payloads through chunking
- Manages provider connections and wallet interactions
- Provides secure cross-origin communication
- Implements automatic reconnection and error recovery

## License

MIT 