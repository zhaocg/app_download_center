"use client";

import { useEffect, useMemo, useState } from "react";
import type { FileMeta, SortField, SortOrder } from "../types/file";
import { DownloadIcon, InstallIcon, ShareIcon, TrashIcon, DefaultAppIcon, AndroidIcon, AppleIcon } from "./components/Icons";
import { QRCodeIcon, QRCodeModal } from "./components/QRCode";
import { useToast } from "./components/Toast";

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
  const toast = useToast();
  const [qrCodeUrl, setQrCodeUrl] = useState<string | null>(null);
  const [iconErrors, setIconErrors] = useState<Record<string, boolean>>({});
  const [filterText, setFilterText] = useState("");

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
        toast.error(
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
      toast.success("删除成功");
    } catch (err) {
      toast.error(
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
        toast.success("分享链接已复制到剪贴板");
      } else {
        toast.info(`分享链接: ${data.url}`, 5000);
      }
    } catch (err) {
      toast.error(
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

  function handleQRCode(file: FileMeta) {
    if (!file._id) {
      return;
    }
    const origin = window.location.origin;
    let url = "";
    
    if (file.platform === "ios") {
      // For iOS, generate ITMS link for direct install
      const manifestUrl = `${origin}/api/ios/manifest?id=${file._id}`;
      url = `itms-services://?action=download-manifest&url=${encodeURIComponent(manifestUrl)}`;
    } else {
      // For Android/Other, direct download link
      url = `${origin}/api/download?id=${file._id}`;
    }
    
    setQrCodeUrl(url);
  }

  const isFileLevel = level === "file";

  const filteredEntries = useMemo(() => {
    if (!filterText) return entries;
    const lower = filterText.toLowerCase();
    return entries.filter((entry) => {
      if (entry.type === "file") {
        const file = entry.file;
        return (
          file.fileName.toLowerCase().includes(lower) ||
          (file.channel && file.channel.toLowerCase().includes(lower)) ||
          (file.resVersion && file.resVersion.toLowerCase().includes(lower)) ||
          (file.areaName && file.areaName.toLowerCase().includes(lower)) ||
          (file.branch && file.branch.toLowerCase().includes(lower)) ||
          (file.rbranch && file.rbranch.toLowerCase().includes(lower)) ||
          (file.sdk && file.sdk.toLowerCase().includes(lower)) ||
          (file.codeSignType && file.codeSignType.toLowerCase().includes(lower)) ||
          (file.appId && file.appId.toLowerCase().includes(lower)) ||
          (file.harden && lower.includes("加固"))
        );
      }
      return entry.name.toLowerCase().includes(lower);
    });
  }, [entries, filterText]);

  return (
    <div className="flex flex-col gap-4">
      <QRCodeModal 
        url={qrCodeUrl || ""} 
        isOpen={!!qrCodeUrl} 
        onClose={() => setQrCodeUrl(null)} 
        title="扫码安装/下载"
      />
      <div className="flex flex-col gap-3 rounded-lg border border-slate-200 bg-white p-3 shadow-sm">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div className="flex flex-wrap items-center gap-2 text-xs text-slate-700">
            {breadcrumb.map((item, idx) => (
              <div key={idx} className="flex items-center gap-1">
                {idx > 0 && <span className="text-slate-400">/</span>}
                <button
                  type="button"
                  disabled={!item.onClick}
                  onClick={item.onClick}
                  className={
                    item.onClick
                      ? "rounded px-1 py-0.5 hover:bg-slate-100"
                      : "cursor-default"
                  }
                >
                  {item.label}
                </button>
              </div>
            ))}
          </div>
          <div className="flex items-center gap-2 text-xs text-slate-700">
            <span>筛选:</span>
            <input
              type="text"
              value={filterText}
              onChange={(e) => setFilterText(e.target.value)}
              placeholder="输入名称过滤..."
              className="w-32 rounded border border-slate-300 bg-white px-1.5 py-1 text-xs placeholder:text-slate-400 focus:border-blue-500 focus:outline-none"
            />
            <span className="ml-2">排序:</span>
            <select
              value={sortField}
              onChange={(e) =>
                setSortField(e.target.value as SortField)
              }
              className="rounded border border-slate-300 bg-white px-1.5 py-1 text-xs"
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
              className="rounded border border-slate-300 bg-white px-1.5 py-1 text-xs"
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
              className="rounded border border-slate-300 bg-white px-2 py-1 text-xs hover:bg-slate-100"
            >
              返回根目录
            </button>
            <button
              type="button"
              onClick={handleBack}
              className="rounded border border-slate-300 bg-white px-2 py-1 text-xs hover:bg-slate-100"
            >
              返回上一级
            </button>
          </div>
        </div>
        <div className="overflow-auto rounded-md border border-slate-200">
          <table className="min-w-full text-left text-xs text-slate-700">
            <thead className="bg-slate-100">
              <tr>
                <th className="px-3 py-2 font-medium">名称</th>
                {!isFileLevel && (
                  <th className="px-3 py-2 font-medium w-24 whitespace-nowrap">类型</th>
                )}
                {!isFileLevel && (
                  <th className="px-3 py-2 font-medium w-24 whitespace-nowrap">数量</th>
                )}
                <th className="px-3 py-2 font-medium w-48 whitespace-nowrap">最后上传时间</th>
                {isFileLevel && (
                  <th className="px-3 py-2 font-medium w-24 whitespace-nowrap">大小</th>
                )}
                {isFileLevel && (
                  <th className="px-3 py-2 font-medium w-40 whitespace-nowrap">操作</th>
                )}
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-200 bg-white">
              {filteredEntries.length === 0 && (
                <tr>
                  <td
                    colSpan={isFileLevel ? 4 : 4}
                    className="px-3 py-6 text-center text-slate-500"
                  >
                    {loading ? "加载中..." : filterText ? "未找到匹配项" : "暂无数据"}
                  </td>
                </tr>
              )}
              {filteredEntries.map((entry, idx) => {
                if (entry.type === "file") {
                  if (!isFileLevel) return null;
                  const file = entry.file;
                  return (
                    <tr key={file._id || idx} className="hover:bg-slate-50">
                      <td className="px-3 py-2 align-middle">
                        <div className="flex items-start gap-2">
                          {file._id && !iconErrors[file._id] ? (
                            <img
                              src={`/api/icon?id=${file._id}`}
                              alt="App Icon"
                              className="h-8 w-8 rounded-md object-cover shadow-sm bg-slate-100 flex-shrink-0"
                              onError={() => setIconErrors(prev => ({ ...prev, [file._id]: true }))}
                              loading="lazy"
                            />
                          ) : file.fileName.toLowerCase().endsWith(".apk") ? (
                            <AndroidIcon className="h-8 w-8 rounded-md text-emerald-500 bg-emerald-50 p-1.5 flex-shrink-0" />
                          ) : file.fileName.toLowerCase().endsWith(".ipa") ? (
                            <AppleIcon className="h-8 w-8 rounded-md text-slate-600 bg-slate-100 p-1.5 flex-shrink-0" />
                          ) : (
                            <DefaultAppIcon className="h-8 w-8 rounded-md text-slate-400 bg-slate-100 p-1.5 flex-shrink-0" />
                          )}
                          <div className="flex flex-col gap-1 flex-1">
                            <span className="break-all text-xs font-medium">
                              {file.fileName}
                            </span>
                            <div className="flex flex-wrap items-center gap-2 text-[10px]">
                              <span className="rounded bg-slate-50 px-1.5 py-0.5 text-slate-600 border border-slate-200">
                                {file.channel}
                              </span>
                              {file.resVersion && (
                                <span className="rounded bg-blue-50 px-1.5 py-0.5 text-blue-600 border border-blue-100">
                                  资源: {file.resVersion}
                                </span>
                              )}
                              {file.areaName && (
                                <span className="rounded bg-orange-50 px-1.5 py-0.5 text-orange-600 border border-orange-100">
                                  大区: {file.areaName}
                                </span>
                              )}
                              {file.branch && (
                                <span className="rounded bg-purple-50 px-1.5 py-0.5 text-purple-600 border border-purple-100">
                                  分支: {file.branch}
                                </span>
                              )}
                              {file.rbranch && (
                                <span className="rounded bg-purple-50 px-1.5 py-0.5 text-purple-600 border border-purple-100">
                                  资源分支: {file.rbranch}
                                </span>
                              )}
                              {file.sdk && (
                                <span className="rounded bg-cyan-50 px-1.5 py-0.5 text-cyan-600 border border-cyan-100">
                                  SDK: {file.sdk}
                                </span>
                              )}
                              {file.harden && (
                                <span className="rounded bg-emerald-50 px-1.5 py-0.5 text-emerald-600 border border-emerald-100">
                                  已加固
                                </span>
                              )}
                              {file.codeSignType && (
                                <span className="rounded bg-gray-50 px-1.5 py-0.5 text-gray-600 border border-gray-100">
                                  签名: {file.codeSignType}
                                </span>
                              )}
                              {file.appId && (
                                <span className="rounded bg-gray-50 px-1.5 py-0.5 text-gray-500 border border-gray-100 font-mono">
                                  {file.appId}
                                </span>
                              )}
                            </div>
                          </div>
                        </div>
                      </td>
                      <td className="px-3 py-2 align-middle text-xs text-slate-700">
                        {new Date(file.uploadedAt).toLocaleString()}
                      </td>
                      <td className="px-3 py-2 align-middle text-xs text-slate-700">
                        {(file.size / (1024 * 1024)).toFixed(2)} MB
                      </td>
                      <td className="px-3 py-2 align-middle">
                        <div className="flex flex-wrap gap-2">
                          <button
                            type="button"
                            onClick={() => handleDownload(file)}
                            title="下载"
                            className="rounded p-1.5 text-slate-500 hover:bg-slate-100 hover:text-slate-700 transition-colors"
                          >
                            <DownloadIcon className="h-4 w-4" />
                          </button>
                          <button
                            type="button"
                            onClick={() => handleInstall(file)}
                            title="安装"
                            className="rounded p-1.5 text-emerald-600 hover:bg-emerald-50 hover:text-emerald-700 transition-colors"
                          >
                            <InstallIcon className="h-4 w-4" />
                          </button>
                          <button
                            type="button"
                            onClick={() => handleShare(file)}
                            title="分享"
                            className="rounded p-1.5 text-indigo-600 hover:bg-indigo-50 hover:text-indigo-700 transition-colors"
                          >
                            <ShareIcon className="h-4 w-4" />
                          </button>
                          <button
                            type="button"
                            onClick={() => handleQRCode(file)}
                            title="二维码"
                            className="rounded p-1.5 text-slate-500 hover:bg-slate-100 hover:text-slate-700 transition-colors"
                          >
                            <QRCodeIcon className="h-4 w-4" />
                          </button>
                          <button
                            type="button"
                            onClick={() => handleDelete(file)}
                            title="删除"
                            className="rounded p-1.5 text-rose-600 hover:bg-rose-50 hover:text-rose-700 transition-colors"
                          >
                            <TrashIcon className="h-4 w-4" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                }

                return (
                  <tr
                    key={`${entry.type}-${entry.name}-${idx}`}
                    className="cursor-pointer hover:bg-slate-50"
                    onClick={() => handleOpen(entry)}
                  >
                    <td className="px-3 py-2 align-middle text-xs font-medium text-slate-900">
                      {entry.name}
                    </td>
                    <td className="px-3 py-2 align-middle text-xs text-slate-700">
                      {entry.type === "project"
                        ? "项目"
                        : entry.type === "version"
                        ? "版本"
                        : "渠道"}
                    </td>
                    <td className="px-3 py-2 align-middle text-xs text-slate-700">
                      {entry.fileCount}
                    </td>
                    <td className="px-3 py-2 align-middle text-xs text-slate-700">
                      {entry.latestUploadedAt
                        ? new Date(
                            entry.latestUploadedAt
                          ).toLocaleString()
                        : "-"}
                    </td>
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
