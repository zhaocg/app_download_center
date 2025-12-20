import { NextRequest } from "next/server";
import { getFilesCollection } from "../../../lib/db";

export const dynamic = "force-dynamic";

export async function GET(req: NextRequest) {
  const filesCol = await getFilesCollection();
  const names = await filesCol.distinct("projectName");
  const projects = (names as string[]).filter(Boolean).sort((a, b) => {
    return a.localeCompare(b, "zh-CN");
  });
  return Response.json({ projects });
}

