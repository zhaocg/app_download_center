"use client";

import { useEffect, useState } from "react";

type ClearMode = "time" | "project" | "projectVersion";
type DateMode = "fixed" | "daysBefore";

interface ClearResultItem {
  id: string;
  projectName: string;
  version: string;
  channel: string;
  fileName: string;
  uploadedAt: string;
}

interface ClearResult {
  ok: boolean;
  matched: number;
  deleted: number;
  totalSize: number;
  sample: ClearResultItem[];
}

export default function ClearPage() {
  const [mode, setMode] = useState<ClearMode>("time");
  const [projectName, setProjectName] = useState("");
  const [version, setVersion] = useState("");
  const [before, setBefore] = useState("");
  const [dateMode, setDateMode] = useState<DateMode>("fixed");
  const [daysBefore, setDaysBefore] = useState("");
  const [dryRun, setDryRun] = useState(true);
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [result, setResult] = useState<ClearResult | null>(null);
  const [projects, setProjects] = useState<string[]>([]);
  const [projectsLoading, setProjectsLoading] = useState(false);
  const [projectsError, setProjectsError] = useState<string | null>(null);

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

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setMessage(null);
    setResult(null);

    if (mode === "time") {
      if (dateMode === "fixed" && !before && !daysBefore) {
        setMessage("按时间清理时需要选择时间或填写天数");
        return;
      }
      if (dateMode === "daysBefore" && !daysBefore) {
        setMessage("请填写要删除的天数");
        return;
      }
    }
    if (mode === "project" && !projectName) {
      setMessage("按项目清理时需要填写项目名称");
      return;
    }
    if (mode === "projectVersion" && (!projectName || !version)) {
      setMessage("按项目+版本清理时需要填写项目名称和版本号");
      return;
    }

    setLoading(true);
    try {
      const body: any = {
        mode,
        dryRun
      };
      if (before || daysBefore) {
        let beforeIso: string | undefined;
        if (dateMode === "fixed" && before) {
          const date = new Date(before);
          if (!Number.isNaN(date.getTime())) {
            beforeIso = date.toISOString();
          }
        } else if (dateMode === "daysBefore" && daysBefore) {
          const days = Number(daysBefore);
          if (Number.isFinite(days) && days > 0) {
            const date = new Date();
            date.setDate(date.getDate() - Math.floor(days));
            beforeIso = date.toISOString();
          }
        }
        if (beforeIso) {
          body.before = beforeIso;
        }
      }
      if (projectName) {
        body.projectName = projectName;
      }
      if (version) {
        body.version = version;
      }

      const res = await fetch("/api/clear", {
        method: "POST",
        headers: {
          "Content-Type": "application/json"
        },
        body: JSON.stringify(body)
      });
      if (!res.ok) {
        const text = await res.text();
        throw new Error(text || "清理请求失败");
      }
      const data = (await res.json()) as ClearResult;
      setResult(data);
      if (dryRun) {
        setMessage(
          `预览完成，匹配到 ${data.matched} 条记录，预计可释放 ${(
            data.totalSize /
            (1024 * 1024)
          ).toFixed(2)} MB 空间，未实际删除任何数据`
        );
      } else {
        setMessage(
          `清理完成，匹配到 ${data.matched} 条记录，实际删除 ${
            data.deleted
          } 条，释放空间约 ${(
            data.totalSize /
            (1024 * 1024)
          ).toFixed(2)} MB`
        );
      }
    } catch (err) {
      setMessage(
        err instanceof Error ? err.message : "清理失败，请稍后重试"
      );
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="flex flex-col gap-4">
      <div className="rounded-lg border border-red-800 bg-red-950/70 p-3 text-xs text-red-100">
        <p className="font-semibold text-sm mb-1">危险操作：批量清理安装包</p>
        <p>此页面不会出现在导航中，只能通过手动输入地址访问。</p>
        <p>建议先勾选预览模式确认无误后，再关闭预览执行实际删除。</p>
      </div>
      {message && (
        <div className="rounded-md border border-amber-500 bg-amber-950 px-3 py-2 text-sm text-amber-100">
          {message}
        </div>
      )}
      <div className="rounded-lg border border-slate-800 bg-slate-900/60 p-3">
        <h2 className="mb-3 text-sm font-semibold text-slate-50">
          清理条件
        </h2>
        <form
          className="grid gap-3 text-xs md:grid-cols-2"
          onSubmit={handleSubmit}
        >
          <div className="flex flex-col gap-1">
            <label className="text-slate-300">清理方式</label>
            <select
              value={mode}
              onChange={(e) => setMode(e.target.value as ClearMode)}
              className="rounded border border-slate-700 bg-slate-950 px-2 py-1 text-xs"
              >
              <option value="time">按时间清理</option>
              <option value="project">按项目清理</option>
              <option value="projectVersion">按项目+版本清理</option>
            </select>
          </div>
          {(mode === "project" || mode === "projectVersion") && (
            <div className="flex flex-col gap-1">
              <label className="text-slate-300">项目名称</label>
              {projectsLoading ? (
                <div className="text-[11px] text-slate-400">正在加载项目列表...</div>
              ) : projectsError ? (
                <input
                  type="text"
                  value={projectName}
                  onChange={(e) => setProjectName(e.target.value)}
                  className="rounded border border-slate-700 bg-slate-950 px-2 py-1 text-xs"
                  placeholder="加载失败，请手动输入项目名称"
                />
              ) : projects.length > 0 ? (
                <select
                  value={projectName}
                  onChange={(e) => setProjectName(e.target.value)}
                  className="rounded border border-slate-700 bg-slate-950 px-2 py-1 text-xs"
                >
                  <option value="">请选择项目</option>
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
                  className="rounded border border-slate-700 bg-slate-950 px-2 py-1 text-xs"
                  placeholder="暂无项目数据，请手动输入项目名称"
                />
              )}
            </div>
          )}
          {mode === "projectVersion" && (
            <div className="flex flex-col gap-1">
              <label className="text-slate-300">版本号</label>
              <input
                type="text"
                value={version}
                onChange={(e) => setVersion(e.target.value)}
                className="rounded border border-slate-700 bg-slate-950 px-2 py-1 text-xs"
                placeholder="例如 1.0.0"
              />
            </div>
          )}
          <div className="flex flex-col gap-1 md:col-span-2">
            <label className="text-slate-300">
              上传时间条件{mode !== "time" ? "（可选）" : ""}
            </label>
            <div className="flex flex-col gap-2 md:flex-row">
              <div className="flex items-center gap-2">
                <input
                  id="dateModeFixed"
                  type="radio"
                  checked={dateMode === "fixed"}
                  onChange={() => setDateMode("fixed")}
                  className="h-3 w-3"
                />
                <label htmlFor="dateModeFixed" className="text-slate-300">
                  指定具体时间
                </label>
              </div>
              <div className="flex items-center gap-2">
                <input
                  id="dateModeDays"
                  type="radio"
                  checked={dateMode === "daysBefore"}
                  onChange={() => setDateMode("daysBefore")}
                  className="h-3 w-3"
                />
                <label htmlFor="dateModeDays" className="text-slate-300">
                  删除 N 天之前的记录
                </label>
              </div>
            </div>
            {dateMode === "fixed" && (
              <div className="mt-1">
                <input
                  type="datetime-local"
                  value={before}
                  onChange={(e) => setBefore(e.target.value)}
                  className="w-full rounded border border-slate-700 bg-slate-950 px-2 py-1 text-xs"
                />
              </div>
            )}
            {dateMode === "daysBefore" && (
              <div className="mt-1 flex items-center gap-2">
                <input
                  type="number"
                  min={1}
                  value={daysBefore}
                  onChange={(e) => setDaysBefore(e.target.value)}
                  className="w-28 rounded border border-slate-700 bg-slate-950 px-2 py-1 text-xs"
                  placeholder="例如 30"
                />
                <span className="text-[11px] text-slate-400">
                  删除当前时间往前推 N 天之前上传的记录
                </span>
              </div>
            )}
          </div>
          <div className="flex items-center gap-2 md:col-span-2">
            <input
              id="dryRun"
              type="checkbox"
              checked={dryRun}
              onChange={(e) => setDryRun(e.target.checked)}
              className="h-3 w-3 rounded border-slate-700 bg-slate-950"
            />
            <label htmlFor="dryRun" className="text-slate-300">
              预览模式（仅统计和展示将被清理的记录，不实际删除）
            </label>
          </div>
          <div className="md:col-span-2">
            <button
              type="submit"
              disabled={loading}
              className="rounded bg-red-600 px-4 py-2 text-xs font-semibold text-white hover:bg-red-500 disabled:cursor-not-allowed disabled:bg-red-900"
            >
              {loading
                ? "正在执行..."
                : dryRun
                  ? "预览清理结果"
                  : "执行清理"}
            </button>
          </div>
        </form>
      </div>
      {result && (
        <div className="rounded-lg border border-slate-800 bg-slate-900/60 p-3">
          <h2 className="mb-2 text-sm font-semibold text-slate-50">
            清理结果
          </h2>
          <p className="mb-2 text-xs text-slate-300">
            匹配到 {result.matched} 条记录，已删除 {result.deleted} 条，涉及空间约{" "}
            {(result.totalSize / (1024 * 1024)).toFixed(2)} MB。
          </p>
          {result.sample.length > 0 && (
            <div className="max-h-64 overflow-y-auto rounded border border-slate-800">
              <table className="min-w-full text-left text-[11px]">
                <thead className="bg-slate-900">
                  <tr>
                    <th className="px-2 py-1 text-slate-400">项目</th>
                    <th className="px-2 py-1 text-slate-400">版本</th>
                    <th className="px-2 py-1 text-slate-400">渠道</th>
                    <th className="px-2 py-1 text-slate-400">文件名</th>
                    <th className="px-2 py-1 text-slate-400">上传时间</th>
                  </tr>
                </thead>
                <tbody>
                  {result.sample.map((item) => (
                    <tr key={item.id} className="border-t border-slate-800">
                      <td className="px-2 py-1 text-slate-200">
                        {item.projectName}
                      </td>
                      <td className="px-2 py-1 text-slate-200">
                        {item.version}
                      </td>
                      <td className="px-2 py-1 text-slate-200">
                        {item.channel}
                      </td>
                      <td className="px-2 py-1 text-slate-200">
                        {item.fileName}
                      </td>
                      <td className="px-2 py-1 text-slate-400">
                        {new Date(item.uploadedAt).toLocaleString()}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
