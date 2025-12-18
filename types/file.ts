export type Platform = "android" | "ios";

export type SortField = "name" | "size" | "uploadedAt";

export type SortOrder = "asc" | "desc";

export interface FileMeta {
  _id?: any; // Allow ObjectId or string
  projectName: string;
  version: string;
  channel: string;
  buildNumber: string;
  fileName: string;
  relativePath: string;
  platform: Platform;
  size: number;
  uploadedAt: string;
  resVersion?: string;
  areaName?: string;
  branch?: string;
  rbranch?: string;
  sdk?: string;
  harden?: boolean;
  codeSignType?: string;
  appId?: string;
  shareId?: string;
}

