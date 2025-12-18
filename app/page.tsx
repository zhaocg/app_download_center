"use client";

import { useEffect, useMemo, useState } from "react";
import type { FileMeta, SortField, SortOrder } from "../types/file";

type Level = "project" | "version" | "channel" | "file";

type BrowseEntry =
  | {
      type: "project";
      name: string;
      latestUploadedAt: string | null;
      fileCount: number;
    }
  | {
      type: "version";
      name: string;
      latestUploadedAt: string | null;
      fileCount: number;
    }
  | {
      type: "channel";
      name: string;
      latestUploadedAt: string | null;
      fileCount: number;
    }
  | {
      type: "file";
      file: FileMeta;
    };

interface BrowseResponse {
  level: Level;
  project?: string;
  version?: string;
  channel?: string;
  entries: BrowseEntry[];
}

export default function HomePage() {
  const [level, setLevel] = useState<Level>("project");
  const [project, setProject] = useState<string | undefined>(undefined);
  const [version, setVersion] = useState<string | undefined>(undefined);
  const [channel, setChannel] = useState<string | undefined>(undefined);
  const [entries, setEntries] = useState<BrowseEntry[]>([]);
  const [loading, setLoading] = useState(false);
  const [sortField, setSortField] = useState<SortField>("uploadedAt");
  const [sortOrder, setSortOrder] = useState<SortOrder>("desc");
  const [message, setMessage] = useState<string | null>(null);

  const breadcrumb = useMemo(() => {
    const items: { label: string; onClick?: () => void }[] = [];
    items.push({
      label: "项目",
      onClick:
        level !== "project"
          ? () => {
              setProject(undefined);
              setVersion(undefined);
              setChannel(undefined);
            }
          : undefined
    });
    if (project) {
      items.push({
        label: project,
        onClick:
          level !== "version"
            ? () => {
                setVersion(undefined);
                setChannel(undefined);
              }
            : undefined
      });
    }
    if (version) {
      items.push({
        label: version,
        onClick:
          level !== "channel"
            ? () => {
                setChannel(undefined);
              }
            : undefined
      });
    }
    if (channel) {
      items.push({
        label: channel
      });
    }
    return items;
  }, [project, version, channel, level]);

  useEffect(() => {
    const controller = new AbortController();
    async function load() {
      setLoading(true);
      try {
        const params = new URLSearchParams();
        if (project) {
          params.set("project", project);
        }
        if (version) {
          params.set("version", version);
        }
        if (channel) {
          params.set("channel", channel);
        }
        params.set("sortField", sortField);
        params.set("sortOrder", sortOrder);
        const res = await fetch(`/api/browse?${params.toString()}`, {
          signal: controller.signal
        });
        if (!res.ok) {
          throw new Error(await res.text());
        }
        const data: BrowseResponse = await res.json();
        setLevel(data.level);
        setEntries(data.entries);
      } catch (err) {
        if (err instanceof Error && err.name === "AbortError") {
          return;
        }
        setMessage(
          err instanceof Error ? err.message : "加载失败，请稍后重试"
        );
      } finally {
        setLoading(false);
      }
    }
    load();
    return () => {
      controller.abort();
    };
  }, [project, version, channel, sortField, sortOrder]);

  function handleOpen(entry: BrowseEntry) {
    if (entry.type === "project") {
      setProject(entry.name);
      setVersion(undefined);
      setChannel(undefined);
    } else if (entry.type === "version") {
      setVersion(entry.name);
      setChannel(undefined);
    } else if (entry.type === "channel") {
      setChannel(entry.name);
    }
  }

  function handleBack() {
    if (channel) {
      setChannel(undefined);
    } else if (version) {
      setVersion(undefined);
    } else if (project) {
      setProject(undefined);
    }
  }

  async function handleDelete(file: FileMeta) {
    if (!file._id) {
      return;
    }
    if (!confirm(`确认删除 ${file.fileName} 吗？`)) {
      return;
    }
    try {
      const res = await fetch("/api/file", {
        method: "DELETE",
        headers: {
          "Content-Type": "application/json"
        },
        body: JSON.stringify({ id: file._id })
      });
      if (!res.ok) {
        throw new Error(await res.text());
      }
      setEntries((prev) =>
        prev.filter(
          (e) => e.type !== "file" || e.file._id !== file._id
        )
      );
      setMessage("删除成功");
    } catch (err) {
      setMessage(
        err instanceof Error ? err.message : "删除失败，请稍后重试"
      );
    }
  }

  async function handleShare(file: FileMeta) {
    if (!file._id) {
      return;
    }
    try {
      const res = await fetch("/api/share", {
        method: "POST",
        headers: {
          "Content-Type": "application/json"
        },
        body: JSON.stringify({ id: file._id })
      });
      if (!res.ok) {
        throw new Error(await res.text());
      }
      const data: { url: string } = await res.json();
      if (navigator.clipboard) {
        await navigator.clipboard.writeText(data.url);
        setMessage("分享链接已复制到剪贴板");
      } else {
        setMessage(`分享链接: ${data.url}`);
      }
    } catch (err) {
      setMessage(
        err instanceof Error ? err.message : "生成分享链接失败"
      );
    }
  }

  function handleDownload(file: FileMeta) {
    if (!file._id) {
      return;
    }
    const url = `/api/download?id=${file._id}`;
    window.open(url, "_blank");
  }

  function handleInstall(file: FileMeta) {
    if (!file._id) {
      return;
    }
    if (file.platform === "android") {
      const url = `/api/download?id=${file._id}`;
      window.location.href = url;
    } else if (file.platform === "ios") {
      const origin = window.location.origin;
      const manifestUrl = `${origin}/api/ios/manifest?id=${file._id}`;
      const itms = `itms-services://?action=download-manifest&url=${encodeURIComponent(
        manifestUrl
      )}`;
      window.location.href = itms;
    }
  }

  const isFileLevel = level === "file";

  return (
    <div className="flex flex-col gap-4">
      {message && (
        <div className="rounded-md border border-amber-500 bg-amber-950 px-3 py-2 text-sm text-amber-100">
          {message}
        </div>
      )}
      <div className="flex flex-col gap-3 rounded-lg border border-slate-800 bg-slate-900/60 p-3">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div className="flex flex-wrap items-center gap-2 text-xs text-slate-300">
            {breadcrumb.map((item, idx) => (
              <div key={idx} className="flex items-center gap-1">
                {idx > 0 && <span className="text-slate-500">/</span>}
                <button
                  type="button"
                  disabled={!item.onClick}
                  onClick={item.onClick}
                  className={
                    item.onClick
                      ? "rounded px-1 py-0.5 hover:bg-slate-800"
                      : "cursor-default"
                  }
                >
                  {item.label}
                </button>
              </div>
            ))}
          </div>
          <div className="flex items-center gap-2 text-xs text-slate-300">
            <span>排序:</span>
            <select
              value={sortField}
              onChange={(e) =>
                setSortField(e.target.value as SortField)
              }
              className="rounded border border-slate-700 bg-slate-900 px-1.5 py-1 text-xs"
            >
              <option value="uploadedAt">上传时间</option>
              <option value="name">名称</option>
              <option value="size">大小</option>
            </select>
            <select
              value={sortOrder}
              onChange={(e) =>
                setSortOrder(e.target.value as SortOrder)
              }
              className="rounded border border-slate-700 bg-slate-900 px-1.5 py-1 text-xs"
            >
              <option value="desc">降序</option>
              <option value="asc">升序</option>
            </select>
            <button
              type="button"
              onClick={() => {
                setProject(undefined);
                setVersion(undefined);
                setChannel(undefined);
              }}
              className="rounded border border-slate-700 px-2 py-1 text-xs hover:bg-slate-800"
            >
              返回根目录
            </button>
            <button
              type="button"
              onClick={handleBack}
              className="rounded border border-slate-700 px-2 py-1 text-xs hover:bg-slate-800"
            >
              返回上一级
            </button>
          </div>
        </div>
        <div className="overflow-auto rounded-md border border-slate-800">
          <table className="min-w-full text-left text-xs text-slate-200">
            <thead className="bg-slate-900/80">
              <tr>
                <th className="px-3 py-2 font-medium">名称</th>
                <th className="px-3 py-2 font-medium">
                  {isFileLevel ? "项目" : "类型"}
                </th>
                <th className="px-3 py-2 font-medium">
                  {isFileLevel ? "版本" : "数量"}
                </th>
                <th className="px-3 py-2 font-medium">
                  {isFileLevel ? "渠道" : "最后上传时间"}
                </th>
                <th className="px-3 py-2 font-medium">
                  {isFileLevel ? "大小" : ""}
                </th>
                {isFileLevel && (
                  <th className="px-3 py-2 font-medium">操作</th>
                )}
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800 bg-slate-950/40">
              {entries.length === 0 && (
                <tr>
                  <td
                    colSpan={isFileLevel ? 6 : 4}
                    className="px-3 py-6 text-center text-slate-500"
                  >
                    {loading ? "加载中..." : "暂无数据"}
                  </td>
                </tr>
              )}
              {entries.map((entry, idx) => {
                if (entry.type === "file") {
                  if (!isFileLevel) return null;
                  const file = entry.file;
                  return (
                    <tr key={file._id || idx} className="hover:bg-slate-900">
                      <td className="px-3 py-2 align-middle">
                        <div className="flex flex-col gap-0.5">
                          <span className="break-all text-xs font-medium">
                            {file.fileName}
                          </span>
                          <span className="text-[10px] text-slate-500">
                            {file.resVersion &&
                              `资源版本: ${file.resVersion} `}
                            {file.areaName && `大区: ${file.areaName} `}
                            {file.branch && `分支: ${file.branch} `}
                            {file.rbranch &&
                              `资源分支: ${file.rbranch} `}
                            {file.sdk && `SDK: ${file.sdk} `}
                            {file.harden && "已加固 "}
                            {file.codeSignType &&
                              `签名: ${file.codeSignType} `}
                            {file.appId && `AppId: ${file.appId}`}
                          </span>
                        </div>
                      </td>
                      <td className="px-3 py-2 align-middle text-xs text-slate-300">
                        {file.projectName}
                      </td>
                      <td className="px-3 py-2 align-middle text-xs text-slate-300">
                        {file.version}
                      </td>
                      <td className="px-3 py-2 align-middle text-xs text-slate-300">
                        <div className="flex flex-col">
                          <span>
                            {new Date(
                              file.uploadedAt
                            ).toLocaleString()}
                          </span>
                          <span className="text-[10px] text-slate-500">
                            渠道: {file.channel}
                          </span>
                        </div>
                      </td>
                      <td className="px-3 py-2 align-middle text-xs text-slate-300">
                        {(file.size / (1024 * 1024)).toFixed(2)} MB
                      </td>
                      <td className="px-3 py-2 align-middle">
                        <div className="flex flex-wrap gap-1">
                          <button
                            type="button"
                            onClick={() => handleDownload(file)}
                            className="rounded bg-slate-800 px-2 py-1 text-[10px] hover:bg-slate-700"
                          >
                            下载
                          </button>
                          <button
                            type="button"
                            onClick={() => handleInstall(file)}
                            className="rounded bg-emerald-600 px-2 py-1 text-[10px] hover:bg-emerald-500"
                          >
                            安装
                          </button>
                          <button
                            type="button"
                            onClick={() => handleShare(file)}
                            className="rounded bg-indigo-600 px-2 py-1 text-[10px] hover:bg-indigo-500"
                          >
                            分享
                          </button>
                          <button
                            type="button"
                            onClick={() => handleDelete(file)}
                            className="rounded bg-rose-700 px-2 py-1 text-[10px] hover:bg-rose-600"
                          >
                            删除
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                }

                return (
                  <tr
                    key={`${entry.type}-${entry.name}-${idx}`}
                    className="cursor-pointer hover:bg-slate-900"
                    onClick={() => handleOpen(entry)}
                  >
                    <td className="px-3 py-2 align-middle text-xs font-medium text-slate-100">
                      {entry.name}
                    </td>
                    <td className="px-3 py-2 align-middle text-xs text-slate-300">
                      {entry.type === "project"
                        ? "项目"
                        : entry.type === "version"
                        ? "版本"
                        : "渠道"}
                    </td>
                    <td className="px-3 py-2 align-middle text-xs text-slate-300">
                      {entry.fileCount}
                    </td>
                    <td className="px-3 py-2 align-middle text-xs text-slate-300">
                      {entry.latestUploadedAt
                        ? new Date(
                            entry.latestUploadedAt
                          ).toLocaleString()
                        : "-"}
                    </td>
                    <td className="px-3 py-2 align-middle text-xs text-slate-300" />
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
