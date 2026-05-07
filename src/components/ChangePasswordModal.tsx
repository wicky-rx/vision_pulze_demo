import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { Eye, EyeOff, Lock, ShieldCheck, KeyRound } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useToast } from "@/components/ui/use-toast";
import { API_BASE_URL } from "@/config";

interface ChangePasswordModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}


export function ChangePasswordModal({ open, onOpenChange }: ChangePasswordModalProps) {
  const navigate = useNavigate();
  const { toast } = useToast();

  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");

  const [showCurrent, setShowCurrent] = useState(false);
  const [showNew, setShowNew] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);

  const [isLoading, setIsLoading] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});


  const validate = () => {
    const errs: Record<string, string> = {};
    if (!currentPassword) errs.currentPassword = "Current password is required.";
    if (!newPassword) errs.newPassword = "New password is required.";
    else if (newPassword.length < 8) errs.newPassword = "Must be at least 8 characters.";
    if (!confirmPassword) errs.confirmPassword = "Please confirm your new password.";
    else if (newPassword !== confirmPassword)
      errs.confirmPassword = "Passwords do not match.";
    if (newPassword && currentPassword && newPassword === currentPassword)
      errs.newPassword = "New password must differ from current password.";
    return errs;
  };

  const resetForm = () => {
    setCurrentPassword("");
    setNewPassword("");
    setConfirmPassword("");
    setErrors({});
    setShowCurrent(false);
    setShowNew(false);
    setShowConfirm(false);
  };

  const handleClose = (val: boolean) => {
    if (!val) resetForm();
    onOpenChange(val);
  };

  const handleSubmit = async () => {
    const errs = validate();
    if (Object.keys(errs).length > 0) {
      setErrors(errs);
      return;
    }
    setErrors({});
    setIsLoading(true);

    const token = localStorage.getItem("token");

    try {
      const res = await fetch(`${API_BASE_URL}/api/auth/update-password`, {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ currentPassword, newPassword }),
      });

      const data = await res.json().catch(() => ({}));

      if (!res.ok) {
        throw new Error(data?.error || "Failed to change password. Please try again.");
      }

      toast({
        title: "Password Changed",
        description: "Your password was updated successfully. Please log in again.",
      });

      // Security best-practice: force re-login after password change
      setTimeout(() => {
        localStorage.removeItem("token");
        localStorage.removeItem("user_session");
        navigate("/");
      }, 1500);

      handleClose(false);
    } catch (error: any) {
      toast({
        variant: "destructive",
        title: "Error",
        description: error.message || "Something went wrong.",
      });
    } finally {
      setIsLoading(false);
    }
  };

  const passwordsMatch =
    confirmPassword.length > 0 && newPassword === confirmPassword;

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="sm:max-w-md rounded-2xl p-0 overflow-hidden">
        {/* Header band */}
        <div className="bg-gradient-to-r from-primary/90 to-primary px-6 py-5 flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-white/15 flex items-center justify-center">
            <KeyRound className="w-5 h-5 text-white" />
          </div>
          <div>
            <DialogTitle className="text-white text-lg font-bold leading-tight">
              Change Password
            </DialogTitle>
          </div>
        </div>

        <div className="px-6 py-5 space-y-5">
          {/* Current Password */}
          <div className="space-y-1.5">
            <Label htmlFor="cp-current" className="text-xs font-semibold text-slate-700">
              Current Password
            </Label>
            <div className="relative">
              <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
              <Input
                id="cp-current"
                type={showCurrent ? "text" : "password"}
                placeholder="Enter current password"
                className="pl-9 pr-9 h-10 rounded-xl text-sm border-slate-200 focus:border-primary/40"
                value={currentPassword}
                onChange={(e) => {
                  setCurrentPassword(e.target.value);
                  setErrors((p) => ({ ...p, currentPassword: "" }));
                }}
                disabled={isLoading}
              />
              <button
                type="button"
                tabIndex={-1}
                onClick={() => setShowCurrent((v) => !v)}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 transition-colors"
              >
                {showCurrent ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
              </button>
            </div>
            {errors.currentPassword && (
              <p className="text-xs text-destructive">{errors.currentPassword}</p>
            )}
          </div>

          {/* New Password */}
          <div className="space-y-1.5">
            <Label htmlFor="cp-new" className="text-xs font-semibold text-slate-700">
              New Password
            </Label>
            <div className="relative">
              <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
              <Input
                id="cp-new"
                type={showNew ? "text" : "password"}
                placeholder="Min. 8 characters"
                className="pl-9 pr-9 h-10 rounded-xl text-sm border-slate-200 focus:border-primary/40"
                value={newPassword}
                onChange={(e) => {
                  setNewPassword(e.target.value);
                  setErrors((p) => ({ ...p, newPassword: "" }));
                }}
                disabled={isLoading}
              />
              <button
                type="button"
                tabIndex={-1}
                onClick={() => setShowNew((v) => !v)}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 transition-colors"
              >
                {showNew ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
              </button>
            </div>


            {errors.newPassword && (
              <p className="text-xs text-destructive">{errors.newPassword}</p>
            )}
          </div>

          {/* Confirm Password */}
          <div className="space-y-1.5">
            <Label htmlFor="cp-confirm" className="text-xs font-semibold text-slate-700">
              Confirm New Password
            </Label>
            <div className="relative">
              <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
              <Input
                id="cp-confirm"
                type={showConfirm ? "text" : "password"}
                placeholder="Re-enter new password"
                className={`pl-9 pr-9 h-10 rounded-xl text-sm border-slate-200 focus:border-primary/40 ${confirmPassword.length > 0
                  ? passwordsMatch
                    ? "border-emerald-400 focus:border-emerald-400"
                    : "border-red-300 focus:border-red-400"
                  : ""
                  }`}
                value={confirmPassword}
                onChange={(e) => {
                  setConfirmPassword(e.target.value);
                  setErrors((p) => ({ ...p, confirmPassword: "" }));
                }}
                disabled={isLoading}
              />
              <button
                type="button"
                tabIndex={-1}
                onClick={() => setShowConfirm((v) => !v)}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 transition-colors"
              >
                {showConfirm ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
              </button>
              {/* Live match indicator */}
              {confirmPassword.length > 0 && (
                <ShieldCheck
                  className={`absolute right-9 top-1/2 -translate-y-1/2 w-3.5 h-3.5 transition-colors ${passwordsMatch ? "text-emerald-500" : "text-red-400"
                    }`}
                />
              )}
            </div>
            {errors.confirmPassword && (
              <p className="text-xs text-destructive">{errors.confirmPassword}</p>
            )}
          </div>

          {/* Info note */}
          <p className="text-[11px] text-slate-400 leading-relaxed bg-slate-50 rounded-xl px-3 py-2 border border-slate-100">
            🔒 For security, you will be logged out automatically after your password is changed.
          </p>
        </div>

        <DialogFooter className="px-6 pb-5 gap-2">
          <Button
            variant="outline"
            onClick={() => handleClose(false)}
            disabled={isLoading}
            className="rounded-xl text-sm"
          >
            Cancel
          </Button>
          <Button
            onClick={handleSubmit}
            disabled={isLoading}
            className="rounded-xl text-sm bg-primary hover:bg-primary/90 shadow-md shadow-primary/20 gap-2"
          >
            {isLoading ? (
              <>
                <span className="w-3.5 h-3.5 border-2 border-white/40 border-t-white rounded-full animate-spin" />
                Updating...
              </>
            ) : (
              <>
                <ShieldCheck className="w-3.5 h-3.5" />
                Update Password
              </>
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
