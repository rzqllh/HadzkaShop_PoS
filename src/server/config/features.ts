import "server-only";

function hasPublicHttpsAppUrl() {
  try {
    const url = new URL(process.env.APP_URL ?? "");
    return (
      url.protocol === "https:" &&
      url.username === "" &&
      url.password === "" &&
      url.hostname !== "localhost" &&
      url.hostname !== "127.0.0.1"
    );
  } catch {
    return false;
  }
}

const qrisConfigurationReady = [
  "MIDTRANS_ENV",
  "MIDTRANS_SERVER_KEY",
  "NEXT_PUBLIC_MIDTRANS_CLIENT_KEY",
].every((name) => Boolean(process.env[name])) &&
  ["sandbox", "production"].includes(process.env.MIDTRANS_ENV ?? "") &&
  hasPublicHttpsAppUrl();

export const qrisEnabled =
  process.env.QRIS_ENABLED === "true" &&
  process.env.MIDTRANS_QRIS_ACTIVATED === "true" &&
  process.env.MIDTRANS_CALLBACKS_CONFIRMED === "true" &&
  qrisConfigurationReady;

export const qrisDisabledReason =
  "QRIS belum tersedia sampai keys, aktivasi merchant, dan callback HTTPS diverifikasi.";
