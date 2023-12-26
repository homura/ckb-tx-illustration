import React, { useEffect, useMemo, useRef, useState } from "react";
import {
  CellInfo,
  createTransactionIllustration,
  TransactionIllustrationConfig,
} from "../../src";
import { helpers, RPC } from "@ckb-lumos/lumos";

type ConfigData = TransactionIllustrationConfig["data"];

export const TransactionIllustration: React.FC<{
  hash: string;
  isMainnet?: boolean;
  url?: string;
  onCellClick?: (nextTxHash: string) => void;
}> = ({ hash: txHash, isMainnet, url: inputUrl, onCellClick }) => {
  const [txData, setTxData] = useState<ConfigData>();
  const domRef = useRef<HTMLDivElement | null>(null);

  const url = useMemo(() => {
    if (inputUrl) return inputUrl;
    if (isMainnet) return "https://mainnet.ckb.dev";
    return "https://testnet.ckb.dev";
  }, [inputUrl, isMainnet]);

  useEffect(() => {
    getTxData({ txHash, url }).then(setTxData);
  }, [txHash, url]);

  useEffect(() => {
    if (!txData) {
      return;
    }
    domRef.current?.replaceChildren(
      createTransactionIllustration({
        data: txData,
        renderCellInfo: (cell) => {
          return truncateMiddle(helpers.encodeToAddress(cell.lock), 6, 4);
        },
        renderTransactionInfo: (txHash) => {
          return truncateMiddle(txHash);
        },
      }),
    );
  }, [txData, isMainnet, onCellClick]);

  if (!txData) return null;
  return <div style={{ width: "100%", height: "100%" }} ref={domRef}></div>;
};

async function getTxData({
  url,
  txHash,
}: {
  url: string;
  txHash: string;
}): Promise<ConfigData> {
  const rpc = new RPC(url);
  const tx = await rpc.getTransaction(txHash);

  const outputs = tx.transaction.outputs.map<CellInfo>((output, index) => ({
    ...output,
    data: tx.transaction.outputsData[index] || "0x",
  }));

  const inputsPromise = tx.transaction.inputs.map<Promise<CellInfo>>(
    async (input) => {
      const previousTxHash = input.previousOutput.txHash;
      const previousTx = await rpc.getTransaction(previousTxHash);

      const index = Number(input.previousOutput.index);
      const output = previousTx.transaction.outputs[index];
      const data = previousTx.transaction.outputsData[index] || "0x";

      return { ...output, data };
    },
  );

  const inputs = await Promise.all(inputsPromise);

  return { inputs, outputs, txHash };
}

function truncateMiddle(str: string, start = 6, end = start) {
  return `${str.slice(0, start)}...${str.slice(-end)}`;
}
