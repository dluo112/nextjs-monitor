"use client";

import { useState, useEffect, useRef, useCallback } from "react";
import { useRouter } from "next/navigation";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Checkbox } from "@/components/ui/checkbox";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Separator } from "@/components/ui/separator";
import { toast } from "sonner";
import { 
  Play, Square, RefreshCcw, Mail, Cpu, Server, 
  CheckCircle2, XCircle, AlertTriangle, Trash2, LogOut, Terminal 
} from "lucide-react";
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

export default function DashboardPage() {
  const router = useRouter();
  
  // Data State
  const [instances, setInstances] = useState<Instance[]>([]);
  const [selectedUuids, setSelectedUuids] = useState<Set<string>>(new Set());
  const [isLoadingInstances, setIsLoadingInstances] = useState(false);
  const [userInfo, setUserInfo] = useState<UserInfo | null>(null);
  const [tenants, setTenants] = useState<Tenant[]>([]);
  const [isSwitchingTenant, setIsSwitchingTenant] = useState(false);
  
  // Monitor State
  const [isMonitoring, setIsMonitoring] = useState(false);
  const [intervalSeconds, setIntervalSeconds] = useState(30);
  const [logs, setLogs] = useState<LogEntry[]>([]);
  const monitorTimerRef = useRef<NodeJS.Timeout | null>(null);
  
  // Email State
  const [emailEnabled, setEmailEnabled] = useState(false);
  const [emailAddress, setEmailAddress] = useState("");

  // UI State
  const scrollRef = useRef<HTMLDivElement>(null);
  const [autoScroll, setAutoScroll] = useState(true);

  const isRunningStatus = (s: string) => {
    if (!s) return false;
    const t = s.toLowerCase();
    return s === "正在运行" || s === "运行中" || t === "running";
  };

  // Load instances on mount
  useEffect(() => {
    fetchUserInfo();
    fetchInstances();
    fetchTenants();
  }, []);

  // Auto-scroll logs
  useEffect(() => {
    if (autoScroll && scrollRef.current) {
      const scrollElement = scrollRef.current.querySelector('[data-radix-scroll-area-viewport]');
      if (scrollElement) {
        scrollElement.scrollTop = scrollElement.scrollHeight;
      }
    }
  }, [logs, autoScroll]);

  // Clean up timer on unmount
  useEffect(() => {
    return () => stopMonitor();
  }, []);

  const addLog = (type: LogEntry["type"], message: string) => {
    const now = new Date();
    const timestamp = `[${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')} ${String(now.getHours()).padStart(2, '0')}:${String(now.getMinutes()).padStart(2, '0')}:${String(now.getSeconds()).padStart(2, '0')}]`;
    
    // Mask sensitive tokens if present
    let safeMessage = message;
    if (message.includes("ticket") || message.includes("token")) {
       // Simple heuristic masking
       safeMessage = message.replace(/(ticket|token)["']?\s*[:=]\s*["']?([a-zA-Z0-9]{10})[a-zA-Z0-9]+["']?/gi, '$1 $2...');
    }

    setLogs(prev => {
      const newLogs = [...prev, { id: Math.random().toString(36).substr(2, 9), timestamp, type, message: safeMessage }];
      if (newLogs.length > 500) return newLogs.slice(newLogs.length - 500);
      return newLogs;
    });
  };

  const fetchUserInfo = async () => {
    try {
      const token = localStorage.getItem("autodl-token");
      if (!token) return;

      const res = await fetch("/api/autodl/user", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "Authorization": token
        },
        body: JSON.stringify({})
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
      const token = localStorage.getItem("autodl-token");
      if (!token) return;

      const res = await fetch("/api/autodl/tenant/list", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "Authorization": token
        },
        body: JSON.stringify({})
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
      const token = localStorage.getItem("autodl-token");
      if (!token) return;

      const res = await fetch("/api/autodl/tenant/switch", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "Authorization": token
        },
        body: JSON.stringify({ tenant_uuid })
      });

      const data = await res.json();
      if (data.code === "Success" && data.data?.token) {
        localStorage.setItem("autodl-token", data.data.token);
        toast.success("切换集群成功");
        
        // Reload all data with new token
        setInstances([]);
        setSelectedUuids(new Set());
        fetchUserInfo();
        fetchInstances();
        // Tenants list usually stays same, but good to refresh just in case
        fetchTenants(); 
      } else {
        toast.error("切换集群失败", { description: data.msg });
      }
    } catch (error) {
      console.error("Switch tenant error:", error);
      toast.error("切换集群网络请求失败");
    } finally {
      setIsSwitchingTenant(false);
    }
  };

  const fetchInstances = async () => {
    setIsLoadingInstances(true);
    try {
      const token = localStorage.getItem("autodl-token");
      if (!token) {
        router.push("/");
        return;
      }

      const res = await fetch("/api/autodl/instances", { 
        method: "POST",
        headers: { 
          "Content-Type": "application/json",
          "Authorization": token 
        },
        body: JSON.stringify({})
      });
      const data = await res.json();
      
      if (data.code === "Success") {
        // Adapt data if necessary based on real API response
        // Assuming data.data.list is the array
        const list = data.data.list || [];
        setInstances(list);
        toast.success("实例列表已更新");
      } else if (data.code === "Error" && data.msg === "Unauthorized") {
        toast.error("登录已过期，请重新登录");
        router.push("/");
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

  const handleLogout = async () => {
    localStorage.removeItem("autodl-token");
    await fetch("/api/auth/logout", { method: "POST" });
    router.push("/");
  };

  const toggleSelection = (uuid: string) => {
    const newSet = new Set(selectedUuids);
    if (newSet.has(uuid)) {
      newSet.delete(uuid);
    } else {
      newSet.add(uuid);
    }
    setSelectedUuids(newSet);
  };

  const selectAll = () => {
    const selectable = instances.filter(i => !isRunningStatus(i.status)).map(i => i.instance_uuid);
    if (selectedUuids.size === selectable.length && selectable.length > 0) {
      setSelectedUuids(new Set());
    } else {
      setSelectedUuids(new Set(selectable));
    }
  };

  // --- Monitoring Logic ---

  const getTargetMappings = () => {
    const selectedList = instances.filter(i => selectedUuids.has(i.instance_uuid));
    const targetMachines = Array.from(new Set(selectedList.map(i => i.machine_name)));
    const machinesUid: Record<string, string[]> = {};
    
    selectedList.forEach(i => {
      if (!machinesUid[i.machine_name]) {
        machinesUid[i.machine_name] = [];
      }
      machinesUid[i.machine_name].push(i.instance_uuid);
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
      toast.error("监控间隔不能小于10秒");
      return;
    }

    setIsMonitoring(true);
    addLog("info", "开始监控...");
    toast.info("监控已启动");
    
    // Run immediately
    runMonitorStep();
    
    // Set interval
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
      const token = localStorage.getItem("autodl-token");
      if (!token) {
        stopMonitor();
        router.push("/");
        return;
      }

      // 1. Fetch Machine List
      const res = await fetch("/api/autodl/machines", { 
        method: "POST",
        headers: { 
          "Content-Type": "application/json",
          "Authorization": token 
        },
        body: JSON.stringify({})
      });
      const data = await res.json();
      
      if (data.code !== "Success") {
        addLog("error", `获取机器列表失败: ${data.msg}`);
        // If unauthorized, stop monitor
        if (data.msg === "Unauthorized") {
          stopMonitor();
          router.push("/");
        }
        return;
      }

      const allMachines: MachineStatus[] = data.data.list || [];
      
      // 2. Filter Targets
      const targetMachineStatus = allMachines.filter(m => targetMachines.includes(m.machine_name));
      
      let foundAvailable = false;

      // 3. Check Each Machine
      for (const m of targetMachineStatus) {
        const gpuIdle = m.gpu?.idle || 0;
        const isRunning = m.is_running;
        
        if (gpuIdle > 0 && !isRunning) {
          addLog("success", `发现可用机器: ${m.machine_name} (空闲GPU: ${gpuIdle})`);
          foundAvailable = true;
          
          // 4. Try to start instances on this machine
          const uuidsToTry = machinesUid[m.machine_name] || [];
          
          for (const uuid of uuidsToTry) {
             addLog("info", `尝试启动实例: ${uuid} ...`);
             
             try {
              const startRes = await fetch("/api/autodl/power-on", {
                method: "POST",
                headers: { 
                  "Content-Type": "application/json",
                  "Authorization": token 
                },
                body: JSON.stringify({ instance_uuid: uuid })
              });
               
               const startData = await startRes.json();
               
               if (startData.code === "Success") {
                 addLog("success", `启动成功! 实例: ${uuid}`);
                 toast.success(`实例启动成功: ${m.machine_name}`);
                 
                 // Send Email
                 if (emailEnabled && emailAddress) {
                   addLog("info", "正在发送邮件通知...");
                   fetch("/api/notify/email", {
                     method: "POST",
                     headers: { "Content-Type": "application/json" },
                     body: JSON.stringify({ 
                       machine_name: m.machine_name, 
                       instance_uuid: uuid, 
                       to: emailAddress 
                     })
                   }).then(() => addLog("success", "邮件发送请求已提交"))
                     .catch(() => addLog("error", "邮件发送请求失败"));
                 }

                 // Stop Monitoring on Success
                 stopMonitor();
                 return; // Exit loop completely
               } else {
                 addLog("error", `启动失败: ${startData.msg}`);
               }
             } catch (err) {
               addLog("error", `启动请求异常: ${err}`);
             }
          }
        }
      }
      
      if (!foundAvailable) {
        addLog("info", "本轮未发现可用机器，等待下一轮...");
      }

    } catch (error) {
      addLog("error", `监控过程发生异常: ${error}`);
    }
  };

  // Derived UI Data
  const { selectedList, targetMachines } = getTargetMappings();

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900 p-4 lg:p-8 flex flex-col gap-6">
      
      {/* Header */}
      <div className="flex justify-between items-center bg-card p-4 rounded-xl shadow-sm border">
        <div className="flex items-center gap-2">
          <div className="p-2 bg-primary/10 rounded-lg">
            <Cpu className="w-6 h-6 text-primary" />
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
               {tenants.map((t) => (
                 <option key={t.tenant_uuid} value={t.tenant_uuid}>
                   {t.tenant_name} ({t.role === 'admin' ? '管' : '员'})
                 </option>
               ))}
             </select>
          </div>
        )}

        <div className="flex flex-col items-end mr-4">
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
             {isMonitoring ? <span className="flex items-center gap-1"><RefreshCcw className="w-3 h-3 animate-spin" /> 监控运行中</span> : "已停止"}
           </Badge>
           <Button variant="ghost" size="icon" onClick={handleLogout} title="退出登录">
             <LogOut className="w-5 h-5" />
           </Button>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 h-full flex-1">
        
        {/* Left Column: Instance List */}
        <Card className="lg:col-span-5 flex flex-col h-[600px] lg:h-auto shadow-md">
          <CardHeader className="pb-3">
            <div className="flex justify-between items-center">
              <CardTitle className="text-lg flex items-center gap-2">
                <Server className="w-5 h-5" /> 实例列表
              </CardTitle>
              <Button variant="outline" size="sm" onClick={fetchInstances} disabled={isLoadingInstances || isMonitoring}>
                <RefreshCcw className={cn("w-4 h-4 mr-1", isLoadingInstances && "animate-spin")} /> 刷新
              </Button>
            </div>
            <CardDescription>
              选择需要监控的实例 ({selectedUuids.size} 已选 / {instances.length} 总计)
            </CardDescription>
          </CardHeader>
          <Separator />
          <div className="p-3 bg-muted/30 flex justify-between items-center">
             <div className="flex items-center gap-2">
                <Checkbox 
                  checked={instances.filter(i => !isRunningStatus(i.status)).length > 0 && selectedUuids.size === instances.filter(i => !isRunningStatus(i.status)).length} 
                  onChange={() => selectAll()}
                  disabled={isMonitoring}
                />
                <span className="text-sm text-muted-foreground">全选 / 反选</span>
             </div>
             <span className="text-xs text-muted-foreground">
               涉及机器: {targetMachines.length} 台
             </span>
          </div>
          <CardContent className="flex-1 p-0 overflow-hidden">
            <ScrollArea className="h-full">
              <div className="p-4 space-y-3">
                {instances.length === 0 ? (
                  <div className="text-center py-10 text-muted-foreground">
                    {isLoadingInstances ? "加载中..." : "暂无实例数据"}
                  </div>
                ) : (
                  instances.map((instance) => (
                    <div 
                      key={instance.instance_uuid} 
                      className={cn(
                        "flex items-start gap-3 p-3 rounded-lg border transition-all hover:bg-accent/50 cursor-pointer",
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
                        <div className="flex justify-between items-start">
                          <span className="font-medium text-sm">{instance.machine_name}</span>
                          <Badge variant={instance.status === "正在运行" ? "success" : "secondary"} className="text-[10px] px-1.5 h-5">
                            {instance.status}
                          </Badge>
                        </div>
                        <div className="text-xs text-muted-foreground">
                          {instance.gpu_name} x {instance.req_gpu_amount || 1}
                        </div>
                        <div className="text-[10px] text-muted-foreground/60 font-mono truncate max-w-[200px]" title={instance.instance_uuid}>
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

        {/* Right Column: Controls & Logs */}
        <div className="lg:col-span-7 flex flex-col gap-6 h-full">
          
          {/* Control Panel */}
          <Card className="shadow-md">
            <CardHeader className="pb-3">
              <CardTitle className="text-lg flex items-center gap-2">
                <Terminal className="w-5 h-5" /> 监控配置
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-6">
              
              {/* Interval & Actions */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="space-y-3">
                  <label className="text-sm font-medium">监控间隔 (秒)</label>
                  <div className="flex items-center gap-3">
                    <Input 
                      type="number" 
                      min={10} 
                      value={intervalSeconds} 
                      onChange={(e) => setIntervalSeconds(parseInt(e.target.value) || 30)}
                      disabled={isMonitoring}
                    />
                    <span className="text-xs text-muted-foreground whitespace-nowrap">最小 10s</span>
                  </div>
                </div>
                
                <div className="flex items-end gap-3">
                  {!isMonitoring ? (
                    <Button className="w-full" onClick={startMonitor} disabled={selectedUuids.size === 0}>
                      <Play className="w-4 h-4 mr-2" /> 开始监控
                    </Button>
                  ) : (
                    <Button variant="destructive" className="w-full" onClick={stopMonitor}>
                      <Square className="w-4 h-4 mr-2" /> 停止监控
                    </Button>
                  )}
                </div>
              </div>

              <Separator />

              {/* Email Notification */}
              <div className="space-y-3">
                <div className="flex items-center gap-2">
                  <Checkbox 
                    id="email-notify" 
                    checked={emailEnabled} 
                    onChange={(e) => setEmailEnabled(e.currentTarget.checked)}
                    disabled={isMonitoring}
                  />
                  <label htmlFor="email-notify" className="text-sm font-medium flex items-center gap-1 cursor-pointer">
                    <Mail className="w-4 h-4" /> 启用邮件通知
                  </label>
                </div>
                {emailEnabled && (
                  <Input 
                    placeholder="接收通知的邮箱地址 (QQ邮箱推荐)" 
                    value={emailAddress} 
                    onChange={(e) => setEmailAddress(e.target.value)}
                    disabled={isMonitoring}
                  />
                )}
              </div>

            </CardContent>
          </Card>

          {/* Log Panel */}
          <Card className="flex-1 flex flex-col shadow-md min-h-[400px]">
             <CardHeader className="pb-2 py-4">
                <div className="flex justify-between items-center">
                  <CardTitle className="text-base font-medium">运行日志</CardTitle>
                  <div className="flex items-center gap-2">
                    <div className="flex items-center gap-1.5 mr-2">
                      <Checkbox 
                        id="auto-scroll" 
                        checked={autoScroll} 
                        onChange={(e) => setAutoScroll(e.currentTarget.checked)} 
                      />
                      <label htmlFor="auto-scroll" className="text-xs cursor-pointer text-muted-foreground">自动滚动</label>
                    </div>
                    <Button variant="ghost" size="sm" onClick={() => setLogs([])} className="h-8 w-8 p-0">
                      <Trash2 className="w-4 h-4 text-muted-foreground" />
                    </Button>
                  </div>
                </div>
             </CardHeader>
             <Separator />
             <CardContent className="flex-1 p-0 bg-zinc-950 text-zinc-50 font-mono text-xs overflow-hidden relative rounded-b-xl">
               <ScrollArea className="h-full w-full" ref={scrollRef}>
                 <div className="p-4 space-y-1.5">
                   {logs.length === 0 && (
                     <div className="text-zinc-500 italic">暂无日志...</div>
                   )}
                   {logs.map((log) => (
                     <div key={log.id} className="flex gap-2 break-all">
                       <span className="text-zinc-500 shrink-0">{log.timestamp}</span>
                       <span className={cn(
                         "shrink-0 w-4 flex justify-center",
                         log.type === "success" && "text-green-400",
                         log.type === "error" && "text-red-400",
                         log.type === "info" && "text-blue-400"
                       )}>
                         {log.type === "success" && "✓"}
                         {log.type === "error" && "✗"}
                         {log.type === "info" && "ℹ"}
                       </span>
                       <span className={cn(
                         log.type === "success" && "text-green-300",
                         log.type === "error" && "text-red-300",
                         log.type === "info" && "text-zinc-300"
                       )}>
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
  );
}
