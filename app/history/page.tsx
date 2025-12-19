"use client";

import { useEffect, useState } from "react";
import type { FileMeta } from "../../types/file";

interface UploadItem extends FileMeta {
  _id: string;
}

interface UploadsResponse {
  items: UploadItem[];
}

export default function HistoryPage() {
  const [items, setItems] = useState<UploadItem[]>([]);
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [projects, setProjects] = useState<string[]>([]);
  const [projectsLoading, setProjectsLoading] = useState(false);
  const [projectsError, setProjectsError] = useState<string | null>(null);
  const [projectName, setProjectName] = useState("");
  const [limit, setLimit] = useState(50);

  useEffect(() => {
    let cancelled = false;
    async function loadProjects() {
      setProjectsLoading(true);
      setProjectsError(null);
      try {
        const res = await fetch("/api/projects");
        if (!res.ok) {
          throw new Error(await res.text());
        }
        const data = (await res.json()) as { projects: string[] };
        if (!cancelled) {
          setProjects(Array.isArray(data.projects) ? data.projects : []);
        }
      } catch (err) {
        if (!cancelled) {
          setProjectsError(
            err instanceof Error ? err.message : "加载项目列表失败"
          );
        }
      } finally {
        if (!cancelled) {
          setProjectsLoading(false);
        }
      }
    }
    loadProjects();
    return () => {
      cancelled = true;
    };
  }, []);

  useEffect(() => {
    const controller = new AbortController();
    async function loadHistory() {
      setLoading(true);
      setMessage(null);
      try {
        const params = new URLSearchParams();
        params.set("limit", String(limit));
        if (projectName) {
          params.set("project", projectName);
        }
        const res = await fetch(`/api/uploads?${params.toString()}`, {
          signal: controller.signal
        });
        if (!res.ok) {
          throw new Error(await res.text());
        }
        const data = (await res.json()) as UploadsResponse;
        setItems(Array.isArray(data.items) ? data.items : []);
      } catch (err) {
        if (err instanceof Error && err.name === "AbortError") {
          return;
        }
        setMessage(
          err instanceof Error ? err.message : "加载上传历史失败，请稍后重试"
        );
      } finally {
        setLoading(false);
      }
    }
    loadHistory();
    return () => {
      controller.abort();
    };
  }, [projectName, limit]);

  return (
    <div className="flex flex-col gap-4">
      <div className="rounded-lg border border-slate-200 bg-white p-3 shadow-sm">
        <h2 className="mb-3 text-sm font-semibold text-slate-900">
          上传历史
        </h2>
        <div className="grid gap-3 text-xs md:grid-cols-3">
          <div className="flex flex-col gap-1">
            <label className="text-slate-800">项目过滤</label>
            {projectsLoading ? (
              <div className="text-[11px] text-slate-500">
                正在加载项目列表...
              </div>
            ) : projectsError ? (
              <input
                type="text"
                value={projectName}
                onChange={(e) => setProjectName(e.target.value)}
                className="rounded border border-slate-300 bg-white px-2 py-1 text-xs"
                placeholder="加载失败，请手动输入项目名称"
              />
            ) : projects.length > 0 ? (
              <select
                value={projectName}
                onChange={(e) => setProjectName(e.target.value)}
                className="rounded border border-slate-300 bg-white px-2 py-1 text-xs"
              >
                <option value="">全部项目</option>
                {projects.map((name) => (
                  <option key={name} value={name}>
                    {name}
                  </option>
                ))}
              </select>
            ) : (
              <input
                type="text"
                value={projectName}
                onChange={(e) => setProjectName(e.target.value)}
                className="rounded border border-slate-300 bg-white px-2 py-1 text-xs"
                placeholder="暂无项目数据，请手动输入项目名称"
              />
            )}
          </div>
          <div className="flex flex-col gap-1">
            <label className="text-slate-800">数量限制</label>
            <select
              value={limit}
              onChange={(e) => setLimit(Number(e.target.value) || 50)}
              className="rounded border border-slate-300 bg-white px-2 py-1 text-xs"
            >
              <option value={20}>最近 20 条</option>
              <option value={50}>最近 50 条</option>
              <option value={100}>最近 100 条</option>
            </select>
          </div>
          <div className="flex items-end text-[11px] text-slate-500">
            {loading ? "正在加载上传历史..." : `共 ${items.length} 条记录`}
          </div>
        </div>
      </div>
      {message && (
        <div className="rounded-md border border-amber-300 bg-amber-50 px-3 py-2 text-sm text-amber-800">
          {message}
        </div>
      )}
      <div className="rounded-lg border border-slate-200 bg-white p-3 shadow-sm">
        <h2 className="mb-3 text-sm font-semibold text-slate-900">
          上传记录
        </h2>
        <div className="overflow-x-auto">
          <table className="min-w-full table-auto text-xs">
            <thead>
              <tr className="border-b border-slate-200 bg-slate-100">
                <th className="px-3 py-2 text-left font-medium text-slate-700">
                  上传时间
                </th>
                <th className="px-3 py-2 text-left font-medium text-slate-700">
                  项目
                </th>
                <th className="px-3 py-2 text-left font-medium text-slate-700">
                  版本
                </th>
                <th className="px-3 py-2 text-left font-medium text-slate-700">
                  渠道
                </th>
                <th className="px-3 py-2 text-left font-medium text-slate-700">
                  平台
                </th>
                <th className="px-3 py-2 text-left font-medium text-slate-700">
                  文件名
                </th>
                <th className="px-3 py-2 text-right font-medium text-slate-700">
                  大小
                </th>
              </tr>
            </thead>
            <tbody>
              {items.length === 0 ? (
                <tr>
                  <td
                    colSpan={7}
                    className="px-3 py-6 text-center text-xs text-slate-500"
                  >
                    {loading ? "正在加载..." : "暂无上传记录"}
                  </td>
                </tr>
              ) : (
                items.map((item) => (
                  <tr
                    key={item._id}
                    className="border-b border-slate-200 last:border-b-0 hover:bg-slate-50"
                  >
                    <td className="px-3 py-2 align-middle text-xs text-slate-700 whitespace-nowrap">
                      {new Date(item.uploadedAt).toLocaleString()}
                    </td>
                    <td className="px-3 py-2 align-middle text-xs text-slate-700 whitespace-nowrap">
                      {item.projectName}
                    </td>
                    <td className="px-3 py-2 align-middle text-xs text-slate-700 whitespace-nowrap">
                      {item.version}
                    </td>
                    <td className="px-3 py-2 align-middle text-xs text-slate-700 whitespace-nowrap">
                      {item.channel}
                    </td>
                    <td className="px-3 py-2 align-middle text-xs text-slate-700 whitespace-nowrap">
                      {item.platform === "android"
                        ? "Android"
                        : item.platform === "ios"
                        ? "iOS"
                        : item.platform}
                    </td>
                    <td className="px-3 py-2 align-middle text-xs text-slate-700">
                      {item.fileName}
                    </td>
                    <td className="px-3 py-2 align-middle text-right text-xs text-slate-700 whitespace-nowrap">
                      {(item.size / (1024 * 1024)).toFixed(2)} MB
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
