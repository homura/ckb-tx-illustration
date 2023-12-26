# ckb-tx-illustration

To install dependencies:

```bash
bun install
```

To run:

```bash
cd examples
bun run dev
```

## Quick Start

```ts
import { createTransactionIllustration } from "ckb-tx-illustration";

createTransactionIllustration({
  data: {
    txHash: "0x...",
    inputs: [{ capacity, lock, type, data }],
    outputs: [{ capacity, lock, type, data }],
  },
});
```
