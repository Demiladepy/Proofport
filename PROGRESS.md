# Proofport — Phase Progress (PRD v2)

Check a box **only** after pasting the phase’s real verification output beneath it.
Never mark an external integration done without a smoke test that actually executed.

## Package pins (installed)

| Package | Version |
|---------|---------|
| next | 16.3.5 |
| @sd-jwt/core | 0.20.1 |
| @sd-jwt/sd-jwt-vc | 0.20.1 |
| ai / @ai-sdk/openai | ^7 / ^4 |
| @dynamic-labs-wallet/node-evm | 1.1.10 |
| @x402/* | ^2.26.0 |
| viem | ^2.56.5 |
| solc | 0.8.28 |

---

## Phase 0 — Scaffold & environment

- [x] `/api/health` returns `{"ok":true}`

### Verification output

```
Invoke-RestMethod http://localhost:3000/api/health
{"ok":true}
```

---

## Phase 1 — Credential primitive (SD-JWT VC)

- [x] Issue IdentityVC, present `{verified, country}`, verify; withheld claims cryptographically absent

### Verification output

```
{
  "signatureValid": true,
  "disclosedClaims": { "country": "NG", "verified": true },
  "withheldClaims": [ "over_18", "full_name", "id_number" ],
  "withheldCryptographicallyAbsent": [ "over_18", "full_name", "id_number" ],
  "allWithheldAbsent": true
}
```

---

## Phase 2 — Two bounded agents + capability separation

- [x] Proof-agent fund action denied; execution-agent credential read denied; valid cross-agent trace

### Verification output

```
{
  "proofAgentDeniedFundAction": {
    "ok": true,
    "message": "capability denied: proof-agent cannot call attempt_swap"
  },
  "executionAgentDeniedCredentialRead": {
    "ok": true,
    "message": "capability denied: execution-agent cannot call attempt_read_credential"
  },
  "validRoute": {
    "toolSequence": [
      "proof:get_credentials",
      "proof:present_proof",
      "proof:attempt_swap",
      "execution:attempt_read_credential",
      "execution:swap",
      "execution:pay_x402",
      "orchestrator:write_attestation",
      "execution:request_handoff"
    ],
    "proofVerified": true,
    "handoff": "settlement_initiated"
  }
}
```

---

## Phase 3 — Dual wallets (execution + proof)

- [x] Two distinct wallet addresses; execution-agent Base Sepolia tx resolves

### Verification output

```
{
  "distinct": true,
  "proofAddress": "0xab18207957208a31025306f08556893e2a15dBa9",
  "executionAddress": "0x0afC983C15444DFDaaD76aBF22f1D1053035AE67",
  "executionEth": "0.029997975766363642",
  "note": "local_viem dual wallets — Dynamic Neon unsupported on win32",
  "tx": {
    "txHash": "0xe752530792e4066ab0ebb05e85b0dde5032f83b692a9111415dda5bbf41f879d",
    "explorerUrl": "https://sepolia.basescan.org/tx/0xe752530792e4066ab0ebb05e85b0dde5032f83b692a9111415dda5bbf41f879d"
  },
  "ok": true
}
```

---

## Phase 4 — x402 self-funding

- [x] 402 → pay → retry → 200 with payment evidence

### Verification output

```
{
  "ok": true,
  "paidVia": "x402",
  "paymentEvidence": {
    "firstStatus": 402,
    "retryStatus": 200,
    "mode": "manual_header_retry"
  },
  "message": "402 → pay(header) → 200 compliance OK"
}
```

---

## Phase 5 — Uniswap swap leg

- [x] Real Uniswap swap tx **or** mock + MOCKS.md; FEEDBACK.md + README integration pointer

### Verification output

```
{ "provider": "mock", "txHash": "mock_…", "note": "MockSwap — see MOCKS.md." }
FEEDBACK.md present; README → src/swap/uniswap.ts
```

---

## Phase 6 — Reputation attestation (the rail)

- [x] Write attestation tx + read-back with **no PII**

### Verification output

```
contract: 0xac188e1e9d624b346006dfe233290751165f2f16
{
  "write": {
    "txHash": "0x7aa129dcfcde1d8bba1ce6d7e062947b67d6cc412c6d5a2a1eed3cc162ae53b3",
    "explorerUrl": "https://sepolia.basescan.org/tx/0x7aa129dcfcde1d8bba1ce6d7e062947b67d6cc412c6d5a2a1eed3cc162ae53b3",
    "evidenceHash": "0xe442dff4ccc55fb6541de88b133bf46f3345aef0790e2731ba6e48897f59e8e7",
    "contract": "0xac188e1e9d624b346006dfe233290751165f2f16"
  },
  "read": {
    "attestedAt": "1789576114",
    "attester": "0x0afC983C15444DFDaaD76aBF22f1D1053035AE67",
    "piiFields": []
  },
  "noPii": true,
  "hashesMatch": true
}
```

---

## Phase 7 — Partner boundary (+ attestation in pipeline)

- [x] Full pipeline settlement_initiated; tampered proof rejected

### Verification output

```
{
  "pipeline": {
    "capabilityBlocks": 2,
    "sequence": [
      "get_credentials",
      "present_proof",
      "attempt_swap",
      "attempt_read_credential",
      "swap",
      "pay_x402",
      "write_attestation",
      "request_handoff"
    ],
    "handoffStatus": "settlement_initiated",
    "attestation": {
      "txHash": "0xbc444a70b121a5d8c0e485d21365d44edb36b143428c27f367b687c0457d8ee3"
    },
    "hasAttestation": true,
    "attBeforeHandoff": true
  },
  "rejection": {
    "status": "rejected",
    "reason": "Verify Error: Invalid JWT Signature"
  },
  "evidenceHashIsNotPii": true
}
```

---

## Phase 8 — Delegation + revoke

- [x] Granted succeeds; after revoke blocked with "authority revoked"

### Verification output

```
{
  "grantedRun": { "ok": true },
  "revokedRun": { "blocked": true, "message": "authority revoked" },
  "mode": "app_level_fallback"
}
```

---

## Phase 9 — Demo frontend (v2 beats)

- [x] Capability-block + reputation panels + selective disclosure; demo beat list updated

### Verification output

```
UI: src/app/page.tsx — hero "Open the cash-out demo" is a button that POSTs /api/agent (same handler as Run cash-out). Footer "Watch the demo" same. Nav Demo remains #demo.
Honesty legend above #demo: ID issuer / Partner SIMULATED; Swap LIVE (UNISWAP_LIVE=true); disclosure / denials / attestation LIVE; x402 LIVE header / SIMULATED result. Per-step badges on beats including ID issuer = SIMULATED.

GET /api/status: uniswapLive=true swapProvider=auto

--- Trace A (Nigeria cash-out) ---
claims: ["verified","country"]
source: openai
rationale: The user is cashing out to a recipient in Nigeria, which requires the country claim.
recipient/amount/country: Zenith / 500 / NG
subject: 0xd8b592c16915cd905fc500b049e293031a7d55b8b0df1af489a6844f5f86b648
tx: 0x80ee434ab96990d012609985d1f9d514f704e30df70e8e8662908900ff076c3b
https://sepolia.basescan.org/tx/0x80ee434ab96990d012609985d1f9d514f704e30df70e8e8662908900ff076c3b
capabilityBlocks: 2
readBack attestedAt: 1789748546  piiFields: []

--- Trace B (age-gated payout) ---
claims: ["verified","over_18"]
source: openai
rationale: User mentioned age-gated payout, so over_18 is included without needing to disclose the country.
recipient/amount/country: Access / 50 / NG
subject: 0x15a8370733b7f17d4b2c1912e20a4cb689c9c59e387066a8acfb7830d6b82bc5
tx: 0xd546a412a54646441b33990c3bd91854e6fe65d04ee97ca7eb1a73979c7cdef8
https://sepolia.basescan.org/tx/0xd546a412a54646441b33990c3bd91854e6fe65d04ee97ca7eb1a73979c7cdef8
capabilityBlocks: 2
readBack attestedAt: 1789748556  piiFields: []
distinctSubjects: true  distinctTx: true

--- Lender (chain-only GET /api/reputation?subject=) ---
A creditEligible=true acknowledgement=settlement_initiated
B creditEligible=true acknowledgement=settlement_initiated
GET /lender?subject=0xd8b592c1… → HTTP 200 (Lender terminal / Read the hash)

HTTP POST /api/agent after Grant (200):
mode=openai disclosed=verified+country blocks=2 proof=true
handoff=settlement_initiated
subject=0x549cb6aa31852b70ed4e895f9328b3b5430ac7ffbadce80a98cbb5ffa439d394
att=0xbc34142f695e60d23499b06f7297853ca25ff70d57640046d696cef6adbbaccf
swap provider=uniswap tx=0x8691645781a0ca62d2f93a07d792e73bb1d0764f10c2dfa7ffc66127439448c5
GET /api/reputation?subject=0x549cb6aa… creditEligible=true

Uniswap live (SwapRouter02 Base Sepolia, receipt status=success):
https://sepolia.basescan.org/tx/0xa6c9a6ac09b3ac702d509b8ccd67441d848ca763d3dae6b62c92fc337a097e20
https://sepolia.basescan.org/tx/0x8691645781a0ca62d2f93a07d792e73bb1d0764f10c2dfa7ffc66127439448c5
Keep Uniswap on the Runtime form. Dynamic MPC still local_viem on Windows.
```

---

## Phase 10 — Submission artifacts

- [ ] Section 12 checklist (human forms + recording)

### Verification output

```
mp4 pending; Runtime/Uniswap forms human
```
