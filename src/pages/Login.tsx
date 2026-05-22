import { useState, useEffect } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { Lock, User, ArrowLeft } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle, CardDescription, CardFooter } from "@/components/ui/card";
import { useToast } from "@/components/ui/use-toast";
import { API_BASE_URL } from "@/config";
import { cn } from "@/lib/utils";

const stationLabels: Record<string, string> = {
    reception: "Reception",
    refraction: "Refraction Room",
    doctor: "Doctor Room",
    optical: "Optical",
    pharmacy: "Pharmacy",
    admin: "Admin Panel",
};

const stationRoleMap: Record<string, string> = {
    reception: "RECEPTIONIST",
    refraction: "OPTOMETRIST",
    doctor: "DOCTOR",
    optical: "OPTICALS",
    pharmacy: "PHARMACIST",
};

const Login = () => {
    const [searchParams] = useSearchParams();
    const stationId = searchParams.get("station") || "reception";
    const navigate = useNavigate();
    const { toast } = useToast();

    const [username, setUsername] = useState("");
    const [password, setPassword] = useState("");
    const [isLoading, setIsLoading] = useState(false);
    const [lockoutTime, setLockoutTime] = useState<number | null>(() => {
        const savedUntil = localStorage.getItem("login_lockout_until");
        if (savedUntil) {
            const remaining = Math.floor((parseInt(savedUntil, 10) - Date.now()) / 1000);
            return remaining > 0 ? remaining : null;
        }
        return null;
    });

    // Pre-fill credentials if it is the reception or refraction station demo
    useEffect(() => {
        if (stationId === "reception") {
            setUsername("reception");
            setPassword("demo123");
            setLockoutTime(null);
        } else if (stationId === "refraction") {
            setUsername("refraction");
            setPassword("demo123");
            setLockoutTime(null);
        } else {
            setUsername("");
            setPassword("");
        }
    }, [stationId]);

    // Lockout countdown timer
    useEffect(() => {
        if (lockoutTime === null || lockoutTime <= 0) return;

        const interval = setInterval(() => {
            setLockoutTime((prev) => {
                if (prev === null || prev <= 1) {
                    clearInterval(interval);
                    localStorage.removeItem("login_lockout_until");
                    return null;
                }
                return prev - 1;
            });
        }, 1000);

        return () => clearInterval(interval);
    }, [lockoutTime]);

    // Poll backend every 15 s while locked out.
    // Handles TWO unblock scenarios:
    //   1. Super admin manually unblocks the IP → detected within 15 s
    //   2. Natural 15-min window expiry → server returns blocked:false, auto-clears here
    // The countdown timer above (client-side) also clears lockout at 0 s independently.
    const isLockedOut = lockoutTime !== null;
    useEffect(() => {
        if (!isLockedOut) return;
        if (stationId === "reception" || stationId === "refraction") return;

        const checkStatus = async () => {
            try {
                const res = await fetch(`${API_BASE_URL}/api/auth/rate-limit-status`);
                const data = await res.json();
                // Only clear if the backend explicitly confirms the IP is no longer blocked.
                // Do NOT use lockoutSeconds <= 0 as a secondary OR — that can race with
                // the store and clear the lockout prematurely (this was the original bug).
                if (!data.blocked) {
                    setLockoutTime(null);
                    localStorage.removeItem("login_lockout_until");
                }
            } catch {
                // Network error — countdown timer still handles natural expiry independently
            }
        };

        // Do NOT call checkStatus() immediately — the lockout was just set by a failed
        // login attempt, so the store is already populated. Calling it right away could
        // race against the store update and clear the lockout prematurely.
        // The first real check happens after 15 s (for admin-unblock detection).
        const id = setInterval(checkStatus, 15_000);
        return () => clearInterval(id);
    }, [isLockedOut, stationId]);

    // If a valid session already exists, redirect to the appropriate dashboard
    useEffect(() => {
        const existingSession = localStorage.getItem("user_session");
        if (existingSession) {
            try {
                const { role } = JSON.parse(existingSession);
                if (role === "ADMIN") {
                    navigate("/admin", { replace: true });
                } else {
                    navigate("/dashboard", { replace: true });
                }
                return;
            } catch {
                // Corrupted session data — clear it and stay on login
                localStorage.removeItem("user_session");
                localStorage.removeItem("token");
            }
        }
    }, [navigate]);

    // Show session expired toast if redirected with expired=true
    useEffect(() => {
        if (searchParams.get("expired") === "true") {
            toast({
                variant: "destructive",
                title: "Session Expired",
                description: "Your session has ended. Please log in again to continue.",
            });
        }
    }, [searchParams, toast]);

    // Redirect if no station is selected (or if it's invalid)
    useEffect(() => {
        if (!stationLabels[stationId]) {
            navigate("/");
        }
    }, [stationId, navigate]);

    const handleLogin = async (e: React.FormEvent) => {
        e.preventDefault();

        if (!username || !password) {
            toast({
                variant: "destructive",
                title: "Login Failed",
                description: "Please enter both username and password.",
            });
            return;
        }

        // Demo login bypass for reception station
        if (stationId === "reception") {
            if (username !== "reception" || password !== "demo123") {
                toast({
                    variant: "destructive",
                    title: "Login Failed",
                    description: "Invalid demo credentials.",
                });
                return;
            }

            setIsLoading(true);
            setTimeout(() => {
                localStorage.setItem("token", "demo_reception_token");
                localStorage.setItem("user_session", JSON.stringify({
                    username: "reception",
                    role: "RECEPTIONIST",
                    name: "Demo Receptionist",
                    stationId: "reception",
                    loginTime: new Date().toISOString()
                }));

                toast({
                    title: "Login Successful",
                    description: "Welcome to the Reception demo workspace",
                });
                setIsLoading(false);
                navigate("/dashboard");
            }, 800);
            return;
        }

        // Demo login bypass for refraction station
        if (stationId === "refraction") {
            if (username !== "refraction" || password !== "demo123") {
                toast({
                    variant: "destructive",
                    title: "Login Failed",
                    description: "Invalid demo credentials.",
                });
                return;
            }

            setIsLoading(true);
            setTimeout(() => {
                localStorage.setItem("token", "demo_refraction_token");
                localStorage.setItem("user_session", JSON.stringify({
                    username: "refraction",
                    role: "OPTOMETRIST",
                    name: "Demo Optometrist",
                    stationId: "refraction",
                    loginTime: new Date().toISOString()
                }));

                toast({
                    title: "Login Successful",
                    description: "Welcome to the Refraction demo workspace",
                });
                setIsLoading(false);
                navigate("/dashboard");
            }, 800);
            return;
        }

        setIsLoading(true);

        try {
            const response = await fetch(`${API_BASE_URL}/api/auth/login`, {
                method: "POST",
                headers: {
                    "Content-Type": "application/json",
                },
                body: JSON.stringify({ username, password }),
            });

            let data: any = null;
            try {
                data = await response.json();
            } catch {
                throw new Error("Invalid server response");
            }

            if (!response.ok) {
                const err: any = new Error(data?.error || "Invalid credentials");
                err.lockoutSeconds = data?.lockoutSeconds ?? null;
                throw err;
            }

            const userRole = data.user.role;

            // Role-based Access Control
            if (userRole !== "ADMIN" && userRole !== "SUPER_ADMIN") {
                if (stationId === "admin") {
                    throw new Error(`Access Denied: Your role (${userRole}) is not authorized for Admin Panel.`);
                }

                if (stationRoleMap[stationId] && stationRoleMap[stationId] !== userRole) {
                    throw new Error(`Access Denied: Your role (${userRole}) is not authorized for ${stationLabels[stationId]}.`);
                }
            }


            // Save JWT token
            localStorage.setItem("token", data.token);

            // Save frontend specific session required for station
            localStorage.setItem("user_session", JSON.stringify({
                username: data.user.username,
                role: userRole,
                name: data.user.name,
                stationId,
                loginTime: new Date().toISOString()
            }));

            toast({
                title: "Login Successful",
                description: `Welcome to ${stationLabels[stationId]}`,
            });

            if (stationId === "admin") {
                navigate("/admin");
            } else {
                navigate("/dashboard");
            }
        } catch (error: any) {
            // Check for rate limiting lockout seconds
            const lockoutSecs = error.lockoutSeconds;
            if (lockoutSecs) {
                setLockoutTime(lockoutSecs);
                localStorage.setItem("login_lockout_until", String(Date.now() + lockoutSecs * 1000));
            } else {
                const rateLimitMatch = error.message?.match(/after (\d+) minute/);
                if (rateLimitMatch) {
                    const minutes = parseInt(rateLimitMatch[1], 10);
                    if (minutes > 0) {
                        const seconds = minutes * 60;
                        setLockoutTime(seconds);
                        localStorage.setItem("login_lockout_until", String(Date.now() + seconds * 1000));
                    }
                }
            }

            toast({
                variant: "destructive",
                title: "Login Failed",
                description: error.message || "An unexpected error occurred. Please try again.",
            });
        } finally {
            setIsLoading(false);
        }
    };

    return (
        <div className="min-h-screen w-full bg-slate-50 flex flex-col items-center justify-center p-4">
            <Button
                variant="ghost"
                className="absolute top-8 left-8 gap-2 text-slate-500"
                onClick={() => navigate("/home")}
            >
                <ArrowLeft className="w-4 h-4" />
                Back to stations
            </Button>

            <Card className="w-full max-w-md border-slate-200 shadow-xl rounded-3xl overflow-hidden bg-white">
                <CardHeader className="space-y-2 text-center pt-10 pb-6">
                    <div className="flex flex-col items-center justify-center mb-6 gap-2 leading-none">
                        <span
                            style={{ fontFamily: "'Outfit', sans-serif" }}
                            className="font-extrabold text-3xl tracking-tight leading-none"
                        >
                            <span style={{ color: "#0F172A" }}>Vision</span>
                            <span style={{ color: "#2563EB" }}>Pulze</span>
                        </span>
                        <span className="text-[10px] font-semibold uppercase tracking-[0.22em] text-slate-400 mt-2">
                            Ophthalmic Ecosystem
                        </span>
                    </div>
                    <CardTitle className="text-3xl font-black font-sans text-slate-900 tracking-tight uppercase flex items-center justify-center gap-4">
                        {stationLabels[stationId]} Login
                    </CardTitle>
                    <CardDescription className="text-slate-400 font-medium uppercase tracking-[0.2em] text-[10px]">
                        {stationId === "admin" ? (
                            <span className="text-primary font-black">Clinical Management System</span>
                        ) : (
                            <span className="text-primary font-black">Authorized Terminal Access</span>
                        )}
                    </CardDescription>
                </CardHeader>
                <CardContent>
                    <form onSubmit={handleLogin} className="space-y-6">
                        {(stationId === "reception" || stationId === "refraction") && (
                            <div className="p-4 bg-blue-50 border border-blue-100 rounded-2xl flex items-start gap-3 text-xs text-blue-800">
                                <Lock className="w-4 h-4 text-blue-500 shrink-0 mt-0.5" />
                                <div className="space-y-1">
                                    <p className="font-bold text-slate-950">Demo Workspace Access</p>
                                    <p className="text-blue-600/90 leading-relaxed">
                                        Click <strong>Login</strong> below to proceed - credentials have been prefilled for you.
                                    </p>
                                </div>
                            </div>
                        )}

                        <div className="space-y-4">
                            <Label htmlFor="username" className="text-[10px] font-black uppercase tracking-widest text-[#1a365d] flex items-center gap-2">
                                Username
                            </Label>
                            <div className="relative">
                                <User className="absolute left-3 top-3 w-4 h-4 text-slate-400" />
                                <Input
                                    id="username"
                                    placeholder="Enter your name"
                                    className={cn(
                                        "pl-10 h-11 border-slate-200 rounded-xl",
                                        (stationId === "reception" || stationId === "refraction") && "bg-slate-50 text-slate-500 cursor-not-allowed select-none border-slate-100"
                                    )}
                                    value={username}
                                    onChange={(e) => setUsername(e.target.value)}
                                    disabled={isLoading}
                                    readOnly={stationId === "reception" || stationId === "refraction"}
                                />
                            </div>
                        </div>
                        <div className="space-y-4">
                            <Label htmlFor="password" className="text-[10px] font-black uppercase tracking-widest text-[#1a365d] flex items-center gap-2">
                                Password
                            </Label>
                            <div className="relative">
                                <Lock className="absolute left-3 top-3 w-4 h-4 text-slate-400" />
                                <Input
                                    id="password"
                                    type="password"
                                    placeholder="••••••••"
                                    className={cn(
                                        "pl-10 h-11 border-slate-200 rounded-xl",
                                        (stationId === "reception" || stationId === "refraction") && "bg-slate-50 text-slate-500 cursor-not-allowed select-none border-slate-100"
                                    )}
                                    value={password}
                                    onChange={(e) => setPassword(e.target.value)}
                                    disabled={isLoading}
                                    readOnly={stationId === "reception" || stationId === "refraction"}
                                />
                            </div>
                        </div>
                        <Button
                            type="submit"
                            className="w-full h-14 text-sm font-black uppercase tracking-widest rounded-none bg-[#1a365d] hover:bg-black shadow-xl shadow-primary/20 transition-all active:scale-[0.98]"
                            disabled={isLoading || lockoutTime !== null}
                        >
                            {isLoading
                                ? "Logging in..."
                                : lockoutTime !== null
                                    ? `LOCKED: ${Math.floor(lockoutTime / 60)}:${String(lockoutTime % 60).padStart(2, '0')}`
                                    : "Login"}
                        </Button>
                    </form>
                </CardContent>
                <CardFooter className="pb-10 pt-4 flex flex-col gap-4 items-center border-t border-slate-50 mt-4 bg-slate-50/50">
                    <p className="text-xs text-slate-400">
                        Access restricted to authorized personnel
                    </p>
                </CardFooter>
            </Card>
        </div>
    );
};

export default Login;
