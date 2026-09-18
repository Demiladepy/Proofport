import { config } from "dotenv";
import { join } from "node:path";

config({ path: join(process.cwd(), ".env") });

async function probe(url, init) {
  const started = Date.now();
  try {
    const res = await fetch(url, { ...init, signal: AbortSignal.timeout(8000) });
    const response = (await res.text()).slice(0, 500);
    return { url, method: init.method || "GET", status: res.status, ms: Date.now() - started, response };
  } catch (err) {
    return {
      url,
      method: init.method || "GET",
      error: err instanceof Error ? err.message : String(err),
      ms: Date.now() - started,
    };
  }
}

async function main() {
  const envId = process.env.DYNAMIC_ENVIRONMENT_ID;
  const token = process.env.DYNAMIC_API_TOKEN ?? process.env.DYNAMIC_AUTH_TOKEN;
  const headers = {
    Authorization: `Bearer ${token}`,
    "Content-Type": "application/json",
  };
  const authBody = JSON.stringify({ environmentId: envId });
  const results = [];
  results.push(
    await probe(`https://app.dynamicauth.com/api/v0/sdk/${envId}/verify`, {
      method: "GET",
      headers,
    }),
  );
  results.push(
    await probe(`https://app.dynamicauth.com/api/v0/environments/${envId}`, {
      method: "GET",
      headers,
    }),
  );
  results.push(
    await probe("https://app.dynamicauth.com/api/v0/sdk/authenticateApiToken", {
      method: "POST",
      headers,
      body: authBody,
    }),
  );
  results.push(
    await probe(
      `https://app.dynamicauth.com/api/v0/environments/${envId}/keys`,
      { method: "GET", headers },
    ),
  );
  results.push(
    await probe("https://waas-keyshares-relay.dynamicauth.com/health", {
      method: "GET",
      headers: { "Content-Type": "application/json" },
    }),
  );
  console.log(
    JSON.stringify(
      {
        environmentId: envId,
        tokenPrefix: `${String(token).slice(0, 8)}…(len ${String(token).length})`,
        requestBody: { environmentId: envId },
        results,
      },
      null,
      2,
    ),
  );
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
