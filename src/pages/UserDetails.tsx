import { useState, useEffect, useRef, lazy, Suspense } from "react";
import { useNavigate } from "react-router-dom";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import {
    CheckCircle2,
    Zap,
    Users,
    TrendingUp,
    BarChart3,
    ClipboardList,
    ShieldCheck,
    ArrowRight,
    Eye,
    Activity,
    Building2,
    Phone,
    Mail,
    User,
    ChevronRight,
    Star,
    Sparkles
} from "lucide-react";
import { cn } from "@/lib/utils";

const ReceptionStandalone = lazy(() => import("../components/previews/ReceptionStandalone"));
const RefractionStandalone = lazy(() => import("../components/previews/RefractionStandalone"));
const DoctorStandalone = lazy(() => import("../components/previews/DoctorStandalone"));
const OpticalStandalone = lazy(() => import("../components/previews/OpticalStandalone"));
const PharmacyStandalone = lazy(() => import("../components/previews/PharmacyStandalone"));

// ─── Schema ───────────────────────────────────────────────────────────────────
const schema = z.object({
    name: z.string().min(2, "Please enter your full name"),
    businessName: z.string().min(2, "Please enter your business / clinic name"),
    email: z.string().email("Please enter a valid email address"),
    phone: z
        .string()
        .optional()
        .refine(
            (v) => !v || /^\d{10}$/.test(v.replace(/\s/g, "")),
            "Enter a valid 10-digit number"
        ),
});

type FormData = z.infer<typeof schema>;

// ─── Static data ──────────────────────────────────────────────────────────────
const benefits = [
    {
        icon: ClipboardList,
        title: "Ready-to-use Dashboard",
        desc: "Live HMS dashboard with real workflows - no configuration needed.",
        color: "text-blue-500",
        bg: "bg-blue-50",
    },
    {
        icon: Users,
        title: "Preloaded Patient Records",
        desc: "Explore realistic patient queues, visits, and prescriptions.",
        color: "text-emerald-500",
        bg: "bg-emerald-50",
    },
    {
        icon: TrendingUp,
        title: "Full Clinical Pipeline",
        desc: "Reception → Refraction → Doctor → Optical → Pharmacy.",
        color: "text-indigo-500",
        bg: "bg-indigo-50",
    },
    {
        icon: BarChart3,
        title: "Reports & Analytics",
        desc: "Revenue charts, patient trends, and operational insights.",
        color: "text-violet-500",
        bg: "bg-violet-50",
    },
    {
        icon: Zap,
        title: "No Setup Required",
        desc: "Instant access - zero IT overhead, zero data entry.",
        color: "text-amber-500",
        bg: "bg-amber-50",
    },
    {
        icon: ShieldCheck,
        title: "Guided Onboarding",
        desc: "An interactive tour walks you through every station.",
        color: "text-cyan-500",
        bg: "bg-cyan-50",
    },
];

const trustBadges = [
    { icon: Zap, label: "Instant access" },
    { icon: ShieldCheck, label: "No credit card" },
    { icon: Star, label: "Demo data included" },
    { icon: Eye, label: "Guided tour ready" },
];

const loadingSteps = [
    "Initialising your HMS workspace…",
    "Seeding patient records…",
    "Configuring clinical stations…",
    "Loading analytics & reports…",
    "Almost ready - launching your demo!",
];

// Animated mini-dashboard preview
const MiniDashboard = () => (
    <div className="w-full rounded-2xl overflow-hidden border border-slate-200 shadow-2xl bg-white">
        {/* Top bar */}
        <div className="flex items-center gap-1.5 px-4 py-2.5 bg-slate-900 border-b border-slate-700">
            <span className="w-2.5 h-2.5 rounded-full bg-red-400" />
            <span className="w-2.5 h-2.5 rounded-full bg-yellow-400" />
            <span className="w-2.5 h-2.5 rounded-full bg-green-400" />
            <span className="ml-3 text-[10px] text-slate-400 font-mono">
                vision-pulze.demo / dashboard
            </span>
        </div>

        {/* Nav bar */}
        <div className="flex items-center gap-4 px-4 py-2 bg-[#1a365d] text-white text-[10px] font-semibold">
            <span className="opacity-60">Reception</span>
            <span className="opacity-60">Refraction</span>
            <span className="underline underline-offset-4 decoration-blue-300">Doctor</span>
            <span className="opacity-60">Optical</span>
            <span className="opacity-60">Pharmacy</span>
            <span className="ml-auto flex items-center gap-1">
                <Activity className="w-3 h-3 text-green-400 animate-pulse" /> Live
            </span>
        </div>

        {/* Body */}
        <div className="p-3 bg-slate-50 grid grid-cols-3 gap-2">
            {/* Stat cards */}
            {[
                { label: "Today's Patients", value: "34", up: "+12%", color: "text-blue-600" },
                { label: "In Queue", value: "7", up: "Active", color: "text-emerald-600" },
                { label: "Revenue", value: "₹18.4k", up: "+8%", color: "text-violet-600" },
            ].map((s) => (
                <div key={s.label} className="bg-white rounded-lg p-2 border border-slate-100 shadow-sm">
                    <p className="text-[8px] text-slate-400 font-medium">{s.label}</p>
                    <p className={cn("text-base font-black", s.color)}>{s.value}</p>
                    <p className="text-[8px] text-emerald-500 font-semibold">{s.up}</p>
                </div>
            ))}

            {/* Queue list */}
            <div className="col-span-2 bg-white rounded-lg p-2 border border-slate-100 shadow-sm">
                <p className="text-[8px] font-black text-slate-500 uppercase tracking-widest mb-1.5">
                    Patient Queue
                </p>
                {[
                    { name: "Rajan M.", stage: "Doctor", badge: "bg-indigo-100 text-indigo-700" },
                    { name: "Priya S.", stage: "Refraction", badge: "bg-emerald-100 text-emerald-700" },
                    { name: "Kavitha N.", stage: "Reception", badge: "bg-blue-100 text-blue-700" },
                ].map((p) => (
                    <div
                        key={p.name}
                        className="flex items-center justify-between py-1 border-b border-slate-50 last:border-0"
                    >
                        <span className="text-[9px] font-semibold text-slate-700">{p.name}</span>
                        <span className={cn("text-[7px] font-bold px-1.5 py-0.5 rounded-full", p.badge)}>
                            {p.stage}
                        </span>
                    </div>
                ))}
            </div>

            {/* Mini chart bars */}
            <div className="bg-white rounded-lg p-2 border border-slate-100 shadow-sm flex flex-col justify-between">
                <p className="text-[8px] font-black text-slate-500 uppercase tracking-widest">
                    Weekly
                </p>
                <div className="flex items-end gap-0.5 h-10 mt-1">
                    {[40, 65, 50, 80, 55, 90, 70].map((h, i) => (
                        <div
                            key={i}
                            className="flex-1 rounded-sm bg-indigo-400 opacity-80 animate-pulse"
                            style={{ height: `${h}%`, animationDelay: `${i * 100}ms` }}
                        />
                    ))}
                </div>
            </div>
        </div>
    </div>
);

// Workspace loading overlay
const WorkspaceLoader = ({ step }: { step: number }) => (
    <div className="fixed inset-0 z-50 bg-[#0d1b2a]/95 backdrop-blur-sm flex flex-col items-center justify-center gap-8 px-6">
        {/* Animated rings */}
        <div className="relative w-24 h-24">
            <div className="absolute inset-0 rounded-full border-4 border-blue-500/20 animate-ping" />
            <div className="absolute inset-2 rounded-full border-4 border-blue-500/40 animate-ping [animation-delay:200ms]" />
            <div className="absolute inset-4 rounded-full border-4 border-blue-500/60 animate-ping [animation-delay:400ms]" />
            <div className="absolute inset-0 flex items-center justify-center">
                <img
                    src="/images/logo-mark.svg"
                    alt="Vision Pulze"
                    className="w-10 h-10 animate-spin [animation-duration:3s]"
                />
            </div>
        </div>

        <div className="text-center space-y-3 max-w-sm">
            <h2 className="text-xl font-black text-white tracking-tight">
                Loading Please Wait...
            </h2>
            <p className="text-blue-300 text-sm font-medium min-h-[20px] transition-all">
                {loadingSteps[step] ?? loadingSteps[loadingSteps.length - 1]}
            </p>
        </div>

        {/* Progress bar */}
        <div className="w-64 bg-slate-700/60 rounded-full h-1.5 overflow-hidden">
            <div
                className="h-full bg-gradient-to-r from-blue-500 to-indigo-400 rounded-full transition-all duration-700"
                style={{ width: `${((step + 1) / loadingSteps.length) * 100}%` }}
            />
        </div>

        <div className="flex flex-wrap justify-center gap-3 mt-2">
            {["Patient Records", "Stations", "Analytics", "Workflows"].map((tag) => (
                <span
                    key={tag}
                    className="text-[10px] font-semibold text-slate-400 bg-slate-800 px-3 py-1 rounded-full border border-slate-700"
                >
                    {tag}
                </span>
            ))}
        </div>
    </div>
);

// ─── Main Component ────────────────────────────────────────────────────────────
const UserDetails = () => {
    const navigate = useNavigate();
    const [isLoading, setIsLoading] = useState(false);
    const [loadStep, setLoadStep] = useState(0);
    const formRef = useRef<HTMLDivElement>(null);

    const {
        register,
        handleSubmit,
        formState: { errors },
    } = useForm<FormData>({ resolver: zodResolver(schema) });

    // Animate loading steps
    useEffect(() => {
        if (!isLoading) return;
        let step = 0;
        const interval = setInterval(() => {
            step += 1;
            setLoadStep(step);
            if (step >= loadingSteps.length - 1) clearInterval(interval);
        }, 700);
        return () => clearInterval(interval);
    }, [isLoading]);

    const onSubmit = (data: FormData) => {
        // Save visitor info to localStorage
        localStorage.setItem(
            "demo_visitor",
            JSON.stringify({ ...data, submittedAt: new Date().toISOString(), source: "demo-page" })
        );

        setIsLoading(true);
        setLoadStep(0);

        // After all steps complete, navigate
        setTimeout(() => navigate("/home"), loadingSteps.length * 700 + 600);
    };

    const scrollToForm = () => {
        formRef.current?.scrollIntoView({ behavior: "smooth", block: "center" });
    };

    return (
        <>
            {isLoading && <WorkspaceLoader step={loadStep} />}

            <div className="min-h-screen bg-slate-50 font-sans">
                {/* ── Top nav ─────────────────────────────────────────────── */}
                <nav className="sticky top-0 z-40 bg-white/80 backdrop-blur-md border-b border-slate-100">
                    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-14 flex items-center justify-between">
                        <div className="flex flex-col leading-none gap-0.5">
                            <span
                                style={{ fontFamily: "'Outfit', sans-serif" }}
                                className="font-extrabold text-xl tracking-tight leading-none"
                            >
                                <span style={{ color: "#0F172A" }}>Vision</span>
                                <span style={{ color: "#2563EB" }}>Pulze</span>
                            </span>
                            <span className="text-[9px] font-semibold uppercase tracking-[0.22em] text-slate-400 mt-0.5">
                                Ophthalmic Ecosystem
                            </span>
                        </div>
                        <button
                            onClick={scrollToForm}
                            className="flex items-center gap-1.5 bg-[#1a365d] hover:bg-black text-white text-xs font-black uppercase tracking-widest px-4 py-2 rounded-lg transition-all"
                        >
                            Try Demo <ArrowRight className="w-3 h-3" />
                        </button>
                    </div>
                </nav>

                {/* ── Hero ────────────────────────────────────────────────── */}
                <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pt-16 pb-12 lg:pt-20 lg:pb-16 grid lg:grid-cols-2 gap-12 items-center">
                    {/* Left — copy */}
                    <div className="space-y-7">
                        <div className="inline-flex items-center gap-2 bg-blue-50 border border-blue-100 text-blue-700 text-xs font-bold px-3 py-1.5 rounded-full">
                            <Sparkles className="w-3.5 h-3.5" />
                            Interactive HMS Demo - No login required
                        </div>

                        <h1 className="text-4xl lg:text-5xl font-black text-slate-900 leading-tight tracking-tight">
                            Experience a{" "}
                            <span className="text-transparent bg-clip-text bg-gradient-to-r from-[#1a365d] to-blue-500">
                                Live Hospital
                            </span>{" "}
                            Management System - Instantly
                        </h1>

                        <p className="text-slate-500 text-lg leading-relaxed">
                            See how Vision Pulze HMS manages patient flow, clinical stations,
                            and analytics - with real preloaded data. No setup. No credit card.
                            Explore a fully working system in seconds.
                        </p>

                        <div className="flex flex-col sm:flex-row gap-3">
                            <button
                                onClick={scrollToForm}
                                className="flex items-center justify-center gap-2 bg-[#1a365d] hover:bg-black text-white font-black uppercase tracking-widest text-sm px-6 py-3.5 rounded-xl shadow-xl shadow-[#1a365d]/20 transition-all hover:-translate-y-0.5 active:scale-[0.98]"
                            >
                                <Zap className="w-4 h-4" />
                                Launch Interactive Demo
                            </button>
                            <button
                                onClick={scrollToForm}
                                className="flex items-center justify-center gap-2 border border-slate-200 hover:border-slate-300 bg-white text-slate-700 font-bold text-sm px-6 py-3.5 rounded-xl transition-all hover:-translate-y-0.5"
                            >
                                Explore Live CRM Demo <ChevronRight className="w-4 h-4" />
                            </button>
                        </div>

                        {/* Trust badges */}
                        <div className="flex flex-wrap gap-3 pt-2">
                            {trustBadges.map((b) => (
                                <div
                                    key={b.label}
                                    className="flex items-center gap-1.5 text-xs font-semibold text-slate-500 bg-white border border-slate-100 px-3 py-1.5 rounded-full shadow-sm"
                                >
                                    <b.icon className="w-3 h-3 text-emerald-500" />
                                    {b.label}
                                </div>
                            ))}
                        </div>
                    </div>

                    {/* Right — mini dashboard preview */}
                    <div className="relative hidden lg:block">
                        <div className="absolute -inset-4 bg-gradient-to-br from-blue-100 via-indigo-50 to-violet-100 rounded-3xl blur-2xl opacity-60" />
                        <div className="relative">
                            <MiniDashboard />
                        </div>
                        {/* Floating badge */}
                        <div className="absolute -bottom-4 -left-4 bg-white rounded-2xl shadow-xl border border-slate-100 px-4 py-3 flex items-center gap-3 animate-bounce [animation-duration:3s]">
                            <div className="w-8 h-8 rounded-full bg-emerald-100 flex items-center justify-center">
                                <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                            </div>
                            <div>
                                <p className="text-xs font-black text-slate-800">Live & Interactive</p>
                                <p className="text-[10px] text-slate-400">All stations active</p>
                            </div>
                        </div>
                        <div className="absolute -top-4 -right-4 bg-[#1a365d] rounded-2xl shadow-xl px-4 py-3 flex items-center gap-2">
                            <Activity className="w-4 h-4 text-green-400 animate-pulse" />
                            <span className="text-xs font-black text-white">34 patients today</span>
                        </div>
                    </div>
                </section>
                {/* ── Cinematic SaaS Mockup Showcase ── */}
                <section className="relative w-full max-w-[1600px] mx-auto min-h-[900px] flex flex-col items-center justify-center pr-44 py-24 overflow-hidden bg-slate-50/50">
                    {/* Background Accents */}
                    <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[1000px] h-[600px] bg-blue-600/5 rounded-full blur-[120px] pointer-events-none" />
                    <div className="absolute top-1/3 right-1/4 w-[500px] h-[500px] bg-indigo-500/5 rounded-full blur-[100px] pointer-events-none" />

                    <div className="text-center mb-16 relative z-50">
                        <h2 className="text-4xl md:text-5xl font-extrabold text-slate-900 tracking-tight mb-4">
                            Enterprise-Grade Workflow
                        </h2>
                        <p className="text-lg text-slate-500 font-medium max-w-2xl mx-auto">
                            Purpose-built, high-fidelity interfaces for every clinical station, seamlessly integrated into a single unified platform.
                        </p>
                    </div>

                    {/* 3D Composition Container */}
                    <div
                        className="relative w-full max-w-7xl h-[650px] mx-auto"
                        style={{ perspective: "2500px" }}
                    >
                        {/* 1. Left Wing - Reception */}
                        <div
                            className="absolute top-12 left-4 w-[700px] h-[480px] bg-white rounded-xl shadow-2xl overflow-hidden border border-slate-200/50 z-10 transition-transform hover:-translate-y-2 duration-500 ease-out"
                            style={{
                                transform: "rotateY(25deg) rotateX(10deg) rotateZ(-2deg) translateZ(-150px) translateX(30px)",
                                transformStyle: "preserve-3d"
                            }}
                        >
                            <div className="w-full h-full opacity-[0.98]">
                                <Suspense fallback={<div className="w-full h-full bg-slate-50" />}>
                                    <ReceptionStandalone />
                                </Suspense>
                            </div>
                            {/* Depth Gradient Overlay */}
                            <div className="absolute inset-0 bg-gradient-to-r from-transparent to-slate-900/10 pointer-events-none" />
                        </div>

                        {/* 2. Right Wing - Pharmacy */}
                        <div
                            className="absolute top-12 right-4 w-[700px] h-[480px] bg-white rounded-xl shadow-2xl overflow-hidden border border-slate-200/50 z-10 transition-transform hover:-translate-y-2 duration-500 ease-out"
                            style={{
                                transform: "rotateY(-25deg) rotateX(10deg) rotateZ(2deg) translateZ(-150px) translateX(-30px)",
                                transformStyle: "preserve-3d"
                            }}
                        >
                            <div className="w-full h-full opacity-[0.98]">
                                <Suspense fallback={<div className="w-full h-full bg-slate-50" />}>
                                    <PharmacyStandalone />
                                </Suspense>
                            </div>
                            {/* Depth Gradient Overlay */}
                            <div className="absolute inset-0 bg-gradient-to-l from-transparent to-slate-900/10 pointer-events-none" />
                        </div>

                        {/* 3. Center Hero - Doctor */}
                        <div
                            className="absolute top-0 left-1/2 -translate-x-1/2 w-[850px] h-[580px] bg-white rounded-2xl shadow-[0_35px_60px_-15px_rgba(0,0,0,0.3)] overflow-hidden border border-slate-200/80 z-30 transition-transform hover:-translate-y-3 hover:shadow-[0_45px_70px_-15px_rgba(0,0,0,0.35)] duration-500 ease-out"
                            style={{
                                transform: "rotateX(5deg) translateY(10px)",
                                transformStyle: "preserve-3d"
                            }}
                        >
                            {/* Glass reflection top edge */}
                            <div className="absolute top-0 inset-x-0 h-px bg-white/50 z-50 pointer-events-none" />
                            <div className="w-full h-full bg-white relative z-0">
                                <Suspense fallback={<div className="w-full h-full bg-slate-50" />}>
                                    <DoctorStandalone />
                                </Suspense>
                            </div>
                        </div>
                    </div>
                </section>

                {/* ── Benefits ────────────────────────────────────────────── */}
                <section className="bg-white border-y border-slate-100 py-14">
                    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
                        <div className="flex flex-col sm:flex-row">
                            <span className="text-[18px]  font-medium">Want to know more? Write to us!</span>
                        </div>
                        <div>
                            <a
                                href="mailto:connect@flowtency.com"
                                className="text-[21px] font-bold text-[#2563EB] hover:underline underline-offset-2 transition-all"
                            >
                                connect@flowtency.com
                            </a>
                        </div>
                        <p className="text-center text-xs font-black uppercase tracking-widest text-slate-400 mb-8">
                            What&apos;s included in your demo workspace
                        </p>
                        <div className="grid grid-cols-2 md:grid-cols-3 gap-4 lg:gap-6">
                            {benefits.map((b) => (
                                <div
                                    key={b.title}
                                    className="group flex items-start gap-3 p-4 rounded-2xl border border-slate-100 bg-slate-50 hover:bg-white hover:shadow-md hover:-translate-y-0.5 transition-all"
                                >
                                    <div className={cn("w-9 h-9 rounded-xl flex items-center justify-center shrink-0 mt-0.5", b.bg)}>
                                        <b.icon className={cn("w-4.5 h-4.5", b.color)} />
                                    </div>
                                    <div>
                                        <p className="text-sm font-black text-slate-800">{b.title}</p>
                                        <p className="text-xs text-slate-500 mt-0.5 leading-relaxed">{b.desc}</p>
                                    </div>
                                </div>
                            ))}
                        </div>
                    </div>
                </section>

                {/* ── Form + Side info ────────────────────────────────────── */}
                <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-16 grid lg:grid-cols-5 gap-10 items-start">
                    {/* Left — contextual copy */}
                    <div className="lg:col-span-2 space-y-6 lg:pt-4">
                        <div>
                            <h2 className="text-2xl font-black text-slate-900 leading-tight">
                                Your workspace will be ready in seconds
                            </h2>
                            <p className="text-slate-500 text-sm mt-2 leading-relaxed">
                                We'll seed it with realistic eye-care clinic data so you can
                                immediately see the system in action - the way a real clinic would use it.
                            </p>
                        </div>

                        <div className="space-y-3">
                            {[
                                { step: "01", text: "Fill in your details" },
                                { step: "02", text: "We prepare your workspace" },
                                { step: "03", text: "Explore every station freely" },
                                { step: "04", text: "Follow the guided onboarding tour" },
                            ].map((s) => (
                                <div key={s.step} className="flex items-center gap-3">
                                    <div className="w-7 h-7 rounded-full bg-[#1a365d] text-white text-[10px] font-black flex items-center justify-center shrink-0">
                                        {s.step}
                                    </div>
                                    <p className="text-sm font-semibold text-slate-700">{s.text}</p>
                                </div>
                            ))}
                        </div>

                        <div className="bg-blue-50 border border-blue-100 rounded-2xl p-4 space-y-2">
                            <div className="flex items-center gap-2">
                                <Building2 className="w-4 h-4 text-blue-600" />
                                <p className="text-xs font-black text-blue-800 uppercase tracking-widest">
                                    Vision Pulze - Demo Workspace
                                </p>
                            </div>
                            <p className="text-xs text-blue-700 leading-relaxed">
                                Smart Hospital Management Software - built for modern eye care clinics.
                            </p>
                        </div>
                    </div>

                    {/* Right — form card */}
                    <div ref={formRef} className="lg:col-span-3">
                        <div className="bg-white rounded-3xl border border-slate-200 shadow-2xl shadow-slate-200/60 overflow-hidden">
                            {/* Card header */}
                            <div className="bg-gradient-to-r from-[#1a365d] to-[#2d5a9e] px-8 py-6">
                                <p className="text-white font-black text-lg tracking-tight">
                                    Launch Your Interactive Demo
                                </p>
                                <p className="text-blue-200 text-xs mt-1">
                                    Access a fully-seeded HMS workspace - free, instant, no card required.
                                </p>
                            </div>

                            {/* Form */}
                            <form onSubmit={handleSubmit(onSubmit)} className="px-8 py-7 space-y-5">
                                {/* Name */}
                                <div className="space-y-1.5">
                                    <label
                                        htmlFor="name"
                                        className="text-[10px] font-black uppercase tracking-widest text-[#1a365d]"
                                    >
                                        Full Name <span className="text-red-400">*</span>
                                    </label>
                                    <div className="relative">
                                        <User className="absolute left-3 top-3 w-4 h-4 text-slate-400" />
                                        <input
                                            id="name"
                                            {...register("name")}
                                            placeholder="Dr. Ramesh Kumar"
                                            className={cn(
                                                "w-full pl-10 pr-4 h-11 border rounded-xl text-sm text-slate-800 placeholder:text-slate-300 outline-none focus:ring-2 focus:ring-[#1a365d]/20 focus:border-[#1a365d] transition-all",
                                                errors.name ? "border-red-300 bg-red-50" : "border-slate-200 bg-white"
                                            )}
                                        />
                                    </div>
                                    {errors.name && (
                                        <p className="text-xs text-red-500 font-medium">{errors.name.message}</p>
                                    )}
                                </div>

                                {/* Business Name */}
                                <div className="space-y-1.5">
                                    <label
                                        htmlFor="businessName"
                                        className="text-[10px] font-black uppercase tracking-widest text-[#1a365d]"
                                    >
                                        Business / Clinic Name <span className="text-red-400">*</span>
                                    </label>
                                    <div className="relative">
                                        <Building2 className="absolute left-3 top-3 w-4 h-4 text-slate-400" />
                                        <input
                                            id="businessName"
                                            {...register("businessName")}
                                            placeholder="Your Clinic / Hospital Name"
                                            className={cn(
                                                "w-full pl-10 pr-4 h-11 border rounded-xl text-sm text-slate-800 placeholder:text-slate-300 outline-none focus:ring-2 focus:ring-[#1a365d]/20 focus:border-[#1a365d] transition-all",
                                                errors.businessName ? "border-red-300 bg-red-50" : "border-slate-200 bg-white"
                                            )}
                                        />
                                    </div>
                                    {errors.businessName && (
                                        <p className="text-xs text-red-500 font-medium">{errors.businessName.message}</p>
                                    )}
                                </div>

                                {/* Email */}
                                <div className="space-y-1.5">
                                    <label
                                        htmlFor="email"
                                        className="text-[10px] font-black uppercase tracking-widest text-[#1a365d]"
                                    >
                                        Email Address <span className="text-red-400">*</span>
                                    </label>
                                    <div className="relative">
                                        <Mail className="absolute left-3 top-3 w-4 h-4 text-slate-400" />
                                        <input
                                            id="email"
                                            type="email"
                                            {...register("email")}
                                            placeholder="you@clinic.com"
                                            className={cn(
                                                "w-full pl-10 pr-4 h-11 border rounded-xl text-sm text-slate-800 placeholder:text-slate-300 outline-none focus:ring-2 focus:ring-[#1a365d]/20 focus:border-[#1a365d] transition-all",
                                                errors.email ? "border-red-300 bg-red-50" : "border-slate-200 bg-white"
                                            )}
                                        />
                                    </div>
                                    {errors.email && (
                                        <p className="text-xs text-red-500 font-medium">{errors.email.message}</p>
                                    )}
                                </div>

                                {/* Phone */}
                                <div className="space-y-1.5">
                                    <label
                                        htmlFor="phone"
                                        className="text-[10px] font-black uppercase tracking-widest text-[#1a365d] flex items-center gap-1.5"
                                    >
                                        Phone{" "}
                                        <span className="text-slate-400 normal-case tracking-normal font-medium text-[10px]">
                                            (optional)
                                        </span>
                                    </label>
                                    <div className="relative">
                                        <Phone className="absolute left-3 top-3 w-4 h-4 text-slate-400" />
                                        <input
                                            id="phone"
                                            type="tel"
                                            {...register("phone")}
                                            placeholder="98765 43210"
                                            className={cn(
                                                "w-full pl-10 pr-4 h-11 border rounded-xl text-sm text-slate-800 placeholder:text-slate-300 outline-none focus:ring-2 focus:ring-[#1a365d]/20 focus:border-[#1a365d] transition-all",
                                                errors.phone ? "border-red-300 bg-red-50" : "border-slate-200 bg-white"
                                            )}
                                        />
                                    </div>
                                    {errors.phone && (
                                        <p className="text-xs text-red-500 font-medium">{errors.phone.message}</p>
                                    )}
                                </div>

                                {/* Submit */}
                                <button
                                    type="submit"
                                    disabled={isLoading}
                                    className="w-full h-14 mt-2 bg-[#1a365d] hover:bg-black disabled:opacity-70 text-white font-black uppercase tracking-widest text-sm rounded-xl shadow-xl shadow-[#1a365d]/20 transition-all hover:-translate-y-0.5 active:scale-[0.98] flex items-center justify-center gap-2"
                                >
                                    {isLoading ? (
                                        <>
                                            <span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                                            Launching…
                                        </>
                                    ) : (
                                        <>
                                            <Zap className="w-4 h-4" />
                                            Launch Interactive Demo
                                        </>
                                    )}
                                </button>

                                {/* Trust row */}
                                <div className="flex flex-wrap justify-center gap-x-4 gap-y-1 pt-1">
                                    {trustBadges.map((b) => (
                                        <div
                                            key={b.label}
                                            className="flex items-center gap-1 text-[10px] text-slate-400 font-semibold"
                                        >
                                            <CheckCircle2 className="w-3 h-3 text-emerald-400" />
                                            {b.label}
                                        </div>
                                    ))}
                                </div>
                            </form>
                        </div>
                    </div>
                </section>

                {/* ── Footer ──────────────────────────────────────────────── */}
                <footer className="border-t border-slate-100 bg-white py-6 text-center">
                    <p className="text-xs text-slate-400">
                        © {new Date().getFullYear()} Vision Pulze - Demo environment. Engineered by{" "}
                        <span className="font-bold text-slate-600">Flowtency Technologies</span> @ +91 94437 06640
                    </p>
                </footer>
            </div>
        </>
    );
};

export default UserDetails;
