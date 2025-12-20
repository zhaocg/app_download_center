import path from "node:path";

export const DOWNLOAD_ROOT =
  process.env.DOWNLOAD_ROOT || path.join(process.cwd(), "data/share/packages");

export const MONGODB_URI =
  process.env.MONGODB_URI || "mongodb://localhost:27017/app-download-center";

export const CLEANUP_TOKEN = process.env.CLEANUP_TOKEN || "";

export const DINGTALK_WEBHOOK = process.env.DINGTALK_WEBHOOK || "";
