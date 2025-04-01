import React from 'react';
import { SwapEmbed } from '@wongcoin/swap-sdk/react';

function App() {
  return (
    <div style={{ padding: '20px' }}>
      <h1>Swap SDK Test</h1>
      <div style={{ maxWidth: '500px', margin: '0 auto' }}>
        <SwapEmbed
          iframeUrl="https://metapolls.io/sdk"
          token="0XD6E4DF460D9BA104DFC5DC57DB392C177083D20C"
          chainId="33139"
          width="100%"
          height="600"
          className="chainblock relative"
        />
      </div>
    </div>
  );
}

export default App; 