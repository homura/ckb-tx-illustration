import { TransactionIllustration } from "./TransactionIllustration";
import { BaseSyntheticEvent, useCallback, useState } from "react";

function App() {
  const [rpc, setRpc] = useState("https://mainnet.ckb.dev");
  const [isMainnet, setIsMainnet] = useState(true);
  const [txHash, setTxHash] = useState(
    "0x24b466166c2293cfea17c75d87ebd1acbd8744111510be81a139d4ba7d0996f8",
  );

  const onChange = useCallback((e: BaseSyntheticEvent) => {
    e.preventDefault();
    const [rpcInput, mainnetInput, txHashInput]: [
      HTMLInputElement,
      HTMLInputElement,
      HTMLInputElement,
    ] = e.target;

    setRpc(rpcInput.value);
    setIsMainnet(mainnetInput.checked);
    setTxHash(txHashInput.value);
  }, []);

  return (
    <div>
      <form onSubmit={onChange}>
        <label htmlFor="rpc">RPC</label>
        <input id="rpc" defaultValue={rpc} />

        <br />

        <label htmlFor="isMainnet">Mainnet</label>
        <input id="isMainnet" type="checkbox" defaultChecked={isMainnet} />

        <br />

        <label htmlFor="txHash">TxHash</label>
        <input id="txHash" defaultValue={txHash} />

        <br />

        <button type="submit">OK</button>
      </form>
      <TransactionIllustration
        hash={txHash}
        isMainnet={isMainnet}
        url={rpc}
        onCellClick={setTxHash}
      />
    </div>
  );
}

export default App;
