import React, { useEffect, useRef, useState, useCallback } from 'react';
import { BrowserProvider } from 'ethers';

declare global {
  interface Window {
    ethereum?: {
      request: (args: { method: string; params?: any[] }) => Promise<any>;
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

const MAX_CHUNK_SIZE = 1000000; // 1MB chunks

export interface SwapEmbedProps {
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

// --- SwapEmbed Component ---

const SwapEmbedComponent = ({
  iframeUrl,
  width = '100%',
  height = '600px',
  token,
  chainId,
  className,
}: SwapEmbedProps) => {
  const iframeRef = useRef<HTMLIFrameElement>(null);
  const [iframeOrigin, setIframeOrigin] = useState<string | null>(null);
  const [provider, setProvider] = useState<BrowserProvider | null>(null);
  const [address, setAddress] = useState<string | null>(null);
  const chunkedMessages = useRef<Map<string, ChunkedMessage[]>>(new Map());
  const messageTimeout = useRef<Map<string, NodeJS.Timeout>>(new Map());

  // Initialize provider
  useEffect(() => {
    if (window.ethereum) {
      const provider = new BrowserProvider(window.ethereum);
      setProvider(provider);
    }
  }, []);

  // Determine iframe origin once URL is set
  useEffect(() => {
    try {
      setIframeOrigin(new URL(iframeUrl).origin);
    } catch (error) {
      console.error('Invalid iframeUrl provided to SwapEmbed:', iframeUrl);
      setIframeOrigin(null);
    }
  }, [iframeUrl]);

  // Construct the iframe source URL with query parameters
  const getIframeSrc = useCallback(() => {
    const url = new URL(iframeUrl);
    if (token) url.searchParams.set('token', token);
    if (chainId) url.searchParams.set('chainId', chainId);
    return url.toString();
  }, [iframeUrl, token, chainId]);

  const [iframeSrc, setIframeSrc] = useState(getIframeSrc());

  useEffect(() => {
    setIframeSrc(getIframeSrc());
  }, [getIframeSrc]);

  // --- Message Handling ---

  const postResponse = useCallback(
    (response: JsonRpcResponse) => {
      if (iframeRef.current?.contentWindow && iframeOrigin) {
        try {
          // Check if response needs chunking
          const responseString = safeStringify(response);
          if (responseString.length > MAX_CHUNK_SIZE) {
            const chunks = chunkData(response, `response-${response.id}`);
            chunks.forEach(chunk => {
              iframeRef.current?.contentWindow?.postMessage(chunk, iframeOrigin);
            });
          } else {
            iframeRef.current.contentWindow.postMessage(response, iframeOrigin);
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
          iframeRef.current.contentWindow.postMessage(errorResponse, iframeOrigin);
        }
      } else {
        console.error('Cannot send response: Iframe or origin not available.');
      }
    },
    [iframeOrigin]
  );

  const handleMessage = useCallback(
    async (event: MessageEvent) => {
      if (!iframeOrigin || event.origin !== iframeOrigin) {
        return;
      }

      const data = event.data;

      // Handle chunked messages
      if (isChunkedMessage(data)) {
        const chunks = chunkedMessages.current.get(data.id) || [];
        chunks[data.chunk] = data;
        chunkedMessages.current.set(data.id, chunks);

        // Clear existing timeout if any
        const existingTimeout = messageTimeout.current.get(data.id);
        if (existingTimeout) {
          clearTimeout(existingTimeout);
          messageTimeout.current.delete(data.id);
        }

        // Set new timeout
        const timeout = setTimeout(() => {
          chunkedMessages.current.delete(data.id);
          messageTimeout.current.delete(data.id);
          console.error(`Timeout waiting for chunks for message ${data.id}`);
        }, 30000); // 30 second timeout

        messageTimeout.current.set(data.id, timeout);

        // Check if we have all chunks
        if (chunks.length === data.total) {
          clearTimeout(timeout);
          messageTimeout.current.delete(data.id);
          const assembledData = assembleChunks(chunks);
          chunkedMessages.current.delete(data.id);
          await handleJsonRpcRequest(assembledData);
        }
        return;
      }

      // Handle regular JSON-RPC requests
      if (isJsonRpcRequest(data)) {
        await handleJsonRpcRequest(data);
      } else {
        console.warn('Received non-JSON-RPC message from iframe:', data);
      }
    },
    [iframeOrigin, provider, address]
  );

  // Cleanup timeouts on unmount
  useEffect(() => {
    return () => {
      messageTimeout.current.forEach(timeout => clearTimeout(timeout));
      messageTimeout.current.clear();
    };
  }, []);

  const handleJsonRpcRequest = async (requestData: JsonRpcRequest) => {
    console.log('SDK received request:', requestData);

    const { id, method, params } = requestData;
    let response: JsonRpcResponse = { id, jsonrpc: '2.0' };

    try {
      if (!provider) {
        throw new Error('Provider not initialized');
      }

      switch (method) {
        case 'eth_requestAccounts':
        case 'enable':
          try {
            const accounts = await provider.send('eth_requestAccounts', []);
            setAddress(accounts[0]);
            response.result = accounts;
          } catch (error: any) {
            response.error = {
              code: -32000,
              message: error.message || 'Failed to request accounts',
            };
          }
          break;

        case 'eth_accounts':
          response.result = address ? [address] : [];
          break;

        case 'eth_chainId':
          try {
            const chainId = await provider.send('eth_chainId', []);
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
            await provider.send('wallet_switchEthereumChain', [params[0].chainId]);
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
            const txHash = await provider.send('eth_sendTransaction', [params[0]]);
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
            const signature = await provider.send('personal_sign', [params[0], address]);
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
    postResponse(response);
  };

  // Add message listener
  useEffect(() => {
    window.addEventListener('message', handleMessage);
    return () => {
      window.removeEventListener('message', handleMessage);
    };
  }, [handleMessage]);

  return React.createElement('iframe', {
    ref: iframeRef,
    src: iframeSrc,
    width: width,
    height: height,
    className: className,
    title: "Swap Component",
    sandbox: "allow-scripts allow-same-origin allow-forms allow-popups"
  });
};

// Export component
export const SwapEmbed = SwapEmbedComponent;

export * from './sdk';
export * from './react'; 