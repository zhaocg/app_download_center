import path from "node:path";

export const DOWNLOAD_ROOT =
  process.env.DOWNLOAD_ROOT || path.join(process.cwd(), "data/share/TRGE产品打包专用");

export const MONGODB_URI =
  process.env.MONGODB_URI || "mongodb://192.168.0.141:27017/app-download-center";

export const CLEANUP_TOKEN = process.env.CLEANUP_TOKEN || "";
