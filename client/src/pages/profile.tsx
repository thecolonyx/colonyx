import { useState } from "react";
import { useMutation } from "@tanstack/react-query";
import { apiRequest, downloadCredentials } from "@/lib/auth";
import { AppLayout, QuickNav } from "@/components/layout";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/hooks/use-auth";
import { Loader2, AlertTriangle, Trash2, User, Shield, KeyRound, Lock, FileDown, ShieldCheck, Key, Fingerprint } from "lucide-react";

export default function ProfilePage() {
  const { user, logout } = useAuth();
  const { toast } = useToast();

  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [deleteConfirmUsername, setDeleteConfirmUsername] = useState("");
  const [deletePassword, setDeletePassword] = useState("");

  const changePasswordMutation = useMutation({
    mutationFn: async () => {
      await apiRequest("PUT", "/api/auth/password", {
        currentPassword,
        newPassword,
      });
    },
    onSuccess: () => {
      downloadCredentials(user?.username || "", newPassword);
      toast({
        title: "Password updated",
        description: "New credentials file downloaded. Old file is now invalid.",
      });
      setCurrentPassword("");
      setNewPassword("");
      setConfirmPassword("");
    },
    onError: (err) => {
      toast({ title: "Error", description: err.message, variant: "destructive" });
    },
  });

  const deleteAccountMutation = useMutation({
    mutationFn: async () => {
      await apiRequest("DELETE", "/api/auth/account", {
        password: deletePassword,
      });
    },
    onSuccess: () => {
      logout();
      toast({ title: "Account deleted" });
    },
    onError: (err) => {
      toast({ title: "Error", description: err.message, variant: "destructive" });
    },
  });

  const handleChangePassword = () => {
    if (newPassword !== confirmPassword) {
      toast({ title: "Error", description: "Passwords don't match", variant: "destructive" });
      return;
    }
    if (newPassword.length < 8) {
      toast({ title: "Error", description: "Password must be at least 8 characters", variant: "destructive" });
      return;
    }
    changePasswordMutation.mutate();
  };

  return (
    <AppLayout>
      <div className="relative">
        <div
          className="absolute inset-0 opacity-[0.015] pointer-events-none"
          style={{
            backgroundImage: "radial-gradient(circle at 1px 1px, currentColor 1px, transparent 0)",
            backgroundSize: "40px 40px",
          }}
        />
      <div className="relative max-w-2xl lg:max-w-6xl mx-auto px-4 sm:px-6 py-6 lg:py-16">
        <div className="flex items-center justify-between gap-4 mb-8 lg:mb-12">
          <div>
            <h1 className="text-2xl lg:text-4xl font-bold" data-testid="text-profile-title">Profile</h1>
            <p className="text-sm lg:text-base text-muted-foreground mt-1.5">Account and security</p>
          </div>
          <div className="md:hidden"><QuickNav /></div>
        </div>

        <div className="space-y-6 lg:space-y-8">
          <Card className="border-border/50 overflow-hidden">
            <div className="h-0.5 bg-white/[0.06]" />
            <CardContent className="p-6 lg:p-10">
              <div className="flex items-center gap-5 lg:gap-8 flex-col lg:flex-row lg:items-start">
                <div className="relative">
                  <div className="w-16 h-16 lg:w-28 lg:h-28 rounded-full bg-white/[0.06] border border-white/[0.08] flex items-center justify-center shrink-0">
                    <User className="w-7 h-7 lg:w-12 lg:h-12 text-white/40" />
                  </div>
                  <div className="absolute bottom-0 right-0 w-4 h-4 lg:w-6 lg:h-6 rounded-full bg-green-500 border-2 border-background" />
                </div>
                <div className="text-center lg:text-left flex-1">
                  <p className="text-xs text-muted-foreground mb-1">Username</p>
                  <p className="font-semibold text-xl lg:text-3xl" data-testid="text-profile-username">{user?.username}</p>
                  <p className="text-xs lg:text-sm text-muted-foreground mt-1.5">Signed up with credentials file</p>
                  <div className="hidden lg:flex items-center gap-5 mt-5 flex-wrap">
                    <div className="flex items-center gap-2 text-sm text-muted-foreground">
                      <ShieldCheck className="w-4 h-4 text-green-500/70" />
                      <span>Authenticated</span>
                    </div>
                    <div className="flex items-center gap-2 text-sm text-muted-foreground">
                      <Key className="w-4 h-4 text-white/30" />
                      <span>Credentials file login</span>
                    </div>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className="border-border/50 overflow-hidden">
            <div className="h-0.5 bg-white/[0.06]" />
            <CardContent className="p-6 lg:p-10 space-y-6 lg:space-y-8">
              <div className="flex items-center gap-4 lg:gap-5">
                <div className="w-12 h-12 lg:w-14 lg:h-14 rounded-lg bg-white/[0.06] flex items-center justify-center shrink-0">
                  <KeyRound className="w-6 h-6 lg:w-7 lg:h-7 text-white/40" />
                </div>
                <div>
                  <h3 className="font-semibold text-lg lg:text-2xl">Change Password</h3>
                  <p className="text-xs lg:text-sm text-muted-foreground">Change your password. A new credentials file downloads automatically.</p>
                </div>
              </div>
              <div className="space-y-5 lg:space-y-6">
                <div className="space-y-2">
                  <Label className="text-sm font-medium">Current Password</Label>
                  <Input
                    type="password"
                    value={currentPassword}
                    onChange={(e) => setCurrentPassword(e.target.value)}
                    className="bg-muted/30 border-border/50 h-11"
                    data-testid="input-current-password"
                  />
                </div>
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-5 lg:gap-6">
                  <div className="space-y-2">
                    <Label className="text-sm font-medium">New Password</Label>
                    <Input
                      type="password"
                      value={newPassword}
                      onChange={(e) => setNewPassword(e.target.value)}
                      placeholder="Min 8 characters"
                      className="bg-muted/30 border-border/50 h-11"
                      data-testid="input-new-password"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label className="text-sm font-medium">Confirm Password</Label>
                    <Input
                      type="password"
                      value={confirmPassword}
                      onChange={(e) => setConfirmPassword(e.target.value)}
                      className="bg-muted/30 border-border/50 h-11"
                      data-testid="input-confirm-new-password"
                    />
                  </div>
                </div>
              </div>
              <div className="p-4 rounded-lg border border-white/[0.08] bg-white/[0.03] flex items-start gap-3">
                <FileDown className="w-5 h-5 text-white/50 shrink-0 mt-0.5" />
                <div>
                  <p className="text-sm font-medium text-white/50 mb-0.5">Credentials File</p>
                  <p className="text-xs text-muted-foreground leading-relaxed">
                    When you update your password, a new credentials file downloads and the old one stops working immediately.
                  </p>
                </div>
              </div>
              <Button
                size="lg"
                className="bg-white text-black font-semibold"
                onClick={handleChangePassword}
                disabled={!currentPassword || !newPassword || !confirmPassword || changePasswordMutation.isPending}
                data-testid="button-update-password"
              >
                {changePasswordMutation.isPending ? <Loader2 className="w-4 h-4 animate-spin mr-1.5" /> : <Lock className="w-4 h-4 mr-1.5" />}
                Update Password
              </Button>
            </CardContent>
          </Card>

          <Card className="border-border/50 overflow-hidden">
            <div className="h-1 bg-gradient-to-r from-green-500 to-green-400" />
            <CardContent className="p-6 lg:p-10">
              <div className="flex items-center gap-4 lg:gap-5 mb-5 lg:mb-8">
                <div className="w-12 h-12 lg:w-14 lg:h-14 rounded-lg bg-green-500/10 flex items-center justify-center shrink-0">
                  <ShieldCheck className="w-6 h-6 lg:w-7 lg:h-7 text-green-500" />
                </div>
                <div>
                  <h3 className="font-semibold text-lg lg:text-2xl">Security</h3>
                  <p className="text-xs lg:text-sm text-muted-foreground">How your account is protected</p>
                </div>
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 lg:gap-5 mt-4" data-testid="security-features">
                {[
                  { icon: Lock, label: "AES-256 Encryption", desc: "End to end data encryption" },
                  { icon: Fingerprint, label: "bcrypt Hashing", desc: "One-way password security" },
                  { icon: Key, label: "JWT Sessions", desc: "Stateless authentication" },
                ].map((item) => (
                  <div key={item.label} className="flex items-center gap-3 lg:gap-4 p-4 lg:p-5 rounded-lg border border-border/30 bg-muted/10">
                    <div className="w-9 h-9 rounded-lg bg-green-500/10 flex items-center justify-center shrink-0">
                      <item.icon className="w-4 h-4 text-green-500" />
                    </div>
                    <div>
                      <p className="text-sm font-medium">{item.label}</p>
                      <p className="text-xs text-muted-foreground mt-0.5">{item.desc}</p>
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>

          <Card className="border-destructive/40 bg-destructive/5 lg:bg-destructive/[0.08] lg:max-w-4xl">
            <CardContent className="p-6 lg:p-10">
              <div className="flex items-center gap-4 lg:gap-5 mb-6 lg:mb-8">
                <div className="w-12 h-12 lg:w-14 lg:h-14 rounded-lg bg-destructive/15 flex items-center justify-center shrink-0">
                  <AlertTriangle className="w-6 h-6 lg:w-7 lg:h-7 text-destructive" />
                </div>
                <div>
                  <h3 className="font-semibold text-lg lg:text-2xl text-destructive">Danger Zone</h3>
                  <p className="text-xs lg:text-sm text-muted-foreground">Permanent actions. No undo.</p>
                </div>
              </div>
              <p className="text-sm lg:text-base text-muted-foreground mb-6 lg:mb-8 max-w-2xl leading-relaxed">
                This deletes your account, your agent, wallet, trade history, and everything else. Any SOL left in the wallet is gone forever. There is no way to reverse this.
              </p>
              <Button variant="destructive" size="lg" onClick={() => setShowDeleteModal(true)} data-testid="button-delete-account">
                <Trash2 className="w-4 h-4 mr-1.5" /> Delete Account
              </Button>
            </CardContent>
          </Card>
        </div>
      </div>
      </div>

      <Dialog open={showDeleteModal} onOpenChange={setShowDeleteModal}>
        <DialogContent className="bg-card border-border/50">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <AlertTriangle className="w-5 h-5 text-destructive" />
              Delete Account
            </DialogTitle>
          </DialogHeader>
          <p className="text-sm text-muted-foreground">
            This will permanently delete your account and ALL bots, wallets, and trading data. This action cannot be undone.
          </p>
          <div className="space-y-3">
            <div className="space-y-2">
              <Label>Type "{user?.username}" to confirm</Label>
              <Input
                value={deleteConfirmUsername}
                onChange={(e) => setDeleteConfirmUsername(e.target.value)}
                className="bg-muted/30 border-border/50"
                data-testid="input-delete-account-confirm"
              />
            </div>
            <div className="space-y-2">
              <Label>Password</Label>
              <Input
                type="password"
                value={deletePassword}
                onChange={(e) => setDeletePassword(e.target.value)}
                className="bg-muted/30 border-border/50"
                data-testid="input-delete-account-password"
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="secondary" onClick={() => setShowDeleteModal(false)}>Cancel</Button>
            <Button
              variant="destructive"
              onClick={() => deleteAccountMutation.mutate()}
              disabled={deleteConfirmUsername !== user?.username || !deletePassword || deleteAccountMutation.isPending}
              data-testid="button-confirm-delete-account"
            >
              {deleteAccountMutation.isPending ? <Loader2 className="w-4 h-4 animate-spin mr-1" /> : null}
              Delete Account
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </AppLayout>
  );
}
