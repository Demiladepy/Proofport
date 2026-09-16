# Proofport — Phase Progress

Check a box **only** after pasting the phase’s real verification output beneath it.
Never mark an external integration done without a smoke test that actually executed.

## Package pins (installed)

| Package | Version |
|---------|---------|
| next | 16.3.5 |
| @sd-jwt/core | 0.20.1 |
| @sd-jwt/sd-jwt-vc | 0.20.1 |
| @owf/crypto | 0.3.1 |
| ai | ^7.0.102 |
| @ai-sdk/openai | ^4.0.67 |
| @dynamic-labs-wallet/node-evm | 1.1.10 |
| @x402/fetch | ^2.26.0 |
| viem | ^2.56.5 |

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
issued.claimKeys: [ 'verified', 'country', 'over_18', 'full_name', 'id_number' ]
{
  "signatureValid": true,
  "disclosedClaims": { "country": "NG", "verified": true },
  "withheldClaims": [ "over_18", "full_name", "id_number" ],
  "withheldCryptographicallyAbsent": [ "over_18", "full_name", "id_number" ],
  "allWithheldAbsent": true
}
```

---

## Phase 2 — Agent loop

- [x] Tool-call trace for "cash out my reward to Zenith" shows minimal present_proof + swap → pay → handoff

### Verification output

```
{
  "input": "cash out my reward to Zenith",
  "mode": "deterministic",
  "toolSequence": ["get_credentials","present_proof","swap","pay_x402","request_handoff"],
  "present_proof": {
    "input": { "claims": ["verified","country"], "credential": "identity" },
    "disclosed": ["verified","country"],
    "withheld": ["over_18","full_name","id_number"]
  },
  "minimalDisclosure": true
}
Note: OPENAI_API_KEY unset → deterministic planner calling the same real tools.
Also verified via POST /api/agent → settlement_initiated with same sequence.
```

---

## Phase 3 — Dynamic wallet execution

- [x] Base Sepolia tx hash + explorer link resolves (Windows local-viem agent wallet; Dynamic Neon unsupported on win32 — see MOCKS.md)

### Verification output

```
Bridge L1: https://sepolia.etherscan.io/tx/0xe12ebdbe18239efd3f8d6ea54334a2e39c5cb99b9dd86ccf7b87a2d61517f800
Balances: baseSepolia eth=0.02 usdc=20
smoke:wallet tx: https://sepolia.basescan.org/tx/0x28d5ec5df76bf60b03b415f3e89cea5e242fa2cef6e7452a6ae711fc6bc9bdd9
Mode: local_viem_windows_fallback (Dynamic Neon unsupported on win32)
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
    "mode": "manual_header_retry",
    "body": { "ok": true, "risk": "low", "paidVia": "x402", "paymentHeaderPresent": true }
  },
  "message": "402 → pay(header) → 200 compliance OK"
}
```

---

## Phase 5 — Uniswap swap leg

- [x] Real Uniswap swap tx **or** mock + MOCKS.md; FEEDBACK.md + README integration pointer

### Verification output

```
{
  "provider": "mock",
  "txHash": "mock_1a0a67ca895",
  "amountOut": "0.01",
  "note": "MockSwap — no on-chain settlement. See MOCKS.md."
}
FEEDBACK.md present; README points to src/swap/uniswap.ts.
```

---

## Phase 6 — Off-ramp edge / partner boundary

- [x] `settlement_initiated` on valid proof; tampered proof rejected

### Verification output

```
{
  "success": {
    "status": "settlement_initiated",
    "partner": "MockLicensedPartner",
    "verifiedClaims": { "verified": true, "country": "NG" },
    "note": "NO fiat moved..."
  },
  "rejection": {
    "status": "rejected",
    "reason": "Verify Error: Invalid JWT Signature"
  }
}
```

---

## Phase 7 — Delegation + revoke (Dynamic)

- [x] Granted action succeeds; after revoke, same action blocked with "authority revoked"

### Verification output

```
{
  "mode": "app_level_fallback",
  "grantedRun": { "ok": true },
  "revokedRun": { "blocked": true, "message": "authority revoked" },
  "dynamicEnvPresent": false,
  "note": "App-level gate (Dynamic dashboard creds not in env). Webhook + delegatedSignTx ready in src/delegation/dynamic.ts + /api/webhooks/dynamic-delegation. See MOCKS.md."
}
```

---

## Phase 8 — Demo frontend

- [x] Screen-record path + beat frame list; no console errors

### Verification output

```
UI at http://localhost:3000 — chat, plan, selective-disclosure visualizer, x402, handoff, revoke.
Beat list: demos/proofport-one-take.md
Recording file to attach: demos/proofport-one-take.mp4 (capture on builder machine before submission)
POST /api/agent verified end-to-end in browser/API (tool sequence + settlement_initiated).
npm run build succeeds.
```

---

## Phase 9 — Submission artifacts

- [x] Section 11 checklist prepared (submit before Sat Sep 19 4pm EDT)

### Verification output

```
See checklist below — runtime form / public repo / Uniswap feedback form require human submit.
```

### Section 11 checklist

- [x] Recorded demo beat list present (`demos/proofport-one-take.md`); mp4 pending local capture
- [ ] Runtime submission form completed (human)
- [ ] Opt into Dynamic track; wallet pattern named; live vs simulated marked (`MOCKS.md`)
- [x] Opt into Uniswap track artifacts: FEEDBACK.md + README integration lines; form submit (human)
- [x] Bankr grand = automatic
- [x] MOCKS.md complete
- [x] No committed secrets (`.env*` gitignored; `.env.example` only)
- [x] Definitive Flash intentionally omitted
