import {
  color,
  create,
  hierarchy,
  linkHorizontal,
  scaleOrdinal,
  schemeAccent,
  select,
  tree,
} from "d3";
import type { HierarchyPointNode, Selection } from "d3";

const ONE_CKB = 10n ** 8n;

type Node = TransactionNode | CellNode;

type TransactionNode = {
  kind: "tx";
  txHash: string;
  children: CellNode[];
};

type CellNode = { kind: "cell" } & CellInfo;

export type CellInfo = {
  capacity: string;
  lock: Script;
  type?: Script;
  data: string;
};

type Script = {
  codeHash: string;
  args: string;
  hashType: "data" | "data1" | "data2" | "type";
};

export type TransactionIllustrationConfig = {
  data: {
    inputs: CellInfo[];
    outputs: CellInfo[];
    txHash: string;
  };
  renderTransactionInfo?: (txHash: string) => string;
  renderCellInfo?: (info: CellInfo) => string;
};

type HierarchyPoint = HierarchyPointNode<Node>;

export function createTransactionIllustration(
  config: TransactionIllustrationConfig,
): SVGElement {
  const {
    data,
    renderCellInfo = defaultRenderCellInfo,
    renderTransactionInfo = defaultRenderTransactionInfo,
  } = config;

  const width = 960;

  const inputsHierarchy = hierarchy<Node>({
    kind: "tx",
    txHash: data.txHash,
    children: data.inputs.map((item) => ({ ...item, kind: "cell" })),
  });
  const outputsHierarchy = hierarchy<Node>({
    kind: "tx",
    txHash: "", //empty here because the outputs also render as a tree, and the root node transaction is rendered in the inputs tree
    children: data.inputs.map((item) => ({ ...item, kind: "cell" })),
  });

  const dx = 20;
  const dy = width / (inputsHierarchy.height + outputsHierarchy.height + 1);

  const layoutTree = tree<Node>().nodeSize([dx, dy]);

  const inputs = layoutTree(inputsHierarchy);
  const outputs = layoutTree(outputsHierarchy);

  let x0 = Infinity;
  let x1 = -x0;
  inputs.each((d) => {
    if (d.x > x1) x1 = d.x;
    if (d.x < x0) x0 = d.x;
  });
  outputs.each((d) => {
    if (d.x > x1) x1 = d.x;
    if (d.x < x0) x0 = d.x;
  });

  const height = x1 - x0 + dx * 2;

  const svg = create("svg")
    .attr("viewBox", [-dy - dx - 100, x0 - dx, width, height])
    .attr("style", "max-width: 100%; height: auto;");

  // inputs links
  drawLinks(inputs).attr(
    "d",
    linkHorizontal<unknown, HierarchyPoint>()
      .x((d) => -d.y)
      .y((d) => d.x),
  );

  // outputs links
  drawLinks(outputs).attr(
    "d",
    linkHorizontal<unknown, HierarchyPoint>()
      .x((d) => d.y)
      .y((d) => d.x),
  );

  function drawLinks(data: HierarchyPoint) {
    return svg
      .append("g")
      .attr("fill", "none")
      .attr("stroke", "#555")
      .attr("stroke-opacity", 0.4)
      .attr("stroke-width", 1.5)
      .selectAll()
      .data(data.links())
      .join("path");
  }

  const dyeAddress = scaleOrdinal(schemeAccent);

  const inputNodes = drawNodes(inputs).attr(
    "transform",
    (d) => `translate(-${d.y},${d.x})`,
  );
  drawCircles(inputNodes);
  drawText(inputNodes)
    .attr("text-anchor", (d) => (d.data.kind === "cell" ? "end" : "start"))
    .attr("transform", (d) =>
      d.data.kind === "cell" ? "translate(-5,6)" : "translate(5,6)",
    );

  const outputNodes = drawNodes(outputs).attr(
    "transform",
    (d) => `translate(${d.y},${d.x})`,
  );
  drawCircles(outputNodes);
  drawText(outputNodes).attr("transform", `translate(5,6)`);

  function drawNodes(data: HierarchyPoint) {
    return svg
      .append("g")
      .attr("stroke-linejoin", "round")
      .attr("stroke-width", 3)
      .selectAll()
      .data(data)
      .join("g");
  }

  function drawCircles(
    selection: Selection<
      SVGGElement | null,
      HierarchyPoint,
      SVGGElement,
      undefined
    >,
  ) {
    return selection
      .append("circle")
      .attr("fill", (d) => (d.children ? "#555" : "#999"))
      .attr("r", ({ data }) => {
        if (data.kind === "cell") {
          return Math.log10(Number(BigInt(data.capacity) / ONE_CKB));
        }
        if (data.kind === "tx") {
          const total = (data.children || []).reduce(
            (sum, item) =>
              sum + (item.kind === "cell" ? BigInt(item.capacity) : 0n),
            0n,
          );
          return Math.log10(Number(BigInt(total) / ONE_CKB));
        }

        return 0;
      })
      .on("mouseover.fill", function () {
        const fill = select(this).attr("fill");
        select(this).attr("fill", color(fill)!.brighter().formatHex());
      })
      .on("mouseout.fill", function () {
        const fill = select(this).attr("fill");
        select(this).attr("fill", color(fill)!.darker().formatHex());
      });
  }

  function drawText(
    selection: Selection<
      SVGGElement | null,
      HierarchyPoint,
      SVGGElement,
      undefined
    >,
  ) {
    return selection
      .append("text")
      .attr("fill", ({ data }) => {
        if (data.kind === "cell") return dyeAddress(data.lock.args);
        return "";
      })
      .attr("stroke-width", 0.5)
      .attr("stroke", ({ data }) => {
        if (data.kind === "cell") {
          return color(dyeAddress(data.lock.args))!.darker().formatHex();
        }
        return "";
      })
      .text(({ data }) => {
        if (data.kind === "tx" && data.txHash) {
          return renderTransactionInfo(data.txHash);
        }
        if (data.kind === "cell") {
          return renderCellInfo(data);
        }

        return "";
      });
  }

  return svg.node()!;
}

function defaultRenderTransactionInfo(txHash: string): string {
  return txHash;
}

function defaultRenderCellInfo(info: CellInfo): string {
  const capacity = info.capacity;
  const ckbPart = BigInt(capacity) / ONE_CKB;
  const shannonPart = BigInt(capacity) % ONE_CKB;

  if (!shannonPart) return `${ckbPart} CKB`;
  return `${ckbPart}.${shannonPart} CKB`;
}
