"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { toast } from "sonner";
import { KeyRound, Loader2 } from "lucide-react";

const AUTH_STORAGE_KEY = "autodl-authorization";
const LEGACY_TOKEN_STORAGE_KEY = "autodl-token";

export default function AuthorizationPage() {
  const [authorization, setAuthorization] = useState("");
  const [isSaving, setIsSaving] = useState(false);
  const router = useRouter();

  useEffect(() => {
    const savedAuthorization =
      localStorage.getItem(AUTH_STORAGE_KEY) ?? localStorage.getItem(LEGACY_TOKEN_STORAGE_KEY) ?? "";

    if (savedAuthorization) {
      localStorage.setItem(AUTH_STORAGE_KEY, savedAuthorization);
      localStorage.removeItem(LEGACY_TOKEN_STORAGE_KEY);
      setAuthorization(savedAuthorization);
    }
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    const trimmedAuthorization = authorization.trim();
    if (!trimmedAuthorization) {
      toast.error("请输入 Authorization");
      return;
    }

    setIsSaving(true);

    try {
      localStorage.setItem(AUTH_STORAGE_KEY, trimmedAuthorization);
      localStorage.removeItem(LEGACY_TOKEN_STORAGE_KEY);
      toast.success("Authorization 已保存", { description: "正在进入控制台..." });
      router.push("/dashboard");
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div className="relative flex min-h-screen items-center justify-center overflow-hidden bg-gray-50 p-4 dark:bg-gray-900">
      <div className="absolute inset-0 z-0">
        <div className="absolute inset-0 bg-[linear-gradient(to_right,#80808012_1px,transparent_1px),linear-gradient(to_bottom,#80808012_1px,transparent_1px)] bg-[size:24px_24px]" />
        <div className="absolute left-0 right-0 top-0 -z-10 m-auto h-[310px] w-[310px] rounded-full bg-primary/20 opacity-20 blur-[100px]" />
      </div>

      <Card className="z-10 w-full max-w-md border-primary/10 bg-card/90 shadow-2xl backdrop-blur-sm">
        <CardHeader className="space-y-1 text-center">
          <CardTitle className="text-2xl font-bold tracking-tight">AutoDL Monitor</CardTitle>
          <CardDescription>
            直接提供 AutoDL 的 Authorization，系统会在后续所有请求头中自动携带它。
          </CardDescription>
        </CardHeader>
        <form onSubmit={handleSubmit}>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Input
                type="password"
                placeholder="请输入 Authorization"
                value={authorization}
                onChange={(e) => setAuthorization(e.target.value)}
                required
                className="bg-background/50"
              />
              <p className="text-xs text-muted-foreground">
                不再执行登录换 token 流程，后续实例查询、集群切换、开机监控都直接复用这个 Authorization。
              </p>
            </div>
          </CardContent>
          <CardFooter>
            <Button className="w-full" type="submit" disabled={isSaving}>
              {isSaving ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  保存中...
                </>
              ) : (
                <>
                  <KeyRound className="mr-2 h-4 w-4" />
                  进入控制台
                </>
              )}
            </Button>
          </CardFooter>
        </form>
      </Card>

      <div className="absolute bottom-8 z-10 text-center animate-in fade-in slide-in-from-bottom-4 duration-1000">
        <p className="text-sm font-medium text-muted-foreground opacity-80">By luodeng(2438688528@qq.com)</p>
      </div>
    </div>
  );
}
