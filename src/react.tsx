import React, { useEffect, useRef } from 'react';
import { SwapSDK, SwapConfig } from './sdk';

export interface SwapEmbedProps extends SwapConfig {}

export const SwapEmbed: React.FC<SwapEmbedProps> = (props) => {
  const sdkRef = useRef<SwapSDK | null>(null);
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    // Initialize SDK
    sdkRef.current = new SwapSDK();

    // Start swap
    sdkRef.current.initializeSwap(props).catch(console.error);

    // Cleanup on unmount
    return () => {
      sdkRef.current?.disconnect();
    };
  }, [props.iframeUrl, props.token, props.chainId]); // Re-run if these props change

  return <div ref={containerRef} />;
};

export default SwapEmbed; 