import { BrowserProvider } from 'ethers';

// Add Ethereum provider type declarations
declare global {
  interface Window {
    ethereum?: {
      request: (args: { method: string; params?: any[] }) => Promise<any>;
      on: (event: string, callback: (params: any) => void) => void;
      removeListener: (event: string, callback: (params: any) => void) => void;
      isMetaMask?: boolean;
    };
  }
}

// --- Interfaces ---

interface JsonRpcRequest {
  id: number | string;
  jsonrpc: '2.0';
  method: string;
  params?: any[] | object;
}

interface JsonRpcResponse {
  id: number | string;
  jsonrpc: '2.0';
  result?: any;
  error?: {
    code: number;
    message: string;
    data?: any;
  };
}

interface ChunkedMessage {
  type: 'chunk';
  id: string;
  chunk: number;
  total: number;
  data: string;
}

export interface SwapConfig {
  /** The URL of the swap UI page to load in the iframe */
  iframeUrl: string;
  /** Width of the iframe (default: '100%') */
  width?: string;
  /** Height of the iframe (default: '600px') */
  height?: string;
  /** Initial token address to configure in the iframe */
  token?: string;
  /** Initial chain ID to configure in the iframe */
  chainId?: string;
  /** Optional: Class name for the iframe */
  className?: string;
  /** Optional: The iframe element to use */
  iframe?: HTMLIFrameElement;
}

const MAX_CHUNK_SIZE = 1000000; // 1MB chunks

// --- Helper Functions ---

const isJsonRpcRequest = (data: any): data is JsonRpcRequest => {
  return (
    typeof data === 'object' &&
    data !== null &&
    data.jsonrpc === '2.0' &&
    typeof data.method === 'string' &&
    (data.id !== undefined || data.id !== null)
  );
};

const isChunkedMessage = (data: any): data is ChunkedMessage => {
  return (
    typeof data === 'object' &&
    data !== null &&
    data.type === 'chunk' &&
    typeof data.id === 'string' &&
    typeof data.chunk === 'number' &&
    typeof data.total === 'number' &&
    typeof data.data === 'string'
  );
};

const safeStringify = (data: any): string => {
  try {
    const seen = new WeakSet();
    return JSON.stringify(data, (_, value) => {
      if (typeof value === 'bigint') {
        return value.toString();
      }
      if (value instanceof Error) {
        return {
          name: value.name,
          message: value.message,
          stack: value.stack
        };
      }
      if (typeof value === 'object' && value !== null) {
        if (seen.has(value)) {
          return '[Circular]';
        }
        seen.add(value);
        if (Array.isArray(value)) {
          return value.map(item => {
            if (typeof item === 'object' && item !== null) {
              if (seen.has(item)) {
                return '[Circular]';
              }
              seen.add(item);
            }
            return item;
          });
        }
        const result: Record<string, any> = {};
        for (const key in value) {
          if (Object.prototype.hasOwnProperty.call(value, key)) {
            result[key] = value[key];
          }
        }
        return result;
      }
      return value;
    });
  } catch (error) {
    console.error('Error stringifying data:', error);
    return JSON.stringify({
      error: 'Failed to stringify data',
      message: error instanceof Error ? error.message : 'Unknown error'
    });
  }
};

const chunkData = (data: any, id: string): ChunkedMessage[] => {
  try {
    const jsonString = safeStringify(data);
    const chunks: ChunkedMessage[] = [];
    const totalChunks = Math.ceil(jsonString.length / MAX_CHUNK_SIZE);

    for (let i = 0; i < totalChunks; i++) {
      const start = i * MAX_CHUNK_SIZE;
      const end = Math.min(start + MAX_CHUNK_SIZE, jsonString.length);
      chunks.push({
        type: 'chunk',
        id,
        chunk: i,
        total: totalChunks,
        data: jsonString.slice(start, end)
      });
    }

    return chunks;
  } catch (error) {
    console.error('Error chunking data:', error);
    return [{
      type: 'chunk',
      id,
      chunk: 0,
      total: 1,
      data: safeStringify({
        error: 'Failed to chunk data',
        message: error instanceof Error ? error.message : 'Unknown error'
      })
    }];
  }
};

const assembleChunks = (chunks: ChunkedMessage[]): any => {
  try {
    const sortedChunks = chunks.sort((a, b) => a.chunk - b.chunk);
    const jsonString = sortedChunks.map(chunk => chunk.data).join('');
    return JSON.parse(jsonString);
  } catch (error) {
    console.error('Error assembling chunks:', error);
    return {
      error: 'Failed to assemble chunks',
      message: error instanceof Error ? error.message : 'Unknown error'
    };
  }
};

export class SwapSDK {
  private provider: BrowserProvider | null = null;
  private iframe: HTMLIFrameElement | null = null;
  private iframeUrl: string;
  private messageHandlers: Map<string, Function> = new Map();
  private chunkedMessages: Map<string, ChunkedMessage[]> = new Map();
  private messageTimeout: Map<string, NodeJS.Timeout> = new Map();

  constructor(iframeUrl: string = 'https://metapolls.io/sdk') {
    this.iframeUrl = iframeUrl;
  }

  private async initializeProvider() {
    if (!window.ethereum) {
      throw new Error('No Ethereum provider found');
    }
    this.provider = new BrowserProvider(window.ethereum);
  }

  private setupMessageHandlers() {
    this.messageHandlers.set('eth_requestAccounts', async () => {
      try {
        const accounts = await this.provider?.send('eth_requestAccounts', []);
        this.sendResponse(accounts);
      } catch (error) {
        this.sendError(error);
      }
    });

    this.messageHandlers.set('eth_sendTransaction', async (params: any) => {
      try {
        const tx = await this.provider?.send('eth_sendTransaction', [params]);
        this.sendResponse(tx);
      } catch (error) {
        this.sendError(error);
      }
    });
  }

  private buildIframeUrl(config: SwapConfig): string {
    const url = new URL(config.iframeUrl);
    if (config.token) {
      url.searchParams.set('token', config.token);
    }
    if (config.chainId) {
      url.searchParams.set('chainId', config.chainId);
    }
    return url.toString();
  }

  public async initializeSwap(config: SwapConfig): Promise<void> {
    await this.initializeProvider();
    this.setupMessageHandlers();

    // Use provided iframe or create new one
    if (config.iframe) {
      this.iframe = config.iframe;
    } else {
      this.iframe = document.createElement('iframe');
      this.iframe.width = config.width || '100%';
      this.iframe.height = config.height || '600px';
      this.iframe.style.border = 'none';
      this.iframe.style.width = config.width || '100%';
      this.iframe.style.height = config.height || '600px';
      if (config.className) {
        this.iframe.className = config.className;
      }
      document.body.appendChild(this.iframe);
    }

    // Set the source URL with parameters
    this.iframe.src = this.buildIframeUrl(config);

    // Add message listener
    window.addEventListener('message', this.handleMessage.bind(this));
  }

  private handleMessage(event: MessageEvent) {
    // Get the origin from the iframe URL
    const expectedOrigin = new URL(this.iframeUrl).origin;
    
    // Normalize origins by removing www if present
    const normalizeOrigin = (origin: string) => {
      return origin.replace(/^https?:\/\/www\./, 'https://');
    };
    
    const normalizedExpectedOrigin = normalizeOrigin(expectedOrigin);
    const normalizedEventOrigin = normalizeOrigin(event.origin);
    
    // In production, check the normalized origin
    if (process.env.NODE_ENV === 'production') {
      if (normalizedEventOrigin !== normalizedExpectedOrigin) {
        console.warn(`Rejected message from unexpected origin: ${event.origin}`);
        return;
      }
    } else {
      // In development, allow localhost and similar origins
      if (!event.origin.match(/^(https?:\/\/localhost|https?:\/\/127\.0\.0\.1|https?:\/\/\[::1\]|file:)/) && 
          normalizedEventOrigin !== normalizedExpectedOrigin) {
        console.warn(`Rejected message from unexpected origin: ${event.origin}`);
        return;
      }
    }

    const data = event.data;

    // Handle chunked messages
    if (isChunkedMessage(data)) {
      const chunks = this.chunkedMessages.get(data.id) || [];
      chunks[data.chunk] = data;
      this.chunkedMessages.set(data.id, chunks);

      // Clear existing timeout if any
      const existingTimeout = this.messageTimeout.get(data.id);
      if (existingTimeout) {
        clearTimeout(existingTimeout);
        this.messageTimeout.delete(data.id);
      }

      // Set new timeout
      const timeout = setTimeout(() => {
        this.chunkedMessages.delete(data.id);
        this.messageTimeout.delete(data.id);
        console.error(`Timeout waiting for chunks for message ${data.id}`);
      }, 30000); // 30 second timeout

      this.messageTimeout.set(data.id, timeout);

      // Check if we have all chunks
      if (chunks.length === data.total) {
        clearTimeout(timeout);
        this.messageTimeout.delete(data.id);
        const assembledData = assembleChunks(chunks);
        this.chunkedMessages.delete(data.id);
        this.handleJsonRpcRequest(assembledData);
      }
      return;
    }

    // Handle regular JSON-RPC requests
    if (isJsonRpcRequest(data)) {
      this.handleJsonRpcRequest(data);
    } else {
      console.warn('Received non-JSON-RPC message from iframe:', data);
    }
  }

  private async handleJsonRpcRequest(requestData: JsonRpcRequest) {
    console.log('SDK received request:', requestData);

    const { id, method, params } = requestData;
    let response: JsonRpcResponse = { id, jsonrpc: '2.0' };

    try {
      if (!this.provider) {
        throw new Error('Provider not initialized');
      }

      switch (method) {
        case 'eth_requestAccounts':
        case 'enable':
          try {
            const accounts = await this.provider.send('eth_requestAccounts', []);
            response.result = accounts;
          } catch (error: any) {
            response.error = {
              code: -32000,
              message: error.message || 'Failed to request accounts',
            };
          }
          break;

        case 'eth_accounts':
          try {
            const accounts = await this.provider.send('eth_accounts', []);
            response.result = accounts;
          } catch (error: any) {
            response.error = {
              code: -32000,
              message: error.message || 'Failed to get accounts',
            };
          }
          break;

        case 'eth_chainId':
          try {
            const chainId = await this.provider.send('eth_chainId', []);
            response.result = chainId;
          } catch (error: any) {
            response.error = {
              code: -32000,
              message: error.message || 'Failed to get chain ID',
            };
          }
          break;

        case 'wallet_switchEthereumChain':
          if (!params || !Array.isArray(params) || !params[0]?.chainId) {
            throw new Error('Invalid parameters for wallet_switchEthereumChain');
          }
          try {
            await this.provider.send('wallet_switchEthereumChain', [params[0].chainId]);
            response.result = null;
          } catch (error: any) {
            response.error = {
              code: -32000,
              message: error.message || 'Failed to switch chain',
            };
          }
          break;

        case 'eth_sendTransaction':
          if (!params || !Array.isArray(params) || !params[0]) {
            throw new Error('Invalid parameters for eth_sendTransaction');
          }
          try {
            const txHash = await this.provider.send('eth_sendTransaction', [params[0]]);
            response.result = txHash;
          } catch (error: any) {
            response.error = {
              code: -32000,
              message: error.message || 'Failed to send transaction',
            };
          }
          break;

        case 'personal_sign':
          if (!params || !Array.isArray(params) || typeof params[0] !== 'string') {
            throw new Error('Invalid parameters for personal_sign');
          }
          try {
            const signature = await this.provider.send('personal_sign', [params[0], params[1]]);
            response.result = signature;
          } catch (error: any) {
            response.error = {
              code: -32000,
              message: error.message || 'Failed to sign message',
            };
          }
          break;

        default:
          console.warn(`Unsupported RPC method received: ${method}`);
          response.error = {
            code: -32601,
            message: `Method not found: ${method}`,
          };
      }
    } catch (err: any) {
      console.error(`Error processing RPC method ${method}:`, err);
      response.error = {
        code: -32000,
        message: err.message || 'An unexpected error occurred.',
      };
    }

    console.log('SDK sending response:', response);
    this.postResponse(response);
  }

  private postResponse(response: JsonRpcResponse) {
    if (this.iframe?.contentWindow) {
      try {
        const targetOrigin = new URL(this.iframeUrl).origin;
        
        // Check if response needs chunking
        const responseString = safeStringify(response);
        if (responseString.length > MAX_CHUNK_SIZE) {
          const chunks = chunkData(response, `response-${response.id}`);
          chunks.forEach(chunk => {
            this.iframe?.contentWindow?.postMessage(chunk, targetOrigin);
          });
        } else {
          this.iframe.contentWindow.postMessage(response, targetOrigin);
        }
      } catch (error) {
        console.error('Error posting response:', error);
        // Send error response
        const errorResponse: JsonRpcResponse = {
          id: response.id,
          jsonrpc: '2.0',
          error: {
            code: -32000,
            message: error instanceof Error ? error.message : 'Failed to send response'
          }
        };
        const targetOrigin = new URL(this.iframeUrl).origin;
        this.iframe.contentWindow.postMessage(errorResponse, targetOrigin);
      }
    } else {
      console.error('Cannot send response: Iframe or origin not available.');
    }
  }

  private sendResponse(result: any) {
    this.postResponse({
      id: Date.now(),
      jsonrpc: '2.0',
      result
    });
  }

  private sendError(error: any) {
    this.postResponse({
      id: Date.now(),
      jsonrpc: '2.0',
      error: {
        code: -32000,
        message: error.message || 'Internal error'
      }
    });
  }

  public async disconnect(): Promise<void> {
    window.removeEventListener('message', this.handleMessage.bind(this));
    this.iframe?.remove();
    this.iframe = null;
    this.provider = null;
    this.messageHandlers.clear();
    this.chunkedMessages.clear();
    this.messageTimeout.forEach(timeout => clearTimeout(timeout));
    this.messageTimeout.clear();
  }
} 