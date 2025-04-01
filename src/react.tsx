import React, { useEffect, useRef } from 'react';
import { SwapSDK, SwapConfig } from './sdk';

export interface SwapEmbedProps extends Omit<SwapConfig, 'iframe'> {
  /** Optional callback when the swap fails */
  onError?: (error: any) => void;
}

export const SwapEmbed: React.FC<SwapEmbedProps> = ({
  iframeUrl,
  width = '100%',
  height = '600px',
  token,
  chainId,
  className,
  onError
}) => {
  const iframeRef = useRef<HTMLIFrameElement>(null);
  const sdkRef = useRef<SwapSDK | null>(null);

  useEffect(() => {
    if (!iframeRef.current) return;

    const sdk = new SwapSDK(iframeUrl);
    sdkRef.current = sdk;

    const config: SwapConfig = {
      iframeUrl,
      width,
      height,
      token,
      chainId,
      className,
      iframe: iframeRef.current
    };

    sdk.initializeSwap(config).catch(error => {
      console.error('Failed to initialize swap:', error);
      onError?.(error);
    });

    return () => {
      sdk.disconnect();
    };
  }, [iframeUrl, width, height, token, chainId, className, onError]);

  return (
    <iframe
      ref={iframeRef}
      width={width}
      height={height}
      className={className}
      style={{ border: 'none' }}
    />
  );
};

export default SwapEmbed;
