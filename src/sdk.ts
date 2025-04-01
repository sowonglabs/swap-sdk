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
  /** The iframe element to use */
  iframe?: HTMLIFrameElement;
}

export class SwapSDK {
  private provider: BrowserProvider | null = null;
  private iframe: HTMLIFrameElement | null = null;
  private iframeUrl: string;

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
    window.addEventListener('message', async (event) => {
      if (event.origin !== new URL(this.iframeUrl).origin) return;

      const { method, params, id } = event.data;

      try {
        switch (method) {
          case 'eth_requestAccounts':
            if (!this.provider) await this.initializeProvider();
            const accounts = await this.provider!.send('eth_requestAccounts', []);
            this.sendResponse(id, accounts);
            break;

          case 'eth_sendTransaction':
            if (!this.provider) await this.initializeProvider();
            const txHash = await this.provider!.send('eth_sendTransaction', params);
            this.sendResponse(id, txHash);
            break;

          default:
            this.sendError(id, new Error(`Unsupported method: ${method}`));
        }
      } catch (error) {
        this.sendError(id, error as Error);
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
    
    // Use the provided iframe or throw an error
    if (!config.iframe) {
      throw new Error('Iframe element is required');
    }
    
    // Update iframe src with token and chainId parameters
    config.iframe.src = this.buildIframeUrl(config);
    
    this.iframe = config.iframe;
  }

  private sendResponse(id: string, result: any) {
    if (this.iframe?.contentWindow) {
      this.iframe.contentWindow.postMessage(
        { id, result },
        this.iframeUrl
      );
    }
  }

  private sendError(id: string, error: Error) {
    if (this.iframe?.contentWindow) {
      this.iframe.contentWindow.postMessage(
        { id, error: error.message },
        this.iframeUrl
      );
    }
  }

  public async disconnect(): Promise<void> {
    this.iframe = null;
    this.provider = null;
  }
} 