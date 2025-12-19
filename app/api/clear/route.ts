import { NextRequest } from "next/server";
import fs from "node:fs/promises";
import path from "node:path";
import { ObjectId } from "mongodb";
import { DOWNLOAD_ROOT } from "../../../lib/config";
import { getFilesCollection } from "../../../lib/db";
import { FileMeta } from "../../../types/file";

type ClearMode = "time" | "project" | "projectVersion" | "emptyDirs";

interface ClearRequestBody {
  mode: ClearMode;
  before?: string;
  projectName?: string;
  version?: string;
  dryRun?: boolean;
}

interface ClearSampleItem {
  id: string;
  projectName: string;
  version: string;
  channel: string;
  fileName: string;
  uploadedAt: string;
}

interface ClearResponseBody {
  ok: boolean;
  matched: number;
  deleted: number;
  totalSize: number;
  sample: ClearSampleItem[];
  dirs?: string[];
}

const EMPTY_DIR_THRESHOLD_MS = 1000;

async function cleanupEmptyParentDirs(startDir: string) {
  let dir = path.resolve(startDir);
  const root = path.resolve(DOWNLOAD_ROOT);
  
  // 在递归清理父目录时，不应用时间阈值。
  // 因为如果子目录被删除了，父目录的 mtime 会更新为当前时间。
  // 如果应用阈值，刚刚变空的父目录将无法被删除。
  while (dir.startsWith(root)) {
    if (dir === root) {
      break;
    }
    // 防止删除 root 本身或跳出 root
    if (!dir.startsWith(root) || dir === root) {
      break;
    }
    try {
      const entries = await fs.readdir(dir);
      if (entries.length > 0) {
        break;
      }
      // 不检查 mtime，直接删除空目录
      await fs.rmdir(dir);
      dir = path.dirname(dir);
    } catch (err) {
      break;
    }
  }
}

async function cleanupEmptyDirs(filePath: string) {
  const startDir = path.dirname(path.resolve(filePath));
  await cleanupEmptyParentDirs(startDir);
}

async function findEmptyDirs(rootDir: string): Promise<string[]> {
  const root = path.resolve(rootDir);
  const thresholdMs = EMPTY_DIR_THRESHOLD_MS;
  const result: string[] = [];

  async function walk(dir: string) {
    let entries: string[];
    try {
      entries = await fs.readdir(dir);
    } catch {
      return;
    }

    const subdirs: string[] = [];
    for (const name of entries) {
      const full = path.join(dir, name);
      try {
        const stat = await fs.stat(full);
        if (stat.isDirectory()) {
          subdirs.push(full);
        }
      } catch {
      }
    }

    for (const sub of subdirs) {
      await walk(sub);
    }

    try {
      const afterEntries = await fs.readdir(dir);
      if (afterEntries.length > 0) {
        return;
      }
      if (dir === root) {
        return;
      }
      const stats = await fs.stat(dir);
      const age = Date.now() - stats.mtimeMs;
      if (age >= thresholdMs) {
        result.push(dir);
      }
    } catch {
    }
  }

  await walk(root);
  return result;
}

async function findInvalidRecords() {
  const filesCol = await getFilesCollection();
  // 查找所有记录，检查对应文件是否存在
  const docs = (await filesCol
    .find({})
    .project({
      _id: 1,
      relativePath: 1,
      projectName: 1,
      version: 1,
      channel: 1,
      fileName: 1,
      uploadedAt: 1
    })
    .toArray()) as (Pick<
    FileMeta,
    "relativePath" | "projectName" | "version" | "channel" | "fileName" | "uploadedAt"
  > & { _id: ObjectId })[];

  const invalidDocs: (FileMeta & { _id: ObjectId })[] = [];
  const chunkSize = 50;

  for (let i = 0; i < docs.length; i += chunkSize) {
    const chunk = docs.slice(i, i + chunkSize);
    await Promise.all(
      chunk.map(async (doc) => {
        if (!doc.relativePath) {
          invalidDocs.push(doc as any);
          return;
        }
        const filePath = path.join(DOWNLOAD_ROOT, doc.relativePath);
        try {
          const stats = await fs.stat(filePath);
          if (!stats.isFile()) {
            invalidDocs.push(doc as any);
          }
        } catch (err) {
          // ENOENT 或其他错误都视为文件无法访问，建议清理
          invalidDocs.push(doc as any);
        }
      })
    );
  }

  return invalidDocs;
}

export async function POST(req: NextRequest) {
  let body: ClearRequestBody;
  try {
    body = (await req.json()) as ClearRequestBody;
  } catch (err) {
    return new Response("请求体格式错误", { status: 400 });
  }

  const mode = body.mode;
  if (
    mode !== "time" &&
    mode !== "project" &&
    mode !== "projectVersion" &&
    mode !== "emptyDirs"
  ) {
    return new Response("无效的清理模式", { status: 400 });
  }

  const dryRun = Boolean(body.dryRun);

  if (mode === "emptyDirs") {
    const root = DOWNLOAD_ROOT;
    
    // 1. 查找空目录
    const dirs = await findEmptyDirs(root);
    // 2. 查找无效数据库记录
    const invalidDocs = await findInvalidRecords();

    if (!dirs.length && !invalidDocs.length) {
      const emptyResult: ClearResponseBody = {
        ok: true,
        matched: 0,
        deleted: 0,
        totalSize: 0,
        sample: [],
        dirs: []
      };
      return Response.json(emptyResult);
    }

    if (!dryRun) {
      // 执行清理无效记录
      if (invalidDocs.length > 0) {
        const filesCol = await getFilesCollection();
        const invalidIds = invalidDocs.map((d) => d._id);
        await filesCol.deleteMany({ _id: { $in: invalidIds } });
      }

      // 执行清理空目录
      const rootResolved = path.resolve(root);
      const sorted = dirs.slice().sort((a, b) => {
        const da = a.split(path.sep).length;
        const db = b.split(path.sep).length;
        return db - da;
      });
      let deletedDirsCount = 0;
      const deletedDirs: string[] = [];
      for (const dir of sorted) {
        const resolved = path.resolve(dir);
        if (!resolved.startsWith(rootResolved)) {
          continue;
        }
        try {
          const entries = await fs.readdir(resolved);
          if (entries.length > 0) {
            continue;
          }
          const stats = await fs.stat(resolved);
          const age = Date.now() - stats.mtimeMs;
          if (age < EMPTY_DIR_THRESHOLD_MS) {
            continue;
          }
          await fs.rmdir(resolved);
          deletedDirsCount += 1;
          deletedDirs.push(resolved);
          
          // 递归清理父级空目录
          const parent = path.dirname(resolved);
          await cleanupEmptyParentDirs(parent);
        } catch {
        }
      }

      const result: ClearResponseBody = {
        ok: true,
        matched: dirs.length + invalidDocs.length,
        deleted: deletedDirsCount + invalidDocs.length,
        totalSize: 0,
        sample: invalidDocs.slice(0, 20).map((d) => ({
          id: String(d._id),
          projectName: d.projectName,
          version: d.version,
          channel: d.channel,
          fileName: d.fileName,
          uploadedAt: d.uploadedAt
        })),
        dirs: deletedDirs
      };
      return Response.json(result);
    }

    const dryResult: ClearResponseBody = {
      ok: true,
      matched: dirs.length + invalidDocs.length,
      deleted: 0,
      totalSize: 0,
      sample: invalidDocs.slice(0, 20).map((d) => ({
        id: String(d._id),
        projectName: d.projectName,
        version: d.version,
        channel: d.channel,
        fileName: d.fileName,
        uploadedAt: d.uploadedAt
      })),
      dirs
    };
    return Response.json(dryResult);
  }

  const query: Record<string, unknown> = {};

  if (mode === "time") {
    if (!body.before) {
      return new Response("按时间清理需要提供 before 参数", { status: 400 });
    }
    query.uploadedAt = { $lt: body.before };
  } else if (mode === "project") {
    if (!body.projectName) {
      return new Response("按项目清理需要提供 projectName 参数", {
        status: 400
      });
    }
    query.projectName = body.projectName;
    if (body.before) {
      query.uploadedAt = { $lt: body.before };
    }
  } else if (mode === "projectVersion") {
    if (!body.projectName || !body.version) {
      return new Response("按项目+版本清理需要提供 projectName 和 version 参数", {
        status: 400
      });
    }
    query.projectName = body.projectName;
    query.version = body.version;
    if (body.before) {
      query.uploadedAt = { $lt: body.before };
    }
  }

  const filesCol = await getFilesCollection();
  const docs = (await filesCol.find(query).toArray()) as (FileMeta & {
    _id: ObjectId;
  })[];

  if (!docs.length) {
    const emptyResult: ClearResponseBody = {
      ok: true,
      matched: 0,
      deleted: 0,
      totalSize: 0,
      sample: [],
      dirs: []
    };
    return Response.json(emptyResult);
  }

  const totalSize = docs.reduce((sum, d) => sum + (d.size || 0), 0);

  if (!dryRun) {
    for (const doc of docs) {
      const filePath = path.join(DOWNLOAD_ROOT, doc.relativePath);
      try {
        await fs.unlink(filePath);
        await cleanupEmptyDirs(filePath);
      } catch (err) {}
    }
    const ids = docs.map((d) => d._id);
    const res = await filesCol.deleteMany({
      _id: { $in: ids }
    });
    const result: ClearResponseBody = {
      ok: true,
      matched: docs.length,
      deleted: res.deletedCount ?? 0,
      totalSize,
      sample: docs.slice(0, 20).map((d) => ({
        id: String(d._id),
        projectName: d.projectName,
        version: d.version,
        channel: d.channel,
        fileName: d.fileName,
        uploadedAt: d.uploadedAt
      })),
      dirs: []
    };
    return Response.json(result);
  }

  const dryResult: ClearResponseBody = {
    ok: true,
    matched: docs.length,
    deleted: 0,
    totalSize,
    sample: docs.slice(0, 20).map((d) => ({
      id: String(d._id),
      projectName: d.projectName,
      version: d.version,
      channel: d.channel,
      fileName: d.fileName,
      uploadedAt: d.uploadedAt
    })),
    dirs: []
  };

  return Response.json(dryResult);
}
