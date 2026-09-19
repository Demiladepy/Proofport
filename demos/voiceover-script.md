# Voiceover script

Two cuts. Use the one that matches the submission form's length limit —
**check that before recording.** `SUBMISSION.md` assumes 90s.

Pace: about **135 words per minute**. That is slower than conversation and it is
correct for technical narration. Do not rush to fill silence — let a hash land
on screen without words over it.

Read it once out loud before recording. Anything you stumble on, change. Your
mouth is right and the page is wrong.

---

## Cut A — full length (2:23)

~300 words. Timings are targets; slide them to match your footage.

### 0:00–0:12 · Proof wall, rows flipping green

> Everything I am about to claim is already on-chain. And right now, your own
> browser is checking it. Not my server. I am not in that request path.

*(pause — let a row hit VERIFIED)*

### 0:12–0:30 · Scroll to the black panel

> I built this because of my own bank. To confirm one fact about me, they wanted
> every document I had. Stored forever.
>
> Bola is a freelancer in Lagos. She needs credit. She should not have to hand
> over her identity to get it.

### 0:30–0:44 · Switch to the app, click Grant, then run

> Verification and identification got welded together. There is no technical
> reason for that. Proofport takes them apart.
>
> One click of Grant, and the agent has authority.

### 0:44–1:02 · Selective disclosure card

> The counterparty learns she is verified, and her country. That is all.
>
> Her name and her ID are not hidden by the interface. They are cryptographically
> absent from the presentation. There is nothing there to leak.

### 1:02–1:20 · Capability block card

> Two agents, split by capability. The proof agent cannot move money. The
> execution agent cannot read identity.
>
> That is not a rule I asked a model to follow. It is a throw in the tool
> registry. The call does not return.

### 1:20–1:44 · Delegated authority card, then click into Basescan

> Authority here is a Dynamic MPC wallet. Watch the sender.
>
> That transaction was signed by the server wallet itself. My local key was not
> used for it at all — and I could not have forged that field.

*(pause on the `From` line — 2 full seconds, no words)*

### 1:44–2:04 · Attestation, then the lender terminal

> What lands on-chain is a hash. Three opaque words. No name, no ID, nothing
> reversible.
>
> The lender reads that hash and returns credit eligible. It never learns who she
> is.

### 2:04–2:18 · Revoke, then try to run

> And the authority is revocable. Revoke, and the machine stops before anything
> signs.

*(pause — let the blocked state sit)*

### 2:18–2:23 · Close

> Private proof. Public hash. Revocable authority. The bank stays off our books
> on purpose.

---

## Cut B — 90 seconds

If the form caps at 90s, cut these and keep everything else:

- The bank origin story (0:12–0:20) — keep only "Bola is a freelancer in Lagos."
- The "welded together" line at 0:30
- The second half of the attestation beat — keep "The lender reads that hash and
  returns credit eligible."

That lands around 88 seconds and loses no evidence. The three things that must
survive any cut:

1. Your browser is checking this, not my server
2. The sender is the MPC wallet, not my key
3. Revoke stops it before anything signs

---

## Recording the voiceover

**Clipchamp** (built into Windows 11) does all of this.

1. Drop the video on the timeline.
2. **Record** → microphone. Watch the video and read as it plays.
3. Record it in **sections**, not one take. Re-record a section you fluff instead
   of starting over.

Audio hygiene that matters more than a good microphone:

- Record in a room with soft furnishings. A bare room sounds hollow.
- Mouth about a hand-span from the mic, slightly off-axis so plosives miss it.
- Phone on silent, fan and AC off, window shut.
- Leave two seconds of silence at the start so the editor has a noise profile.

## Background music

Yes — it helps, at the right level.

**Level:** music sits **-25 to -30 dB** under your voice. If you notice it while
someone is talking, it is too loud. In Clipchamp set the music track to roughly
**8–12% volume** and check on laptop speakers, not headphones.

**Ducking:** Clipchamp has an audio ducking option that drops music
automatically under narration. Turn it on.

**Licensing — this matters for a submission.** Do not use commercial music. Use:

- YouTube Audio Library (free, cleared)
- Pixabay Music
- Free Music Archive (check the per-track licence)

Pick something ambient with no drums and no vocals. Anything with a beat will
fight your pacing, and lyrics make narration unlistenable.

**Fade:** 1s fade in at the start, 2s fade out under the closing line.

## Final check before export

- [ ] Watch it once at 100% volume on laptop speakers. Every word intelligible?
- [ ] No real bank name visible in the recipient field or the rationale text
- [ ] The `From` field on Basescan is legible at full-screen
- [ ] Export 1080p, MP4
- [ ] Length is inside the form's limit
