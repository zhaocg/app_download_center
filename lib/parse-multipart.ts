import busboy from "busboy";
import { Readable } from "node:stream";
import fs from "node:fs";
import path from "node:path";
import os from "node:os";

interface ParsedFormData {
  fields: Record<string, string>;
  files: {
    fieldName: string;
    originalFilename: string;
    path: string;
    size: number;
    mimeType: string;
  }[];
}

export async function parseMultipart(
  req: Request
): Promise<ParsedFormData> {
  const contentType = req.headers.get("content-type");
  if (!contentType || !contentType.includes("multipart/form-data")) {
    throw new Error("Content-Type must be multipart/form-data");
  }

  const bb = busboy({ headers: { "content-type": contentType } });
  const result: ParsedFormData = {
    fields: {},
    files: [],
  };

  return new Promise((resolve, reject) => {
    const filePromises: Promise<void>[] = [];

    bb.on("file", (name, file, info) => {
      const { filename, mimeType } = info;
      const tmpPath = path.join(os.tmpdir(), `upload-${Date.now()}-${Math.random().toString(36).slice(2)}`);
      
      const writeStream = fs.createWriteStream(tmpPath);
      
      const filePromise = new Promise<void>((fileResolve, fileReject) => {
        file.pipe(writeStream);
        
        file.on("error", fileReject);
        
        writeStream.on("error", fileReject);
        
        writeStream.on("finish", () => {
          const stats = fs.statSync(tmpPath);
          result.files.push({
            fieldName: name,
            originalFilename: filename,
            path: tmpPath,
            size: stats.size,
            mimeType,
          });
          fileResolve();
        });
      });

      filePromises.push(filePromise);
    });

    bb.on("field", (name, val) => {
      result.fields[name] = val;
    });

    bb.on("error", (err) => {
      reject(err);
    });

    bb.on("close", async () => {
      try {
        await Promise.all(filePromises);
        resolve(result);
      } catch (err) {
        reject(err);
      }
    });

    // Convert Web Stream to Node Stream
    if (req.body) {
      // @ts-ignore - Readable.fromWeb is available in Node 18+ but TS might not know it yet depending on config
      const nodeStream = Readable.fromWeb(req.body);
      nodeStream.pipe(bb);
    } else {
      bb.end();
    }
  });
}
