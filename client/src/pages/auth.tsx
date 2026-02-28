import { useState, useEffect } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { useAuth } from "@/hooks/use-auth";
import { downloadCredentials } from "@/lib/auth";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useToast } from "@/hooks/use-toast";
import { Loader2, X, LogIn, Map, BookOpen, Bot, TrendingUp, Shield, Settings2 } from "lucide-react";
import { Link, useLocation } from "wouter";

const loginFormSchema = z.object({
  username: z.string().min(1, "Username is required"),
  password: z.string().min(1, "Password is required"),
});

const registerFormSchema = z.object({
  username: z.string().min(3, "Min 3 characters").max(30).regex(/^[a-zA-Z0-9_]+$/, "Only letters, numbers, underscores"),
  password: z.string().min(8, "Min 8 characters"),
  confirmPassword: z.string().min(1, "Confirm your password"),
}).refine((d) => d.password === d.confirmPassword, {
  message: "Passwords don't match",
  path: ["confirmPassword"],
});

export function AuthPanel({ isOpen, onClose }: { isOpen: boolean; onClose: () => void }) {
  const { login, register: registerMutation } = useAuth();
  const { toast } = useToast();
  const [, setLocation] = useLocation();
  const [showCredWarning, setShowCredWarning] = useState(false);

  const loginForm = useForm<z.infer<typeof loginFormSchema>>({
    resolver: zodResolver(loginFormSchema),
    defaultValues: { username: "", password: "" },
  });

  const registerForm = useForm<z.infer<typeof registerFormSchema>>({
    resolver: zodResolver(registerFormSchema),
    defaultValues: { username: "", password: "", confirmPassword: "" },
  });

  useEffect(() => {
    if (isOpen) {
      document.body.style.overflow = "hidden";
    } else {
      document.body.style.overflow = "";
    }
    return () => { document.body.style.overflow = ""; };
  }, [isOpen]);

  const onLogin = (values: z.infer<typeof loginFormSchema>) => {
    login.mutate(values, {
      onSuccess: () => {
        onClose();
      },
      onError: (err) => {
        toast({ title: "Login failed", description: err.message, variant: "destructive" });
      },
    });
  };

  const onRegister = (values: z.infer<typeof registerFormSchema>) => {
    registerMutation.mutate(
      { username: values.username, password: values.password },
      {
        onSuccess: () => {
          downloadCredentials(values.username, values.password);
          setShowCredWarning(true);
          toast({ title: "Account created", description: "Credentials file downloaded." });
          setTimeout(() => {
            onClose();
            setLocation("/dashboard");
          }, 2000);
        },
        onError: (err) => {
          toast({ title: "Registration failed", description: err.message, variant: "destructive" });
        },
      }
    );
  };

  return (
    <>
      <div
        className={`fixed inset-0 z-[60] bg-black/60 backdrop-blur-sm transition-opacity duration-300 ${isOpen ? "opacity-100 pointer-events-auto" : "opacity-0 pointer-events-none"}`}
        onClick={onClose}
        data-testid="auth-backdrop"
      />

      <div
        className={`fixed z-[70] transition-transform duration-300 ease-out
          right-0 top-0 bottom-0 w-full sm:w-[400px]
          ${isOpen ? "translate-x-0" : "translate-x-full"}`}
        data-testid="auth-panel"
      >
        <div className="h-full flex flex-col border-l border-white/[0.06]" style={{ backgroundColor: "#0a0a0a" }}>
          <div className="flex items-center justify-between p-5 border-b border-white/[0.06]">
            <div>
              <h2 className="text-lg font-semibold text-white">Welcome</h2>
              <p className="text-xs text-white/30 mt-0.5">Sign in or create an account</p>
            </div>
            <Button
              variant="ghost"
              size="icon"
              onClick={onClose}
              className="w-8 h-8 text-white/40 hover:text-white"
              data-testid="button-close-auth"
            >
              <X className="w-4 h-4" />
            </Button>
          </div>

          <div className="flex-1 overflow-y-auto p-5">
            {showCredWarning && (
              <div className="mb-4 p-3 rounded-lg border border-green-500/30 bg-green-500/10" data-testid="status-cred-warning">
                <p className="text-sm text-green-400">
                  Credentials file downloaded. Save it somewhere safe! Redirecting...
                </p>
              </div>
            )}

            <Tabs defaultValue="login" className="w-full">
              <TabsList className="grid w-full grid-cols-2 bg-white/[0.04] h-10">
                <TabsTrigger value="login" className="text-sm" data-testid="tab-login">Login</TabsTrigger>
                <TabsTrigger value="register" className="text-sm" data-testid="tab-register">Register</TabsTrigger>
              </TabsList>

              <TabsContent value="login" className="mt-5">
                <form onSubmit={loginForm.handleSubmit(onLogin)} className="space-y-4">
                  <div className="space-y-1.5">
                    <Label htmlFor="login-username" className="text-xs text-white/30 uppercase tracking-wider">Username</Label>
                    <Input
                      id="login-username"
                      data-testid="input-login-username"
                      placeholder="Enter username"
                      {...loginForm.register("username")}
                      className="h-10 bg-white/[0.04] border-white/[0.08] focus:border-white/20 focus:ring-white/10 transition-colors"
                    />
                    {loginForm.formState.errors.username && (
                      <p className="text-xs text-destructive">{loginForm.formState.errors.username.message}</p>
                    )}
                  </div>
                  <div className="space-y-1.5">
                    <Label htmlFor="login-password" className="text-xs text-white/30 uppercase tracking-wider">Password</Label>
                    <Input
                      id="login-password"
                      data-testid="input-login-password"
                      type="password"
                      placeholder="Enter password"
                      {...loginForm.register("password")}
                      className="h-10 bg-white/[0.04] border-white/[0.08] focus:border-white/20 focus:ring-white/10 transition-colors"
                    />
                    {loginForm.formState.errors.password && (
                      <p className="text-xs text-destructive">{loginForm.formState.errors.password.message}</p>
                    )}
                  </div>
                  <Button
                    type="submit"
                    className="w-full h-10 bg-white text-black font-medium hover:bg-white/90 transition-all"
                    disabled={login.isPending}
                    data-testid="button-login"
                  >
                    {login.isPending ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : null}
                    Sign In
                  </Button>
                </form>
              </TabsContent>

              <TabsContent value="register" className="mt-5">
                <form onSubmit={registerForm.handleSubmit(onRegister)} className="space-y-4">
                  <div className="space-y-1.5">
                    <Label htmlFor="reg-username" className="text-xs text-white/30 uppercase tracking-wider">Username</Label>
                    <Input
                      id="reg-username"
                      data-testid="input-register-username"
                      placeholder="Choose username"
                      {...registerForm.register("username")}
                      className="h-10 bg-white/[0.04] border-white/[0.08] focus:border-white/20 focus:ring-white/10 transition-colors"
                    />
                    {registerForm.formState.errors.username && (
                      <p className="text-xs text-destructive">{registerForm.formState.errors.username.message}</p>
                    )}
                  </div>
                  <div className="space-y-1.5">
                    <Label htmlFor="reg-password" className="text-xs text-white/30 uppercase tracking-wider">Password</Label>
                    <Input
                      id="reg-password"
                      data-testid="input-register-password"
                      type="password"
                      placeholder="Min 8 characters"
                      {...registerForm.register("password")}
                      className="h-10 bg-white/[0.04] border-white/[0.08] focus:border-white/20 focus:ring-white/10 transition-colors"
                    />
                    {registerForm.formState.errors.password && (
                      <p className="text-xs text-destructive">{registerForm.formState.errors.password.message}</p>
                    )}
                  </div>
                  <div className="space-y-1.5">
                    <Label htmlFor="reg-confirm" className="text-xs text-white/30 uppercase tracking-wider">Confirm Password</Label>
                    <Input
                      id="reg-confirm"
                      data-testid="input-register-confirm"
                      type="password"
                      placeholder="Confirm password"
                      {...registerForm.register("confirmPassword")}
                      className="h-10 bg-white/[0.04] border-white/[0.08] focus:border-white/20 focus:ring-white/10 transition-colors"
                    />
                    {registerForm.formState.errors.confirmPassword && (
                      <p className="text-xs text-destructive">{registerForm.formState.errors.confirmPassword.message}</p>
                    )}
                  </div>
                  <Button
                    type="submit"
                    className="w-full h-10 bg-white text-black font-medium hover:bg-white/90 transition-all"
                    disabled={registerMutation.isPending}
                    data-testid="button-register"
                  >
                    {registerMutation.isPending ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : null}
                    Create Account
                  </Button>

                  <p className="text-[10px] text-white/20 text-center leading-relaxed mt-3">
                    No email required. A credentials file downloads automatically. Keep it safe — there is no password recovery.
                  </p>
                </form>
              </TabsContent>
            </Tabs>

            <div className="mt-6 pt-5 border-t border-white/[0.06]">
              <p className="text-[10px] text-white/20 uppercase tracking-widest mb-3">Explore</p>
              <div className="grid grid-cols-3 gap-2">
                {[
                  { path: "/guide", label: "Guide", icon: Map },
                  { path: "/docs/overview", label: "Overview", icon: BookOpen },
                  { path: "/docs/ai", label: "AI", icon: Bot },
                  { path: "/docs/trading", label: "Trading", icon: TrendingUp },
                  { path: "/docs/security", label: "Security", icon: Shield },
                  { path: "/docs/architecture", label: "Architecture", icon: Settings2 },
                ].map((item) => (
                  <Link key={item.path} href={item.path}>
                    <div
                      className="flex flex-col items-center justify-center gap-1.5 p-3 rounded-lg border border-white/[0.06] bg-white/[0.02] hover:border-white/[0.12] hover:bg-white/[0.04] transition-all duration-200 cursor-pointer"
                      data-testid={`app-icon-${item.path.split("/").pop()}`}
                    >
                      <item.icon className="w-5 h-5 text-white/30" />
                      <span className="text-[10px] text-white/25">{item.label}</span>
                    </div>
                  </Link>
                ))}
              </div>
            </div>
          </div>

          <div className="p-4 border-t border-white/[0.06]">
            <p className="text-[10px] text-white/15 text-center">colonyx — The 𝕏 AI Agents Civilization</p>
          </div>
        </div>
      </div>
    </>
  );
}

export function AuthButton({ onClick }: { onClick: () => void }) {
  return (
    <Button
      onClick={onClick}
      variant="ghost"
      className="h-5 sm:h-8 px-1.5 sm:px-3 text-[9px] sm:text-xs gap-1 sm:gap-1.5 rounded bg-white/[0.06] hover:bg-white/10 text-white/50 hover:text-white/80 border border-white/[0.08] font-medium"
      data-testid="button-open-auth"
    >
      <LogIn className="w-2.5 h-2.5 sm:w-3.5 sm:h-3.5" />
      Sign In
    </Button>
  );
}

export default function AuthPage() {
  return null;
}
