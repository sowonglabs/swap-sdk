import React, { useEffect, useRef } from 'react';
import { SwapSDK } from './sdk.js';

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
  /** Optional callback for successful initialization */
  onSuccess?: () => void;
  /** Optional callback for error handling */
  onError?: (error: Error) => void;
}

export const SwapEmbed: React.FC<SwapEmbedProps> = ({
  onSuccess,
  onError,
  iframeUrl,
  width = '100%',
  height = '600px',
  token,
  chainId,
  className
}) => {
  const iframeRef = useRef<HTMLIFrameElement>(null);
  const sdkRef = useRef<SwapSDK | null>(null);

  useEffect(() => {
    const initializeSDK = async () => {
      try {
        if (!iframeRef.current) {
          throw new Error('Iframe reference not available');
        }

        // Create SDK instance
        sdkRef.current = new SwapSDK(iframeUrl);

        // Initialize with the iframe reference
        await sdkRef.current.initializeSwap({
          iframeUrl,
          width,
          height,
          token,
          chainId,
          className,
          iframe: iframeRef.current
        });

        onSuccess?.();
      } catch (error) {
        console.error('Failed to initialize SwapSDK:', error);
        onError?.(error instanceof Error ? error : new Error('Failed to initialize SwapSDK'));
      }
    };

    initializeSDK();

    // Cleanup on unmount
    return () => {
      sdkRef.current?.disconnect();
    };
  }, [iframeUrl, token, chainId, width, height, className, onSuccess, onError]);

  return (
    <iframe
      ref={iframeRef}
      width={width}
      height={height}
      style={{
        border: 'none',
        width,
        height
      }}
      className={className}
      sandbox="allow-scripts allow-same-origin allow-forms allow-popups"
      allow="ethereum"
    />
  );
};

export default SwapEmbed; 