import { BrowserProvider } from 'ethers';

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
}

export class SwapSDK {
  private provider: BrowserProvider | null = null;
  private iframe: HTMLIFrameElement | null = null;
  private messageHandlers: Map<string, (data: any) => void> = new Map();

  constructor() {
    this.initializeProvider();
    this.setupMessageHandlers();
  }

  private async initializeProvider() {
    if (window.ethereum) {
      this.provider = new BrowserProvider(window.ethereum);
    } else {
      throw new Error('No Ethereum provider found. Please install MetaMask or another Web3 wallet.');
    }
  }

  private setupMessageHandlers() {
    window.addEventListener('message', (event) => {
      const data = event.data;
      
      // Handle JSON-RPC requests
      if (data.jsonrpc === '2.0') {
        const handler = this.messageHandlers.get(data.method);
        if (handler) {
          handler(data);
        }
      }
    });
  }

  private createIframe(config: SwapConfig) {
    if (this.iframe) {
      this.iframe.remove();
    }

    this.iframe = document.createElement('iframe');
    this.iframe.style.width = config.width || '100%';
    this.iframe.style.height = config.height || '600px';
    this.iframe.style.border = 'none';
    if (config.className) {
      this.iframe.className = config.className;
    }

    const url = new URL(config.iframeUrl);
    if (config.token) url.searchParams.set('token', config.token);
    if (config.chainId) url.searchParams.set('chainId', config.chainId);

    this.iframe.src = url.toString();
    return this.iframe;
  }

  public async initializeSwap(config: SwapConfig): Promise<void> {
    try {
      // Create and add iframe
      const iframe = this.createIframe(config);
      document.body.appendChild(iframe);

      // Register message handlers
      this.messageHandlers.set('eth_requestAccounts', async (data) => {
        try {
          const accounts = await this.provider?.send('eth_requestAccounts', []);
          this.sendResponse(data.id, accounts);
        } catch (error) {
          this.sendError(data.id, error as Error);
        }
      });

      this.messageHandlers.set('eth_sendTransaction', async (data) => {
        try {
          const txHash = await this.provider?.send('eth_sendTransaction', data.params);
          this.sendResponse(data.id, txHash);
        } catch (error) {
          this.sendError(data.id, error as Error);
        }
      });

    } catch (error) {
      throw error;
    }
  }

  private sendResponse(id: string | number, result: any) {
    if (this.iframe?.contentWindow) {
      this.iframe.contentWindow.postMessage({
        jsonrpc: '2.0',
        id,
        result
      }, '*');
    }
  }

  private sendError(id: string | number, error: Error) {
    if (this.iframe?.contentWindow) {
      this.iframe.contentWindow.postMessage({
        jsonrpc: '2.0',
        id,
        error: {
          code: -32000,
          message: error.message
        }
      }, '*');
    }
  }

  public async disconnect(): Promise<void> {
    if (this.iframe) {
      this.iframe.remove();
      this.iframe = null;
    }
    this.messageHandlers.clear();
  }
} 