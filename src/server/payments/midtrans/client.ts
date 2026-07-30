import { createHash, timingSafeEqual } from "node:crypto";
import { z } from "zod";

type MidtransEnvironment = "sandbox" | "production";

type MidtransConfig = {
  environment: MidtransEnvironment;
  serverKey: string;
  finishUrl: string | null;
};

type SnapQrisInput = {
  orderId: string;
  grossAmount: number;
};

export class MidtransHttpError extends Error {
  constructor(
    message: string,
    readonly httpStatus: number,
    readonly providerCode: string,
  ) {
    super(message);
    this.name = "MidtransHttpError";
  }
}

export const midtransStatusSchema = z.object({
  order_id: z.string().min(1),
  status_code: z.string().min(1),
  gross_amount: z.string().min(1),
  transaction_status: z.string().min(1),
  transaction_id: z.string().optional(),
  fraud_status: z.string().optional(),
  signature_key: z.string().optional(),
});

export type MidtransStatus = z.infer<typeof midtransStatusSchema>;

export function buildSnapQrisRequest(input: {
  orderId: string;
  grossAmount: number;
  finishUrl: string | null;
}) {
  if (
    !Number.isSafeInteger(input.grossAmount) ||
    input.grossAmount <= 0
  ) {
    throw new Error("Midtrans gross_amount harus berupa integer IDR positif");
  }

  return {
    transaction_details: {
      order_id: input.orderId,
      gross_amount: input.grossAmount,
    },
    enabled_payments: ["other_qris"],
    ...(input.finishUrl ? { callbacks: { finish: input.finishUrl } } : {}),
    expiry: { duration: 15, unit: "minutes" },
    page_expiry: { duration: 15, unit: "minutes" },
  };
}

export function notificationSignature(
  input: { orderId: string; statusCode: string; grossAmount: string },
  serverKey: string,
) {
  return createHash("sha512")
    .update(
      `${input.orderId}${input.statusCode}${input.grossAmount}${serverKey}`,
      "utf8",
    )
    .digest("hex");
}

export function verifyNotificationSignature(
  input: {
    orderId: string;
    statusCode: string;
    grossAmount: string;
    signature: string;
  },
  serverKey: string,
) {
  const expected = Buffer.from(
    notificationSignature(input, serverKey),
    "utf8",
  );
  const received = Buffer.from(input.signature, "utf8");
  return (
    expected.length === received.length &&
    timingSafeEqual(expected, received)
  );
}

function baseUrls(environment: MidtransEnvironment) {
  return environment === "production"
    ? {
        snap: "https://app.midtrans.com",
        api: "https://api.midtrans.com",
      }
    : {
        snap: "https://app.sandbox.midtrans.com",
        api: "https://api.sandbox.midtrans.com",
      };
}

export function createMidtransClient(
  config: MidtransConfig,
  fetchImplementation: typeof fetch = fetch,
) {
  const urls = baseUrls(config.environment);
  const authorization = `Basic ${Buffer.from(`${config.serverKey}:`).toString("base64")}`;

  async function request(url: string, init: RequestInit) {
    const response = await fetchImplementation(url, {
      ...init,
      headers: {
        Accept: "application/json",
        "Content-Type": "application/json",
        Authorization: authorization,
        ...init.headers,
      },
      signal: init.signal ?? AbortSignal.timeout(10_000),
    });
    let payload: unknown;
    try {
      payload = await response.json();
    } catch {
      payload = null;
    }
    if (!response.ok) {
      const providerCode =
        payload && typeof payload === "object" && "status_code" in payload
          ? String(payload.status_code)
          : "unknown";
      throw new MidtransHttpError(
        `Midtrans request gagal (${response.status}/${providerCode})`,
        response.status,
        providerCode,
      );
    }
    return payload;
  }

  return {
    async createSnapQrisToken(input: SnapQrisInput) {
      const payload = await request(`${urls.snap}/snap/v1/transactions`, {
        method: "POST",
        body: JSON.stringify(
          buildSnapQrisRequest({
            ...input,
            finishUrl: config.finishUrl,
          }),
        ),
      });
      return z
        .object({ token: z.string().min(1), redirect_url: z.string().url() })
        .parse(payload);
    },

    async getStatus(orderId: string) {
      const payload = await request(
        `${urls.api}/v2/${encodeURIComponent(orderId)}/status`,
        { method: "GET" },
      );
      return midtransStatusSchema.parse(payload);
    },

    async cancel(orderId: string) {
      const payload = await request(
        `${urls.api}/v2/${encodeURIComponent(orderId)}/cancel`,
        { method: "POST" },
      );
      return midtransStatusSchema.parse(payload);
    },
  };
}

function required(name: string) {
  const value = process.env[name];
  if (!value) throw new Error(`${name} belum dikonfigurasi`);
  return value;
}

export function createMidtransClientFromEnv() {
  const environment = required("MIDTRANS_ENV");
  if (environment !== "sandbox" && environment !== "production") {
    throw new Error("MIDTRANS_ENV harus sandbox atau production");
  }
  const appUrl = required("APP_URL");
  const finishUrl = new URL("/pos", appUrl).toString();

  return createMidtransClient({
    environment,
    serverKey: required("MIDTRANS_SERVER_KEY"),
    finishUrl,
  });
}

export function midtransServerKey() {
  return required("MIDTRANS_SERVER_KEY");
}
