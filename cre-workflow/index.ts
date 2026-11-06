/**
 * Heartbeat Protocol — Chainlink CRE Workflow
 *
 * Real Chainlink CRE SDK (TypeScript compiled to WASM) workflow that:
 *  1. Triggers every minute via CronCapability
 *  2. Fetches the latest Arbitrum Sepolia block telemetry via HTTPClient (Alchemy RPC)
 *  3. Detects suspicious high-frequency / gas arrhythmia anomalies
 *  4. AI-classifies vital threats via HTTPClient -> Ollama (llama3.1:8b)
 *  5. Reads current on-chain state via EVMClient.callContract (VitalRegistry)
 *  6. Records confirmed threats via EVMClient.writeReport (CRE report mechanism)
 *
 * Compile:  bun x cre-compile index.ts
 * Simulate: cre workflow simulate . --target local-simulation --trigger-index 0 --broadcast
 */

import {
  CronCapability,
  HTTPClient,
  EVMClient,
  handler,
  Runner,
  type Runtime,
  ok,
  json,
  encodeCallMsg,
  prepareReportRequest,
  LAST_FINALIZED_BLOCK_NUMBER,
  consensusIdenticalAggregation,
} from "@chainlink/cre-sdk";
import {
  encodeFunctionData,
  decodeFunctionResult,
  type Address,
  zeroAddress,
  type Hex,
} from "viem";

// ── Configuration type ────────────────────────────────────────────────────────
type Config = {
  riskRegistryAddress: string;
  guardianAddress: string;
  vulnerableProtocolAddress: string;
  alchemyRpcUrl: string;
  ollamaBaseUrl: string;
  ollamaModel: string;
};

// ── ABI (minimal subset for reads and writes) ─────────────────────────────────
const VITAL_REGISTRY_ABI = [
  {
    name: "eventCount",
    type: "function",
    inputs: [],
    outputs: [{ name: "", type: "uint256" }],
    stateMutability: "view",
  },
  {
    name: "recordThreat",
    type: "function",
    inputs: [
      { name: "protocol",       type: "address" },
      { name: "token",          type: "address" },
      { name: "amount",         type: "uint256" },
      { name: "riskLevel",      type: "uint8" },
      { name: "actionType",     type: "uint8" },
      { name: "exploitPattern", type: "string" },
    ],
    outputs: [{ name: "", type: "uint256" }],
    stateMutability: "nonpayable",
  },
] as const;

// Arbitrum Sepolia chain selector
const ARB_SEPOLIA_CHAIN_SELECTOR = 3478487238524512106n;

// ── Workflow handler ──────────────────────────────────────────────────────────
const heartbeatWatch = (runtime: Runtime<Config>) => {
  const {
    riskRegistryAddress,
    vulnerableProtocolAddress,
    alchemyRpcUrl,
    ollamaBaseUrl,
    ollamaModel,
  } = runtime.config;

  runtime.log("Heartbeat: scanning Arbitrum Sepolia telemetry for exploit arrhythmias…");

  const httpClient = new HTTPClient();
  const evmClient = new EVMClient(ARB_SEPOLIA_CHAIN_SELECTOR);

  // ── Step 1: Fetch latest block via HTTP (Alchemy JSON-RPC) ──────────────────
  const blockPayload = new TextEncoder().encode(
    JSON.stringify({
      jsonrpc: "2.0",
      method: "eth_getBlockByNumber",
      params: ["latest", false],
      id: 1,
    }),
  );

  const blockData = httpClient.sendRequest(
    runtime,
    (sendRequester) => {
      const resp = sendRequester
        .sendRequest({
          url: alchemyRpcUrl,
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: blockPayload,
        })
        .result();

      if (!ok(resp)) {
        throw new Error(`Alchemy RPC error: ${resp.statusCode}`);
      }

      return json(resp) as {
        result: {
          number: string;
          transactions: string[];
          timestamp: string;
          gasUsed: string;
        };
      };
    },
    consensusIdenticalAggregation(),
  )().result();

  const blockNumber = parseInt(blockData.result.number, 16);
  const txCount = blockData.result.transactions.length;
  const gasUsed = parseInt(blockData.result.gasUsed, 16);

  runtime.log(`Block ${blockNumber}: ${txCount} txs, gasUsed=${gasUsed}`);

  // ── Step 2: Heuristic vital scoring ──────────────────────────────────────────
  const txScore  = txCount  > 10 ? 50 : txCount  > 5 ? 30 : 10;
  const gasScore = gasUsed  > 1_500_000 ? 40 : gasUsed > 400_000 ? 25 : 5;
  const riskScore = Math.min(100, txScore + gasScore);

  runtime.log(`Arrhythmia score: ${riskScore}/100`);

  if (riskScore < 50) {
    runtime.log("Normal rhythm — no vital threat detected");
    return { blockNumber, riskScore, action: "MONITOR" as const };
  }

  // ── Step 3: AI exploit classification via Ollama ────────────────────────────
  const prompt = `Analyze this blockchain activity for DeFi exploits:
Block: ${blockNumber}, Transactions: ${txCount}, Gas: ${gasUsed}, ArrhythmiaScore: ${riskScore}
Target Protocol: ${vulnerableProtocolAddress}

Respond with JSON only:
{"exploitType":"reentrancy|flashloan|oracle|none","confidence":<0-100>,"severity":<1-5>,"action":"WITHDRAW|ALERT|MONITOR"}`;

  const aiPayload = new TextEncoder().encode(
    JSON.stringify({
      model: ollamaModel,
      prompt,
      stream: false,
      format: "json",
    }),
  );

  const aiResult = httpClient.sendRequest(
    runtime,
    (sendRequester) => {
      const resp = sendRequester
        .sendRequest({
          url: `${ollamaBaseUrl}/api/generate`,
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: aiPayload,
        })
        .result();

      if (!ok(resp)) {
        throw new Error(`Ollama error: ${resp.statusCode}`);
      }

      const body = json(resp) as { response: string };
      return JSON.parse(body.response) as {
        exploitType: string;
        confidence: number;
        severity: number;
        action: string;
      };
    },
    consensusIdenticalAggregation(),
  )().result();

  runtime.log(
    `AI Vital Diagnostics: ${aiResult.exploitType} confidence=${aiResult.confidence}% ` +
      `severity=${aiResult.severity}/5 -> ${aiResult.action}`,
  );

  // ── Step 4: Read current on-chain state ──────────────────────────────────
  const eventCountCallData = encodeFunctionData({
    abi: VITAL_REGISTRY_ABI,
    functionName: "eventCount",
  });

  const callResult = evmClient
    .callContract(runtime, {
      call: encodeCallMsg({
        from: zeroAddress,
        to: riskRegistryAddress as Address,
        data: eventCountCallData,
      }),
      blockNumber: LAST_FINALIZED_BLOCK_NUMBER,
    })
    .result();

  const [currentEventCount] = decodeFunctionResult({
    abi: VITAL_REGISTRY_ABI,
    functionName: "eventCount",
    data: callResult.data as Hex,
  }) as [bigint];

  runtime.log(`VitalRegistry.eventCount = ${currentEventCount.toString()}`);

  // ── Step 5: Record threat on-chain via CRE report ────────────────────────
  if (aiResult.confidence >= 80 && aiResult.severity >= 3) {
    const riskLevel = aiResult.severity >= 5 ? 3
                    : aiResult.severity === 4 ? 3  // CRITICAL
                    : aiResult.severity === 3 ? 2  // HIGH
                    : aiResult.severity === 2 ? 1  // MEDIUM
                    : 0;                            // LOW

    const actionType = aiResult.severity >= 4 ? 1 : 0;
    const amountWei = BigInt("15500000000000000000");

    const recordThreatData = encodeFunctionData({
      abi: VITAL_REGISTRY_ABI,
      functionName: "recordThreat",
      args: [
        vulnerableProtocolAddress as Address,
        "0xEeeeeEeeeEeEeeEeEeEeeEEEeeeeEeeeeeeeEEeE" as Address,
        amountWei,
        riskLevel,
        actionType,
        `${aiResult.exploitType}: detected by Heartbeat (action=${aiResult.action})`,
      ],
    });

    const report = runtime.report(prepareReportRequest(recordThreatData)).result();

    const writeResult = evmClient
      .writeReport(runtime, {
        receiver: riskRegistryAddress as `0x${string}`,
        report,
        gasConfig: { gasLimit: "500000" },
      })
      .result();

    runtime.log(
      `Threat recorded on-chain: exploit=${aiResult.exploitType} severity=${aiResult.severity}`,
    );

    return {
      blockNumber,
      riskScore,
      exploitType: aiResult.exploitType,
      confidence: aiResult.confidence,
      severity: aiResult.severity,
      action: aiResult.action,
      previousEventCount: currentEventCount.toString(),
    };
  }

  runtime.log(
    `Below recording threshold (confidence=${aiResult.confidence}, severity=${aiResult.severity}) — monitoring`,
  );
  return {
    blockNumber,
    riskScore,
    exploitType: aiResult.exploitType,
    confidence: aiResult.confidence,
    severity: aiResult.severity,
    action: "MONITOR" as const,
  };
};

// ── Workflow initialization ───────────────────────────────────────────────────
const initWorkflow = (config: Config) => {
  const cron = new CronCapability();
  return [
    handler(
      cron.trigger({ schedule: "0 */1 * * * *" }),
      heartbeatWatch,
    ),
  ];
};

// ── Entry point ───────────────────────────────────────────────────────────────
export async function main() {
  const runner = await Runner.newRunner<Config>();
  await runner.run(initWorkflow);
}
