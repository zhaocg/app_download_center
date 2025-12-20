"use client";

import { useEffect, useState } from "react";
import type { FileMeta } from "../../types/file";

import { DownloadIcon, InstallIcon, ShareIcon, TrashIcon, DefaultAppIcon, AndroidIcon, AppleIcon } from "../components/Icons";
import { QRCodeIcon, QRCodeModal } from "../components/QRCode";
import { useToast } from "../components/Toast";

interface UploadItem extends FileMeta {
  _id: string;
}

interface UploadsResponse {
  items: UploadItem[];
}

export default function HistoryPage() {
  const [items, setItems] = useState<UploadItem[]>([]);
  const [loading, setLoading] = useState(false);
  const toast = useToast();
  const [projects, setProjects] = useState<string[]>([]);
  const [projectsLoading, setProjectsLoading] = useState(false);
  const [projectsError, setProjectsError] = useState<string | null>(null);
  const [projectName, setProjectName] = useState("");
  const [limit, setLimit] = useState(50);
  const [qrCodeUrl, setQrCodeUrl] = useState<string | null>(null);
  const [iconErrors, setIconErrors] = useState<Record<string, boolean>>({});

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
        toast.error(
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

  async function handleDelete(file: UploadItem) {
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
      setItems((prev) =>
        prev.filter(
          (e) => e._id !== file._id
        )
      );
      toast.success("删除成功");
    } catch (err) {
      toast.error(
        err instanceof Error ? err.message : "删除失败，请稍后重试"
      );
    }
  }

  async function handleShare(file: UploadItem) {
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

  function handleDownload(file: UploadItem) {
    if (!file._id) {
      return;
    }
    const url = `/api/download?id=${file._id}`;
    window.open(url, "_blank");
  }

  function handleInstall(file: UploadItem) {
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

  function handleQRCode(file: UploadItem) {
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

  return (
    <div className="flex flex-col gap-4">
      <QRCodeModal 
        url={qrCodeUrl || ""} 
        isOpen={!!qrCodeUrl} 
        onClose={() => setQrCodeUrl(null)} 
        title="扫码安装/下载"
      />
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
                  平台
                </th>
                <th className="px-3 py-2 text-left font-medium text-slate-700">
                  文件名
                </th>
                <th className="px-3 py-2 text-right font-medium text-slate-700">
                  大小
                </th>
                <th className="px-3 py-2 font-medium text-slate-700 w-80">
                  操作
                </th>
              </tr>
            </thead>
            <tbody>
              {items.length === 0 ? (
                <tr>
                  <td
                    colSpan={6}
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
                    <td className="px-3 py-2 align-middle text-xs whitespace-nowrap">
                      {item.platform === "android" ? (
                        <span className="rounded bg-emerald-100 px-2 py-1 font-medium text-emerald-700">
                          Android
                        </span>
                      ) : item.platform === "ios" ? (
                        <span className="rounded bg-slate-100 px-2 py-1 font-medium text-slate-700">
                          iOS
                        </span>
                      ) : (
                        <span className="rounded bg-gray-100 px-2 py-1 font-medium text-gray-700">
                          {item.platform}
                        </span>
                      )}
                    </td>
                    <td className="px-3 py-2 align-middle text-xs text-slate-700">
                      <div className="flex items-center gap-2">
                        {item._id && !iconErrors[item._id] ? (
                          <img
                            src={`/api/icon?id=${item._id}`}
                            alt="App Icon"
                            className="h-8 w-8 rounded-md object-cover shadow-sm bg-slate-100 flex-shrink-0"
                            onError={() => setIconErrors(prev => ({ ...prev, [item._id]: true }))}
                            loading="lazy"
                          />
                        ) : item.fileName.toLowerCase().endsWith(".apk") ? (
                          <AndroidIcon className="h-8 w-8 rounded-md text-emerald-500 bg-emerald-50 p-1.5 flex-shrink-0" />
                        ) : item.fileName.toLowerCase().endsWith(".ipa") ? (
                          <AppleIcon className="h-8 w-8 rounded-md text-slate-600 bg-slate-100 p-1.5 flex-shrink-0" />
                        ) : (
                          <DefaultAppIcon className="h-8 w-8 rounded-md text-slate-400 bg-slate-100 p-1.5 flex-shrink-0" />
                        )}
                        <span>{item.fileName}</span>
                      </div>
                    </td>
                    <td className="px-3 py-2 align-middle text-right text-xs text-slate-700 whitespace-nowrap">
                      {(item.size / (1024 * 1024)).toFixed(2)} MB
                    </td>
                    <td className="px-3 py-2 align-middle whitespace-nowrap">
                      <div className="flex flex-wrap gap-2 justify-end">
                        <button
                          type="button"
                          onClick={() => handleDownload(item)}
                          title="下载"
                          className="rounded p-1.5 text-slate-500 hover:bg-slate-100 hover:text-slate-700 transition-colors"
                        >
                          <DownloadIcon className="h-4 w-4" />
                        </button>
                        <button
                          type="button"
                          onClick={() => handleInstall(item)}
                          title="安装"
                          className="rounded p-1.5 text-emerald-600 hover:bg-emerald-50 hover:text-emerald-700 transition-colors"
                        >
                          <InstallIcon className="h-4 w-4" />
                        </button>
                        <button
                          type="button"
                          onClick={() => handleShare(item)}
                          title="分享"
                          className="rounded p-1.5 text-indigo-600 hover:bg-indigo-50 hover:text-indigo-700 transition-colors"
                        >
                          <ShareIcon className="h-4 w-4" />
                        </button>
                        <button
                          type="button"
                          onClick={() => handleQRCode(item)}
                          title="二维码"
                          className="rounded p-1.5 text-slate-500 hover:bg-slate-100 hover:text-slate-700 transition-colors"
                        >
                          <QRCodeIcon className="h-4 w-4" />
                        </button>
                        <button
                          type="button"
                          onClick={() => handleDelete(item)}
                          title="删除"
                          className="rounded p-1.5 text-rose-600 hover:bg-rose-50 hover:text-rose-700 transition-colors"
                        >
                          <TrashIcon className="h-4 w-4" />
                        </button>
                      </div>
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
