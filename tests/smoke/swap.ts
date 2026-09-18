import "dotenv/config";
import { privateKeyToAccount } from "viem/accounts";
import { executeSwap, assertValidSwapRequest } from "../../src/swap";
import {
  getOutputAmount,
  prepareSwapRequest,
  isUniswapXQuote,
  hasTradingApiKey,
  probeTradingApiQuote,
  type QuoteResponse,
} from "../../src/swap/trading-api";
import { quoteUniswapV3 } from "../../src/swap/uniswap";

function forceMock() {
  process.env.SWAP_PROVIDER = "mock";
  process.env.UNISWAP_LIVE = "false";
}

function testPrepareSwapRequest() {
  const classic = {
    routing: "CLASSIC",
    quote: { input: {}, output: {} },
    permitData: null,
  };
  const classicBody = prepareSwapRequest(classic);
  if ("permitData" in classicBody) {
    throw new Error("CLASSIC permitData:null must be stripped");
  }

  const permit = { domain: {}, types: {}, values: {} };
  const classicPermit = prepareSwapRequest(
    { routing: "CLASSIC", quote: {}, permitData: permit },
    "0xsig",
  );
  if (classicPermit.signature !== "0xsig" || classicPermit.permitData !== permit) {
    throw new Error("CLASSIC Permit2 must send signature + permitData");
  }

  const dutch = {
    routing: "DUTCH_V2",
    quote: { encodedOrder: "0xabc" },
    permitData: permit,
  };
  const dutchBody = prepareSwapRequest(dutch, "0xsig");
  if ("permitData" in dutchBody) {
    throw new Error("UniswapX permitData must not go to /swap");
  }
  if (dutchBody.signature !== "0xsig") {
    throw new Error("UniswapX must send signature only");
  }

  const wrapped = { quote: classic };
  if (!("quote" in wrapped)) throw new Error("sanity");
}

function testQuoteShapes() {
  const classic: QuoteResponse = {
    routing: "CLASSIC",
    quote: {
      input: { token: "0x0", amount: "1" },
      output: { token: "0x1", amount: "42" },
    },
    permitData: null,
  };
  if (isUniswapXQuote(classic) || getOutputAmount(classic) !== "42") {
    throw new Error("CLASSIC output amount");
  }
  const dutch: QuoteResponse = {
    routing: "DUTCH_V2",
    quote: {
      orderInfo: {
        outputs: [
          { token: "0x1", startAmount: "99", endAmount: "90", recipient: "0x2" },
        ],
        input: { token: "0x0", startAmount: "1", endAmount: "1" },
        deadline: 1,
        nonce: "0",
      },
      encodedOrder: "0x",
      orderHash: "0x",
    },
    permitData: null,
  };
  if (!isUniswapXQuote(dutch) || getOutputAmount(dutch) !== "99") {
    throw new Error("UniswapX output amount");
  }
}

function testValidation() {
  let threw = false;
  try {
    assertValidSwapRequest({
      amountIn: "1;drop",
      fromToken: "ETH",
      toToken: "USDC",
    });
  } catch {
    threw = true;
  }
  if (!threw) throw new Error("invalid amount must be rejected");
  assertValidSwapRequest({ amountIn: "0.0001", fromToken: "ETH", toToken: "USDC" });
}

async function main() {
  testPrepareSwapRequest();
  testQuoteShapes();
  testValidation();

  forceMock();
  const result = await executeSwap({
    amountIn: "0.01",
    fromToken: "ETH",
    toToken: "USDC",
  });
  if (result.provider !== "mock" || !result.txHash) {
    throw new Error("mock swap failed");
  }

  const report: Record<string, unknown> = {
    mock: true,
    txHash: result.txHash,
    prepareSwapRequest: "ok",
    quoteShapes: "ok",
    validation: "ok",
  };

  if (hasTradingApiKey()) {
    try {
      const pk =
        process.env.EXECUTION_AGENT_PRIVATE_KEY ??
        process.env.DEMO_AGENT_PRIVATE_KEY;
      if (!pk) throw new Error("no execution key for quote probe");
      const account = privateKeyToAccount(
        (pk.startsWith("0x") ? pk : `0x${pk}`) as `0x${string}`,
      );
      const quote = await probeTradingApiQuote(
        { amountIn: "0.0001", fromToken: "ETH", toToken: "USDC" },
        account.address,
      );
      report.tradingApiQuote = { ok: true, ...quote };
    } catch (err) {
      report.tradingApiQuote = {
        ok: false,
        error: err instanceof Error ? err.message : String(err),
      };
    }
  } else {
    report.tradingApiQuote = { ok: false, error: "UNISWAP_API_KEY not set" };
  }

  try {
    const v3 = await quoteUniswapV3({
      amountIn: "0.0001",
      fromToken: "ETH",
      toToken: "USDC",
    });
    report.swapRouter02Quote = { ok: true, amountOut: v3.amountOut, fee: v3.fee };
  } catch (err) {
    report.swapRouter02Quote = {
      ok: false,
      error: err instanceof Error ? err.message : String(err),
    };
  }

  console.log(JSON.stringify(report, null, 2));
  if (!result.txHash) {
    process.exitCode = 1;
    throw new Error("swap failed");
  }
}

main().catch((e) => {
  console.error(e);
  process.exitCode = 1;
});
