# Proofport — Mocks & Simulated Boundaries

Honesty ledger for judges (Dynamic asks live vs simulated to be marked).

| Boundary | Live / Simulated | Why |
|----------|------------------|-----|
| Identity / Provenance issuer (NIN/BVN stand-in) | **Simulated** | No real government issuer; local mock issuer keypair signs SD-JWT VCs |
| Licensed partner off-ramp | **Simulated** | Legal fence — we do **not** move fiat, touch a bank, or settle naira. Endpoint returns `settlement_initiated` after proof verify |
| Uniswap swap | **Mock by default** (`SWAP_PROVIDER=mock` / auto-fallback) | Base Sepolia liquidity often empty; set `SWAP_PROVIDER=uniswap` + funded key to attempt live SwapRouter02 |
| Dual agent wallets | **local_viem on Windows** | Dynamic Node MPC (Neon) is darwin/linux only. Proof + execution keys via `PROOF_AGENT_PRIVATE_KEY` / `EXECUTION_AGENT_PRIVATE_KEY` (or `DEMO_AGENT_PRIVATE_KEY` for execution). Addresses in `.data/wallets-v2.json`. WSL for real Dynamic. |
| x402 compliance-check fee | **Protocol demo (manual header retry)** | Not live ExactEvmScheme settlement. Payer = execution wallet USDC; `X402_PAY_TO` = receiver. Mode: `manual_header_retry`. |
| Compliance API business logic | **Simulated** | Returns mock low-risk result after payment |
| Reputation attestation | **Live on Base Sepolia** when deployed | Custom `ReputationAttestation` — hashes only (subject/kind/evidenceHash). No PII fields in ABI. |
| Dynamic delegated-access | **App-level grant/revoke** | Real webhook store at `/api/webhooks/dynamic-delegation`; grant/revoke enforced in-app. Full MPC `delegatedSignTransaction` remains stretch on win32. |

## Explicitly not mocked (when gates pass)

- SD-JWT selective disclosure cryptography (`@sd-jwt/sd-jwt-vc`)
- Two-agent capability denials (tool-registry hard throw, not prompt)
- Orchestrator tool sequencing (deterministic; OpenAI when `OPENAI_API_KEY` set)
- Partner boundary proof re-verification (rejects tampered presentations)
- Onchain reputation write/read (after `npm run deploy:reputation`)

## Definitive Flash

Intentionally omitted (off-thesis; competes with Uniswap leg).
