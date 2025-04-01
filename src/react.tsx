import React, { useEffect, useRef } from 'react';
import { SwapSDK, SwapConfig } from './sdk';

export interface SwapEmbedProps extends SwapConfig {}

export const SwapEmbed: React.FC<SwapEmbedProps> = (props) => {
  const sdkRef = useRef<SwapSDK | null>(null);
  const iframeRef = useRef<HTMLIFrameElement | null>(null);

  useEffect(() => {
    if (!iframeRef.current) return;

    // Initialize SDK
    sdkRef.current = new SwapSDK();

    // Start swap with iframe element
    sdkRef.current.initializeSwap({
      ...props,
      iframe: iframeRef.current
    }).catch(console.error);

    // Cleanup on unmount
    return () => {
      sdkRef.current?.disconnect();
    };
  }, [props.iframeUrl, props.token, props.chainId]); // Re-run if these props change

  return (
    <iframe
      ref={iframeRef}
      src={props.iframeUrl}
      width={props.width || '100%'}
      height={props.height || '600'}
      style={{
        border: 'none',
        overflow: 'hidden',
        position: 'relative',
        zIndex: 1000,
        ...(props.className ? { className: props.className } : {})
      }}
    />
  );
};

export default SwapEmbed; 