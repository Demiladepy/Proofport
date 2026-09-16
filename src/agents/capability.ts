/** Hard capability deny — code boundary, not prompt convention. */
export class CapabilityDeniedError extends Error {
  readonly code = "capability_denied" as const;
  constructor(
    public readonly agent: "proof" | "execution",
    public readonly attemptedTool: string,
    message?: string,
  ) {
    super(
      message ??
        `capability denied: ${agent}-agent cannot call ${attemptedTool}`,
    );
    this.name = "CapabilityDeniedError";
  }
}

export function denyCapability(
  agent: "proof" | "execution",
  attemptedTool: string,
): never {
  throw new CapabilityDeniedError(agent, attemptedTool);
}
