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

```typescript
import { SwapSDK } from '@wongcoin/swap-sdk';

const sdk = new SwapSDK();

// Initialize a swap
await sdk.initializeSwap({
  token: '0x...', // Token address
  amount: '1.0', // Optional amount
  onSuccess: (txHash) => {
    console.log('Swap successful:', txHash);
  },
  onError: (error) => {
    console.error('Swap failed:', error);
  }
});

// Clean up when done
await sdk.disconnect();
```

### React Component

```typescript
import { SwapWidget } from '@wongcoin/swap-sdk/react';

function App() {
  return (
    <SwapWidget
      token="0x..." // Token address
      amount="1.0" // Optional amount
      onSuccess={(txHash) => {
        console.log('Swap successful:', txHash);
      }}
      onError={(error) => {
        console.error('Swap failed:', error);
      }}
      className="my-swap-widget" // Optional CSS class
      style={{ width: '500px' }} // Optional inline styles
    />
  );
}
```

## API Reference

### Core SDK

#### `SwapSDK`

The main SDK class that handles the swap functionality.

##### Methods

- `initializeSwap(config: SwapConfig): Promise<void>`
  - Initializes a new swap transaction
  - Parameters:
    - `config`: Configuration object containing:
      - `token`: Token address (required)
      - `amount`: Amount to swap (optional)
      - `onSuccess`: Callback for successful swap (optional)
      - `onError`: Callback for failed swap (optional)

- `disconnect(): Promise<void>`
  - Cleans up resources and disconnects from the provider

### React Component

#### `SwapWidget`

A React component that wraps the core SDK functionality.

##### Props

- `token`: Token address (required)
- `amount`: Amount to swap (optional)
- `onSuccess`: Callback for successful swap (optional)
- `onError`: Callback for failed swap (optional)
- `className`: CSS class name (optional)
- `style`: Inline styles (optional)

## License

MIT 