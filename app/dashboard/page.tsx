"use client";

import { useState, useEffect, useRef } from "react";
import { useRouter } from "next/navigation";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Checkbox } from "@/components/ui/checkbox";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Separator } from "@/components/ui/separator";
import { toast } from "sonner";
import { Play, Square, RefreshCcw, Mail, Cpu, Server, Trash2, LogOut, Terminal } from "lucide-react";
import { cn } from "@/lib/utils";
import { Instance, UserInfo, Tenant } from "@/lib/autodl";

interface LogEntry {
  id: string;
  timestamp: string;
  type: "info" | "success" | "error";
  message: string;
}

interface MachineStatus {
  machine_name: string;
  gpu: {
    idle: number;
    total: number;
  };
  is_running: boolean;
}

const AUTH_STORAGE_KEY = "autodl-authorization";
const LEGACY_TOKEN_STORAGE_KEY = "autodl-token";

export default function DashboardPage() {
  const router = useRouter();

  const [instances, setInstances] = useState<Instance[]>([]);
  const [selectedUuids, setSelectedUuids] = useState<Set<string>>(new Set());
  const [isLoadingInstances, setIsLoadingInstances] = useState(false);
  const [userInfo, setUserInfo] = useState<UserInfo | null>(null);
  const [tenants, setTenants] = useState<Tenant[]>([]);
  const [isSwitchingTenant, setIsSwitchingTenant] = useState(false);

  const [isMonitoring, setIsMonitoring] = useState(false);
  const [intervalSeconds, setIntervalSeconds] = useState(30);
  const [logs, setLogs] = useState<LogEntry[]>([]);
  const monitorTimerRef = useRef<NodeJS.Timeout | null>(null);

  const [emailEnabled, setEmailEnabled] = useState(false);
  const [emailAddress, setEmailAddress] = useState("");

  const scrollRef = useRef<HTMLDivElement>(null);
  const [autoScroll, setAutoScroll] = useState(true);

  const getAuthorization = () => {
    const authorization =
      localStorage.getItem(AUTH_STORAGE_KEY) ?? localStorage.getItem(LEGACY_TOKEN_STORAGE_KEY) ?? "";

    if (authorization) {
      localStorage.setItem(AUTH_STORAGE_KEY, authorization);
      localStorage.removeItem(LEGACY_TOKEN_STORAGE_KEY);
    }

    return authorization;
  };

  const clearAuthorization = () => {
    localStorage.removeItem(AUTH_STORAGE_KEY);
    localStorage.removeItem(LEGACY_TOKEN_STORAGE_KEY);
  };

  const isRunningStatus = (status: string) => {
    if (!status) return false;
    const lower = status.toLowerCase();
    return status === "正在运行" || status === "运行中" || lower === "running";
  };

  useEffect(() => {
    const authorization = getAuthorization();
    if (!authorization) {
      router.replace("/");
      return;
    }

    fetchUserInfo();
    fetchInstances();
    fetchTenants();
  }, []);

  useEffect(() => {
    if (autoScroll && scrollRef.current) {
      const scrollElement = scrollRef.current.querySelector('[data-radix-scroll-area-viewport]');
      if (scrollElement) {
        scrollElement.scrollTop = scrollElement.scrollHeight;
      }
    }
  }, [logs, autoScroll]);

  useEffect(() => {
    return () => {
      if (monitorTimerRef.current) {
        clearInterval(monitorTimerRef.current);
      }
    };
  }, []);

  const addLog = (type: LogEntry["type"], message: string) => {
    const now = new Date();
    const timestamp = `[${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}-${String(now.getDate()).padStart(2, "0")} ${String(now.getHours()).padStart(2, "0")}:${String(now.getMinutes()).padStart(2, "0")}:${String(now.getSeconds()).padStart(2, "0")}]`;

    let safeMessage = message;
    if (message.includes("ticket") || message.includes("token")) {
      safeMessage = message.replace(/(ticket|token)["']?\s*[:=]\s*["']?([a-zA-Z0-9]{10})[a-zA-Z0-9]+["']?/gi, "$1 $2...");
    }

    setLogs((prev) => {
      const next = [...prev, { id: Math.random().toString(36).slice(2, 11), timestamp, type, message: safeMessage }];
      return next.length > 500 ? next.slice(next.length - 500) : next;
    });
  };

  const fetchUserInfo = async () => {
    try {
      const authorization = getAuthorization();
      if (!authorization) return;

      const res = await fetch("/api/autodl/user", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: authorization,
        },
        body: JSON.stringify({}),
      });

      const data = await res.json();
      if (data.code === "Success") {
        setUserInfo(data.data);
      }
    } catch (error) {
      console.error("Fetch user info error:", error);
    }
  };

  const fetchTenants = async () => {
    try {
      const authorization = getAuthorization();
      if (!authorization) return;

      const res = await fetch("/api/autodl/tenant/list", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: authorization,
        },
        body: JSON.stringify({}),
      });

      const data = await res.json();
      if (data.code === "Success") {
        setTenants(data.data);
      }
    } catch (error) {
      console.error("Fetch tenants error:", error);
    }
  };

  const handleSwitchTenant = async (tenant_uuid: string) => {
    if (!tenant_uuid || isSwitchingTenant) return;

    setIsSwitchingTenant(true);
    try {
      const authorization = getAuthorization();
      if (!authorization) return;

      const res = await fetch("/api/autodl/tenant/switch", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: authorization,
        },
        body: JSON.stringify({ tenant_uuid }),
      });

      const data = await res.json();
      if (data.code === "Success" && data.data?.token) {
        localStorage.setItem(AUTH_STORAGE_KEY, data.data.token);
        localStorage.removeItem(LEGACY_TOKEN_STORAGE_KEY);
        toast.success("切换集群成功");
        setInstances([]);
        setSelectedUuids(new Set());
        fetchUserInfo();
        fetchInstances();
        fetchTenants();
      } else {
        toast.error("切换集群失败", { description: data.msg });
      }
    } catch (error) {
      console.error("Switch tenant error:", error);
      toast.error("切换集群请求失败");
    } finally {
      setIsSwitchingTenant(false);
    }
  };

  const handleUnauthorized = () => {
    stopMonitor();
    clearAuthorization();
    toast.error("Authorization 已失效，请重新输入");
    router.push("/");
  };

  const fetchInstances = async () => {
    setIsLoadingInstances(true);
    try {
      const authorization = getAuthorization();
      if (!authorization) {
        router.push("/");
        return;
      }

      const res = await fetch("/api/autodl/instances", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: authorization,
        },
        body: JSON.stringify({}),
      });
      const data = await res.json();

      if (data.code === "Success") {
        const list = data.data.list || [];
        setInstances(list);
        toast.success("实例列表已刷新");
      } else if (data.code === "Error" && data.msg === "Unauthorized") {
        handleUnauthorized();
      } else {
        toast.error("获取实例失败", { description: data.msg });
        addLog("error", `获取实例失败: ${data.msg}`);
      }
    } catch (error) {
      toast.error("网络请求失败");
      addLog("error", "获取实例网络请求失败");
    } finally {
      setIsLoadingInstances(false);
    }
  };

  const handleLogout = () => {
    clearAuthorization();
    router.push("/");
  };

  const toggleSelection = (uuid: string) => {
    const next = new Set(selectedUuids);
    if (next.has(uuid)) {
      next.delete(uuid);
    } else {
      next.add(uuid);
    }
    setSelectedUuids(next);
  };

  const selectAll = () => {
    const selectable = instances.filter((instance) => !isRunningStatus(instance.status)).map((instance) => instance.instance_uuid);
    if (selectedUuids.size === selectable.length && selectable.length > 0) {
      setSelectedUuids(new Set());
    } else {
      setSelectedUuids(new Set(selectable));
    }
  };

  const getTargetMappings = () => {
    const selectedList = instances.filter((instance) => selectedUuids.has(instance.instance_uuid));
    const targetMachines = Array.from(new Set(selectedList.map((instance) => instance.machine_name)));
    const machinesUid: Record<string, string[]> = {};

    selectedList.forEach((instance) => {
      if (!machinesUid[instance.machine_name]) {
        machinesUid[instance.machine_name] = [];
      }
      machinesUid[instance.machine_name].push(instance.instance_uuid);
    });

    return { selectedList, targetMachines, machinesUid };
  };

  const startMonitor = () => {
    if (selectedUuids.size === 0) {
      toast.error("请先选择至少一个实例");
      return;
    }
    if (emailEnabled && !emailAddress) {
      toast.error("启用邮件通知时，请输入有效的邮箱地址");
      return;
    }
    if (intervalSeconds < 10) {
      toast.error("监控间隔不能小于 10 秒");
      return;
    }

    setIsMonitoring(true);
    addLog("info", "开始监控...");
    toast.info("监控已启动");
    runMonitorStep();
    monitorTimerRef.current = setInterval(runMonitorStep, intervalSeconds * 1000);
  };

  const stopMonitor = () => {
    if (monitorTimerRef.current) {
      clearInterval(monitorTimerRef.current);
      monitorTimerRef.current = null;
    }
    setIsMonitoring(false);
    addLog("info", "监控已停止");
    toast.info("监控已停止");
  };

  const runMonitorStep = async () => {
    const { targetMachines, machinesUid } = getTargetMappings();

    addLog("info", `开始检查机器状态... (目标机器数: ${targetMachines.length})`);

    try {
      const authorization = getAuthorization();
      if (!authorization) {
        stopMonitor();
        router.push("/");
        return;
      }

      const res = await fetch("/api/autodl/machines", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: authorization,
        },
        body: JSON.stringify({}),
      });
      const data = await res.json();

      if (data.code !== "Success") {
        addLog("error", `获取机器列表失败: ${data.msg}`);
        if (data.msg === "Unauthorized") {
          handleUnauthorized();
        }
        return;
      }

      const allMachines: MachineStatus[] = data.data.list || [];
      const targetMachineStatus = allMachines.filter((machine) => targetMachines.includes(machine.machine_name));

      let foundAvailable = false;

      for (const machine of targetMachineStatus) {
        const gpuIdle = machine.gpu?.idle || 0;
        const isRunning = machine.is_running;

        if (gpuIdle > 0 && !isRunning) {
          addLog("success", `发现可用机器: ${machine.machine_name} (空闲 GPU: ${gpuIdle})`);
          foundAvailable = true;

          const uuidsToTry = machinesUid[machine.machine_name] || [];

          for (const uuid of uuidsToTry) {
            addLog("info", `尝试启动实例: ${uuid} ...`);

            try {
              const startRes = await fetch("/api/autodl/power-on", {
                method: "POST",
                headers: {
                  "Content-Type": "application/json",
                  Authorization: authorization,
                },
                body: JSON.stringify({ instance_uuid: uuid }),
              });

              const startData = await startRes.json();

              if (startData.code === "Success") {
                addLog("success", `启动成功! 实例: ${uuid}`);
                toast.success(`实例启动成功: ${machine.machine_name}`);

                if (emailEnabled && emailAddress) {
                  addLog("info", "正在发送邮件通知...");
                  fetch("/api/notify/email", {
                    method: "POST",
                    headers: { "Content-Type": "application/json" },
                    body: JSON.stringify({
                      machine_name: machine.machine_name,
                      instance_uuid: uuid,
                      to: emailAddress,
                    }),
                  })
                    .then(() => addLog("success", "邮件发送请求已提交"))
                    .catch(() => addLog("error", "邮件发送请求失败"));
                }

                stopMonitor();
                return;
              }

              addLog("error", `启动失败: ${startData.msg}`);
            } catch (error) {
              addLog("error", `启动请求异常: ${error}`);
            }
          }
        }
      }

      if (!foundAvailable) {
        addLog("info", "本轮未发现可用机器，等待下一轮...");
      }
    } catch (error) {
      addLog("error", `监控过程中发生异常: ${error}`);
    }
  };

  const { targetMachines } = getTargetMappings();
  const selectableCount = instances.filter((instance) => !isRunningStatus(instance.status)).length;

  return (
    <div className="min-h-screen bg-gray-50 p-4 dark:bg-gray-900 lg:p-8">
      <div className="flex flex-col gap-6">
        <div className="flex items-center justify-between rounded-xl border bg-card p-4 shadow-sm">
          <div className="flex items-center gap-2">
            <div className="rounded-lg bg-primary/10 p-2">
              <Cpu className="h-6 w-6 text-primary" />
            </div>
            <div>
              <h1 className="text-xl font-bold tracking-tight">AutoDL 监控控制台</h1>
              <p className="text-xs text-muted-foreground">Private Cloud GPU Monitor</p>
            </div>
          </div>

          {tenants.length > 0 && userInfo && (
            <div className="mr-4 hidden md:block">
              <select
                className="h-9 w-[160px] rounded-md border border-input bg-background px-3 py-1 text-sm shadow-sm transition-colors focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring disabled:cursor-not-allowed disabled:opacity-50"
                value={userInfo.tenant_uuid}
                onChange={(e) => handleSwitchTenant(e.target.value)}
                disabled={isSwitchingTenant}
              >
                {tenants.map((tenant) => (
                  <option key={tenant.tenant_uuid} value={tenant.tenant_uuid}>
                    {tenant.tenant_name} ({tenant.role === "admin" ? "管理" : "成员"})
                  </option>
                ))}
              </select>
            </div>
          )}

          <div className="mr-4 flex flex-col items-end">
            {userInfo ? (
              <>
                <span className="text-sm font-medium">{userInfo.username}</span>
                <span className="text-xs text-muted-foreground">余额: {(userInfo.balance / 1000).toFixed(3)} 元</span>
              </>
            ) : (
              <span className="text-xs text-muted-foreground animate-pulse">正在获取用户信息...</span>
            )}
          </div>

          <div className="flex items-center gap-3">
            <Badge variant={isMonitoring ? "success" : "secondary"} className="h-8 px-3">
              {isMonitoring ? (
                <span className="flex items-center gap-1">
                  <RefreshCcw className="h-3 w-3 animate-spin" /> 监控运行中
                </span>
              ) : (
                "已停止"
              )}
            </Badge>
            <Button variant="ghost" size="icon" onClick={handleLogout} title="清除 Authorization">
              <LogOut className="h-5 w-5" />
            </Button>
          </div>
        </div>

        <div className="grid flex-1 grid-cols-1 gap-6 lg:grid-cols-12">
          <Card className="flex h-[600px] flex-col shadow-md lg:col-span-5 lg:h-auto">
            <CardHeader className="pb-3">
              <div className="flex items-center justify-between">
                <CardTitle className="flex items-center gap-2 text-lg">
                  <Server className="h-5 w-5" /> 实例列表
                </CardTitle>
                <Button variant="outline" size="sm" onClick={fetchInstances} disabled={isLoadingInstances || isMonitoring}>
                  <RefreshCcw className={cn("mr-1 h-4 w-4", isLoadingInstances && "animate-spin")} /> 刷新
                </Button>
              </div>
              <CardDescription>
                选择需要监控的实例 ({selectedUuids.size} 已选 / {instances.length} 总计)
              </CardDescription>
            </CardHeader>
            <Separator />
            <div className="flex items-center justify-between bg-muted/30 p-3">
              <div className="flex items-center gap-2">
                <Checkbox
                  checked={selectableCount > 0 && selectedUuids.size === selectableCount}
                  onChange={() => selectAll()}
                  disabled={isMonitoring}
                />
                <span className="text-sm text-muted-foreground">全选 / 反选</span>
              </div>
              <span className="text-xs text-muted-foreground">涉及机器: {targetMachines.length} 台</span>
            </div>
            <CardContent className="flex-1 overflow-hidden p-0">
              <ScrollArea className="h-full">
                <div className="space-y-3 p-4">
                  {instances.length === 0 ? (
                    <div className="py-10 text-center text-muted-foreground">
                      {isLoadingInstances ? "加载中..." : "暂无实例数据"}
                    </div>
                  ) : (
                    instances.map((instance) => (
                      <div
                        key={instance.instance_uuid}
                        className={cn(
                          "flex cursor-pointer items-start gap-3 rounded-lg border p-3 transition-all hover:bg-accent/50",
                          selectedUuids.has(instance.instance_uuid) ? "border-primary/50 bg-primary/5" : "border-transparent bg-card"
                        )}
                        onClick={() => (!isMonitoring && !isRunningStatus(instance.status)) && toggleSelection(instance.instance_uuid)}
                      >
                        <Checkbox
                          checked={selectedUuids.has(instance.instance_uuid)}
                          className="mt-1"
                          disabled={isMonitoring || isRunningStatus(instance.status)}
                        />
                        <div className="flex-1 space-y-1">
                          <div className="flex items-start justify-between">
                            <span className="text-sm font-medium">{instance.machine_name}</span>
                            <Badge variant={isRunningStatus(instance.status) ? "success" : "secondary"} className="h-5 px-1.5 text-[10px]">
                              {instance.status}
                            </Badge>
                          </div>
                          <div className="text-xs text-muted-foreground">
                            {instance.gpu_name} x {instance.req_gpu_amount || 1}
                          </div>
                          <div className="max-w-[200px] truncate font-mono text-[10px] text-muted-foreground/60" title={instance.instance_uuid}>
                            UUID: {instance.instance_uuid}
                          </div>
                        </div>
                      </div>
                    ))
                  )}
                </div>
              </ScrollArea>
            </CardContent>
          </Card>

          <div className="flex h-full flex-col gap-6 lg:col-span-7">
            <Card className="shadow-md">
              <CardHeader className="pb-3">
                <CardTitle className="flex items-center gap-2 text-lg">
                  <Terminal className="h-5 w-5" /> 监控配置
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-6">
                <div className="grid grid-cols-1 gap-6 md:grid-cols-2">
                  <div className="space-y-3">
                    <label className="text-sm font-medium">监控间隔 (秒)</label>
                    <div className="flex items-center gap-3">
                      <Input
                        type="number"
                        min={10}
                        value={intervalSeconds}
                        onChange={(e) => setIntervalSeconds(parseInt(e.target.value, 10) || 30)}
                        disabled={isMonitoring}
                      />
                      <span className="whitespace-nowrap text-xs text-muted-foreground">最少 10s</span>
                    </div>
                  </div>

                  <div className="flex items-end gap-3">
                    {!isMonitoring ? (
                      <Button className="w-full" onClick={startMonitor} disabled={selectedUuids.size === 0}>
                        <Play className="mr-2 h-4 w-4" /> 开始监控
                      </Button>
                    ) : (
                      <Button variant="destructive" className="w-full" onClick={stopMonitor}>
                        <Square className="mr-2 h-4 w-4" /> 停止监控
                      </Button>
                    )}
                  </div>
                </div>

                <Separator />

                <div className="space-y-3">
                  <div className="flex items-center gap-2">
                    <Checkbox
                      id="email-notify"
                      checked={emailEnabled}
                      onChange={(e) => setEmailEnabled(e.currentTarget.checked)}
                      disabled={isMonitoring}
                    />
                    <label htmlFor="email-notify" className="flex cursor-pointer items-center gap-1 text-sm font-medium">
                      <Mail className="h-4 w-4" /> 启用邮件通知
                    </label>
                  </div>
                  {emailEnabled && (
                    <Input
                      placeholder="接收通知的邮箱地址"
                      value={emailAddress}
                      onChange={(e) => setEmailAddress(e.target.value)}
                      disabled={isMonitoring}
                    />
                  )}
                </div>
              </CardContent>
            </Card>

            <Card className="flex min-h-[400px] flex-1 flex-col shadow-md">
              <CardHeader className="py-4 pb-2">
                <div className="flex items-center justify-between">
                  <CardTitle className="text-base font-medium">运行日志</CardTitle>
                  <div className="flex items-center gap-2">
                    <div className="mr-2 flex items-center gap-1.5">
                      <Checkbox
                        id="auto-scroll"
                        checked={autoScroll}
                        onChange={(e) => setAutoScroll(e.currentTarget.checked)}
                      />
                      <label htmlFor="auto-scroll" className="cursor-pointer text-xs text-muted-foreground">
                        自动滚动
                      </label>
                    </div>
                    <Button variant="ghost" size="sm" onClick={() => setLogs([])} className="h-8 w-8 p-0">
                      <Trash2 className="h-4 w-4 text-muted-foreground" />
                    </Button>
                  </div>
                </div>
              </CardHeader>
              <Separator />
              <CardContent className="relative flex-1 overflow-hidden rounded-b-xl bg-zinc-950 p-0 font-mono text-xs text-zinc-50">
                <ScrollArea className="h-full w-full" ref={scrollRef}>
                  <div className="space-y-1.5 p-4">
                    {logs.length === 0 && <div className="italic text-zinc-500">暂无日志...</div>}
                    {logs.map((log) => (
                      <div key={log.id} className="flex gap-2 break-all">
                        <span className="shrink-0 text-zinc-500">{log.timestamp}</span>
                        <span
                          className={cn(
                            "flex w-4 shrink-0 justify-center",
                            log.type === "success" && "text-green-400",
                            log.type === "error" && "text-red-400",
                            log.type === "info" && "text-blue-400"
                          )}
                        >
                          {log.type === "success" && "S"}
                          {log.type === "error" && "E"}
                          {log.type === "info" && "I"}
                        </span>
                        <span
                          className={cn(
                            log.type === "success" && "text-green-300",
                            log.type === "error" && "text-red-300",
                            log.type === "info" && "text-zinc-300"
                          )}
                        >
                          {log.message}
                        </span>
                      </div>
                    ))}
                  </div>
                </ScrollArea>
              </CardContent>
            </Card>
          </div>
        </div>
      </div>
    </div>
  );
}
