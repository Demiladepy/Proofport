# Proofport — Mocks & Simulated Boundaries

Honesty ledger. Unlabeled mocks look like fraud. These are **choices** (legal, testnet, Windows), not laziness.

| Boundary | Live / Simulated | Why |
|----------|------------------|-----|
| Identity / Provenance issuer (NIN/BVN stand-in) | **SIMULATED** | **Legal.** No real government issuer. Local mock keypair signs SD-JWT VCs. |
| Licensed partner off-ramp / bank | **SIMULATED** | **Legal.** We are not a money transmitter. No fiat, no naira, no bank API. Returns `settlement_initiated` after proof verify. |
| Uniswap swap | **LIVE** (tiny ETH→USDC on Base Sepolia) | **Testnet.** Cash-out tries the Trading API first when `UNISWAP_API_KEY` is set, then SwapRouter02. Sepolia Trading API quotes currently 404/timeout for this pair; SwapRouter02 is the fill that has confirmed: [`0xa6c9a6ac…097e20`](https://sepolia.basescan.org/tx/0xa6c9a6ac09b3ac702d509b8ccd67441d848ca763d3dae6b62c92fc337a097e20) and pipeline [`0x86916457…39448c5`](https://sepolia.basescan.org/tx/0x8691645781a0ca62d2f93a07d792e73bb1d0764f10c2dfa7ffc66127439448c5). Both live paths failing falls back to mock and must be labeled. |
| Dual agent wallets | **local_viem on Windows** | **Windows.** Dynamic Node MPC (Neon) is darwin/linux only. Keys via `PROOF_AGENT_PRIVATE_KEY` / `EXECUTION_AGENT_PRIVATE_KEY`. WSL for a real Dynamic server wallet. |
| Dynamic delegated-access MPC sign | **App-level grant/revoke** | **Windows.** Webhook exists; `delegatedSignTransaction` is not the live path on win32. |
| x402 compliance-check fee | **LIVE header / SIMULATED result** | 402 → payment header → 200 is demonstrable. Body is `mock_compliance`. Not ExactEvmScheme settlement unless the facilitator path confirms. |
| Compliance business logic | **SIMULATED** | Mock low-risk result after the header loop. |
| Reputation attestation | **LIVE on Base Sepolia** | Custom `ReputationAttestation`: subject / kind / evidenceHash only. No PII in ABI. |

## Explicitly not mocked (when gates pass)

- SD-JWT selective disclosure cryptography (`@sd-jwt/sd-jwt-vc`)
- Two-agent capability denials (tool-registry hard throw, not prompt)
- Orchestrator sequencing (deterministic execution; one optional OpenAI claim-selection)
- Partner boundary proof re-verification (rejects tampered presentations)
- Onchain reputation write/read

## Definitive Flash

Intentionally omitted (off-thesis; competes with Uniswap leg).
