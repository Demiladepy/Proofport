# Proofport — Mocks & Simulated Boundaries

Honesty ledger for judges (Dynamic asks live vs simulated to be marked).

| Boundary | Live / Simulated | Why |
|----------|------------------|-----|
| Identity / Provenance issuer (NIN/BVN stand-in) | **Simulated** | No real government issuer; local mock issuer keypair signs SD-JWT VCs |
| Licensed partner off-ramp | **Simulated** | Legal fence — we do **not** move fiat, touch a bank, or settle naira. Endpoint returns `settlement_initiated` after proof verify |
| Uniswap swap | **Mock by default** (`SWAP_PROVIDER=mock` / auto-fallback) | Base Sepolia liquidity often empty; set `SWAP_PROVIDER=uniswap` + funded key to attempt live SwapRouter02 |
| Dynamic server wallet tx | **Intended live** when `DYNAMIC_*` set | Without env, smoke uses optional `DEMO_AGENT_PRIVATE_KEY` viem fallback (not Dynamic) — do not claim Dynamic for that path |
| x402 compliance-check fee | **Protocol demo** | Local `/api/compliance-check` returns 402; client retries with payment header. Full ExactEvmScheme+facilitator when `@x402/*` + funded USDC wallet configured |
| Compliance API business logic | **Simulated** | Returns mock low-risk result after payment |
| Dynamic delegated-access | **Webhook + app revoke gate** | Real webhook store at `/api/webhooks/dynamic-delegation`; grant/revoke enforced in-app. Full MPC `delegatedSignTransaction` requires dashboard delegation + webhook credentials |

## Explicitly not mocked (when gates pass)

- SD-JWT selective disclosure cryptography (`@sd-jwt/sd-jwt-vc`)
- Agent tool sequencing (deterministic planner always; OpenAI ToolLoopAgent when `OPENAI_API_KEY` set)
- Partner boundary proof re-verification (rejects tampered presentations)

## Definitive Flash

Intentionally omitted (off-thesis; competes with Uniswap leg).
