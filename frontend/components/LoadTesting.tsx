import { useState, useRef, useCallback, useEffect } from "react";
import { motion } from "framer-motion";
import {
  Play,
  Square,
  Users,
  Clock,
  Zap,
  TrendingUp,
  AlertTriangle,
  CheckCircle2,
  BarChart3,
  Activity,
} from "lucide-react";
import { Slider } from "@/components/ui/slider";
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  AreaChart,
  Area,
} from "recharts";
import { RequestTabs } from "./RequestTabs";
import type { KeyValuePair, HttpMethod } from "./RequestBuilder";

type TestProfile = "fixed" | "rampup" | "spike" | "stress" | "custom";

interface TestProfileConfig {
  id: TestProfile;
  label: string;
  description: string;
  icon: typeof Activity;
  getUsers: (
    t: number,
    duration: number,
    maxUsers: number,
    rampUp: number,
  ) => number;
}

const testProfiles: TestProfileConfig[] = [
  {
    id: "fixed",
    label: "Fixed",
    description: "Constant load throughout the test",
    icon: BarChart3,
    getUsers: (_t, _d, max) => max,
  },
  {
    id: "rampup",
    label: "Ramp Up",
    description: "Gradually increase users over ramp-up time",
    icon: TrendingUp,
    getUsers: (t, _d, max, rampUp) => {
      if (rampUp <= 0) return max;
      return Math.max(1, Math.floor(max * Math.min(1, (t + 1) / rampUp)));
    },
  },
  {
    id: "spike",
    label: "Spike",
    description: "Sudden burst of users at mid-point",
    icon: Zap,
    getUsers: (t, duration, max) => {
      const mid = Math.floor(duration / 2);
      const spikeWindow = Math.max(3, Math.floor(duration * 0.2));
      if (t >= mid - 1 && t < mid - 1 + spikeWindow) return max;
      return Math.max(1, Math.floor(max * 0.1));
    },
  },
  {
    id: "stress",
    label: "Stress",
    description: "Step-up load in stages to find breaking point",
    icon: AlertTriangle,
    getUsers: (t, duration, max) => {
      const stages = 4;
      const stageLen = Math.floor(duration / stages);
      const stage = Math.min(stages - 1, Math.floor(t / stageLen));
      return Math.max(1, Math.floor(max * ((stage + 1) / stages)));
    },
  },
  {
    id: "custom",
    label: "Custom",
    description: "Fine-tune all parameters manually",
    icon: Activity,
    getUsers: (t, _d, max, rampUp) => {
      if (rampUp <= 0) return max;
      return Math.max(1, Math.floor(max * Math.min(1, (t + 1) / rampUp)));
    },
  },
];

interface MetricPoint {
  time: number;
  avgResponseTime: number;
  p95: number;
  p99: number;
  rps: number;
  errorRate: number;
  activeUsers: number;
}

interface TestSummary {
  totalRequests: number;
  successCount: number;
  errorCount: number;
  avgResponseTime: number;
  minResponseTime: number;
  maxResponseTime: number;
  p95: number;
  p99: number;
  rps: number;
}

function ProfilePreview({
  profile,
  duration,
  maxUsers,
  rampUp,
}: {
  profile: TestProfileConfig;
  duration: number;
  maxUsers: number;
  rampUp: number;
}) {
  const points = Array.from({ length: 20 }, (_, i) => {
    const t = Math.floor((i / 19) * (duration - 1));
    return profile.getUsers(t, duration, maxUsers, rampUp);
  });
  const max = Math.max(...points, 1);
  const h = 32;
  const w = 80;
  const pathD = points
    .map((p, i) => `${i === 0 ? "M" : "L"}${(i / 19) * w},${h - (p / max) * h}`)
    .join(" ");

  return (
    <svg width={w} height={h} className="shrink-0">
      <path
        d={pathD}
        fill="none"
        stroke="hsl(var(--primary))"
        strokeWidth={1.5}
        opacity={0.7}
      />
    </svg>
  );
}

export function LoadTesting() {
  const [url, setUrl] = useState(
    "https://jsonplaceholder.typicode.com/posts/1",
  );
  const [method, setMethod] = useState<HttpMethod>("GET");
  const [concurrentUsers, setConcurrentUsers] = useState(10);
  const [duration, setDuration] = useState(30);
  const [rampUp, setRampUp] = useState(5);
  const [testProfile, setTestProfile] = useState<TestProfile>("rampup");
  const [spikeMultiplier, setSpikeMultiplier] = useState(1);

  // Request config state
  const [headers, setHeaders] = useState<KeyValuePair[]>([
    { key: "", value: "", enabled: true, id: "h1" },
  ]);
  const [params, setParams] = useState<KeyValuePair[]>([
    { key: "", value: "", enabled: true, id: "p1" },
  ]);
  const [bodyContent, setBodyContent] = useState("");
  const [bodyType, setBodyType] = useState("json");
  const [authType, setAuthType] = useState("none");
  const [authToken, setAuthToken] = useState("");

  const [isRunning, setIsRunning] = useState(false);
  const [metrics, setMetrics] = useState<MetricPoint[]>([]);
  const [summary, setSummary] = useState<TestSummary | null>(null);
  const [elapsed, setElapsed] = useState(0);
  const cancelRef = useRef(false);
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const activeProfile = testProfiles.find((p) => p.id === testProfile)!;

  const stopTest = useCallback(() => {
    cancelRef.current = true;
    if (intervalRef.current) clearInterval(intervalRef.current);
    setIsRunning(false);
  }, []);

  const buildFetchOptions = useCallback((): RequestInit => {
    const opts: RequestInit = { method, mode: "no-cors" };
    const h: Record<string, string> = {};
    headers
      .filter((p) => p.enabled && p.key)
      .forEach((p) => {
        h[p.key] = p.value;
      });

    if (authType === "bearer" && authToken)
      h["Authorization"] = `Bearer ${authToken}`;
    else if (authType === "basic" && authToken)
      h["Authorization"] = `Basic ${btoa(authToken)}`;
    else if (authType === "apikey" && authToken) h["X-API-Key"] = authToken;

    if (Object.keys(h).length) opts.headers = h;

    if (method !== "GET" && method !== "HEAD") {
      if (bodyType === "json" && bodyContent) {
        opts.body = bodyContent;
        h["Content-Type"] = h["Content-Type"] || "application/json";
      } else if (bodyType === "raw" && bodyContent) {
        opts.body = bodyContent;
      } else if (bodyType === "formdata") {
        const fd = new FormData();
        opts.body = fd;
      }
    }

    return opts;
  }, [method, headers, authType, authToken, bodyType, bodyContent]);

  const buildUrl = useCallback(() => {
    let u = url;
    const active = params.filter((p) => p.enabled && p.key);
    if (active.length) {
      const sep = u.includes("?") ? "&" : "?";
      u +=
        sep +
        active
          .map(
            (p) =>
              `${encodeURIComponent(p.key)}=${encodeURIComponent(p.value)}`,
          )
          .join("&");
    }
    return u;
  }, [url, params]);

  const runTest = useCallback(async () => {
    cancelRef.current = false;
    setIsRunning(true);
    setMetrics([]);
    setSummary(null);
    setElapsed(0);

    const allTimes: number[] = [];
    let totalReqs = 0;
    let errors = 0;
    const startTime = Date.now();
    const fetchUrl = buildUrl();
    const fetchOpts = buildFetchOptions();

    intervalRef.current = setInterval(() => {
      if (cancelRef.current) return;
      const sec = Math.floor((Date.now() - startTime) / 1000);
      setElapsed(sec);
      if (sec >= duration) stopTest();
    }, 1000);

    for (let t = 0; t < duration; t++) {
      if (cancelRef.current) break;

      const activeUsers = activeProfile.getUsers(
        t,
        duration,
        concurrentUsers,
        rampUp,
      );
      const tickStart = Date.now();

      const promises = Array.from({ length: activeUsers }, async () => {
        const rs = Date.now();
        try {
          await fetch(fetchUrl, fetchOpts);
          const dur = Date.now() - rs;
          allTimes.push(dur);
          totalReqs++;
          return dur;
        } catch {
          errors++;
          totalReqs++;
          return -1;
        }
      });

      const results = await Promise.all(promises);
      const valid = results.filter((r) => r > 0);
      const sorted = [...valid].sort((a, b) => a - b);
      const avg = valid.length
        ? valid.reduce((a, b) => a + b, 0) / valid.length
        : 0;
      const p95 = sorted.length ? sorted[Math.floor(sorted.length * 0.95)] : 0;
      const p99 = sorted.length ? sorted[Math.floor(sorted.length * 0.99)] : 0;

      setMetrics((prev) => [
        ...prev,
        {
          time: t + 1,
          avgResponseTime: Math.round(avg),
          p95: Math.round(p95),
          p99: Math.round(p99),
          rps: Math.round((totalReqs / (t + 1)) * 100) / 100,
          errorRate:
            totalReqs > 0 ? Math.round((errors / totalReqs) * 10000) / 100 : 0,
          activeUsers,
        },
      ]);

      const wait = Math.max(0, 1000 - (Date.now() - tickStart));
      if (wait > 0 && !cancelRef.current)
        await new Promise((r) => setTimeout(r, wait));
    }

    const sortedAll = [...allTimes].sort((a, b) => a - b);
    setSummary({
      totalRequests: totalReqs,
      successCount: totalReqs - errors,
      errorCount: errors,
      avgResponseTime: sortedAll.length
        ? Math.round(sortedAll.reduce((a, b) => a + b, 0) / sortedAll.length)
        : 0,
      minResponseTime: sortedAll[0] ?? 0,
      maxResponseTime: sortedAll[sortedAll.length - 1] ?? 0,
      p95: sortedAll.length
        ? sortedAll[Math.floor(sortedAll.length * 0.95)]
        : 0,
      p99: sortedAll.length
        ? sortedAll[Math.floor(sortedAll.length * 0.99)]
        : 0,
      rps: duration > 0 ? Math.round((totalReqs / duration) * 100) / 100 : 0,
    });
    stopTest();
  }, [
    duration,
    concurrentUsers,
    rampUp,
    activeProfile,
    buildUrl,
    buildFetchOptions,
    stopTest,
  ]);

  useEffect(() => {
    return () => {
      cancelRef.current = true;
      if (intervalRef.current) clearInterval(intervalRef.current);
    };
  }, []);

  const StatCard = ({
    label,
    value,
    icon: Icon,
    color,
  }: {
    label: string;
    value: string | number;
    icon: any;
    color: string;
  }) => (
    <div className="surface-2 rounded-xl p-4 border border-border">
      <div className="flex items-center gap-2 text-muted-foreground text-xs mb-1">
        <Icon className={`w-3.5 h-3.5 ${color}`} />
        {label}
      </div>
      <div className="text-xl font-bold text-foreground">{value}</div>
    </div>
  );

  const tooltipStyle = {
    backgroundColor: "hsl(var(--surface-1))",
    border: "1px solid hsl(var(--border))",
    borderRadius: 8,
    fontSize: 12,
    color: "hsl(var(--foreground))",
  };

  return (
    <div className="flex flex-col h-full overflow-hidden">
      {/* Header */}
      <div className="flex items-center justify-between px-6 h-14 border-b border-border shrink-0">
        <div className="flex items-center gap-2">
          <BarChart3 className="w-5 h-5 text-primary" />
          <h1 className="text-lg font-semibold text-foreground">
            Load Testing
          </h1>
        </div>
        <div className="flex items-center gap-2">
          {isRunning && (
            <span className="text-xs text-muted-foreground font-mono">
              {elapsed}s / {duration}s
            </span>
          )}
          <button
            onClick={isRunning ? stopTest : runTest}
            className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-all ${
              isRunning
                ? "bg-destructive/10 text-destructive hover:bg-destructive/20"
                : "bg-primary/10 text-primary hover:bg-primary/20"
            }`}
          >
            {isRunning ? (
              <Square className="w-4 h-4" />
            ) : (
              <Play className="w-4 h-4" />
            )}
            {isRunning ? "Stop Test" : "Run Test"}
          </button>
        </div>
      </div>

      <div className="flex-1 overflow-y-auto scrollbar-thin p-6 space-y-6">
        {/* URL & Method */}
        <motion.div
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          className="glass rounded-2xl p-6 space-y-5"
        >
          <h2 className="text-sm font-semibold text-foreground">
            Target Endpoint
          </h2>
          <div className="flex gap-2">
            <select
              value={method}
              onChange={(e) => setMethod(e.target.value as HttpMethod)}
              className="surface-2 rounded-lg px-3 py-2 text-sm font-mono text-primary border border-border focus:outline-none"
              disabled={isRunning}
            >
              {(
                [
                  "GET",
                  "POST",
                  "PUT",
                  "PATCH",
                  "DELETE",
                  "OPTIONS",
                  "HEAD",
                ] as HttpMethod[]
              ).map((m) => (
                <option key={m}>{m}</option>
              ))}
            </select>
            <input
              value={url}
              onChange={(e) => setUrl(e.target.value)}
              className="flex-1 surface-2 rounded-lg px-3 py-2 text-sm font-mono border border-border focus:outline-none focus:ring-1 focus:ring-primary/30 text-foreground"
              placeholder="https://api.example.com/endpoint"
              disabled={isRunning}
            />
          </div>
        </motion.div>

        {/* Request Configuration Tabs */}
        <motion.div
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.05 }}
          className="glass rounded-2xl overflow-hidden"
        >
          <div className="px-6 pt-4 pb-0">
            <h2 className="text-sm font-semibold text-foreground">
              Request Configuration
            </h2>
          </div>
          <div className="h-[280px]">
            <RequestTabs
              headers={headers}
              setHeaders={setHeaders}
              params={params}
              setParams={setParams}
              bodyContent={bodyContent}
              setBodyContent={setBodyContent}
              bodyType={bodyType}
              setBodyType={setBodyType}
              authType={authType}
              setAuthType={setAuthType}
              authToken={authToken}
              setAuthToken={setAuthToken}
              method={method}
            />
          </div>
        </motion.div>

        {/* Test Profile Selection */}
        <motion.div
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
          className="glass rounded-2xl p-6 space-y-4"
        >
          <h2 className="text-sm font-semibold text-foreground">
            Test Profile
          </h2>
          <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
            {testProfiles.map((p) => {
              const isActive = testProfile === p.id;
              return (
                <button
                  key={p.id}
                  onClick={() => !isRunning && setTestProfile(p.id)}
                  disabled={isRunning}
                  className={`relative flex flex-col items-center gap-2 p-4 rounded-xl border transition-all text-center ${
                    isActive
                      ? "border-primary bg-primary/10 text-primary"
                      : "border-border surface-2 text-muted-foreground hover:text-foreground hover:border-primary/30"
                  }`}
                >
                  <ProfilePreview
                    profile={p}
                    duration={duration}
                    maxUsers={concurrentUsers}
                    rampUp={rampUp}
                  />
                  <span className="text-xs font-semibold">{p.label}</span>
                  <span className="text-[10px] leading-tight opacity-70">
                    {p.description}
                  </span>
                </button>
              );
            })}
          </div>
        </motion.div>

        {/* Load Parameters */}
        <motion.div
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.15 }}
          className="glass rounded-2xl p-6 space-y-5"
        >
          <h2 className="text-sm font-semibold text-foreground">
            Load Parameters
          </h2>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <div>
              <label className="text-xs text-muted-foreground mb-2 flex items-center justify-between">
                <span className="flex items-center gap-1">
                  <Users className="w-3 h-3" />{" "}
                  {testProfile === "spike" ? "Peak Users" : "Concurrent Users"}
                </span>
                <span className="font-mono text-foreground">
                  {concurrentUsers}
                </span>
              </label>
              <Slider
                value={[concurrentUsers]}
                onValueChange={([v]) => setConcurrentUsers(v)}
                min={1}
                max={100}
                step={1}
                disabled={isRunning}
              />
            </div>
            <div>
              <label className="text-xs text-muted-foreground mb-2 flex items-center justify-between">
                <span className="flex items-center gap-1">
                  <Clock className="w-3 h-3" /> Duration (s)
                </span>
                <span className="font-mono text-foreground">{duration}</span>
              </label>
              <Slider
                value={[duration]}
                onValueChange={([v]) => setDuration(v)}
                min={5}
                max={120}
                step={5}
                disabled={isRunning}
              />
            </div>
            <div>
              <label className="text-xs text-muted-foreground mb-2 flex items-center justify-between">
                <span className="flex items-center gap-1">
                  <TrendingUp className="w-3 h-3" /> Ramp-up (s)
                </span>
                <span className="font-mono text-foreground">{rampUp}</span>
              </label>
              <Slider
                value={[rampUp]}
                onValueChange={([v]) => setRampUp(v)}
                min={0}
                max={Math.floor(duration / 2)}
                step={1}
                disabled={
                  isRunning ||
                  (testProfile !== "rampup" && testProfile !== "custom")
                }
              />
              {testProfile !== "rampup" && testProfile !== "custom" && (
                <p className="text-[10px] text-muted-foreground mt-1">
                  Ramp-up only applies to Ramp Up / Custom profiles
                </p>
              )}
            </div>
          </div>
        </motion.div>

        {/* Summary Cards */}
        {summary && (
          <motion.div
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            className="grid grid-cols-2 md:grid-cols-4 gap-3"
          >
            <StatCard
              label="Total Requests"
              value={summary.totalRequests}
              icon={Zap}
              color="text-primary"
            />
            <StatCard
              label="Success"
              value={summary.successCount}
              icon={CheckCircle2}
              color="text-[hsl(var(--success))]"
            />
            <StatCard
              label="Errors"
              value={summary.errorCount}
              icon={AlertTriangle}
              color="text-destructive"
            />
            <StatCard
              label="Avg RPS"
              value={summary.rps}
              icon={TrendingUp}
              color="text-[hsl(var(--info))]"
            />
            <StatCard
              label="Avg Response"
              value={`${summary.avgResponseTime}ms`}
              icon={Clock}
              color="text-[hsl(var(--warning))]"
            />
            <StatCard
              label="P95 Latency"
              value={`${summary.p95}ms`}
              icon={BarChart3}
              color="text-accent"
            />
            <StatCard
              label="P99 Latency"
              value={`${summary.p99}ms`}
              icon={BarChart3}
              color="text-accent"
            />
            <StatCard
              label="Min / Max"
              value={`${summary.minResponseTime} / ${summary.maxResponseTime}ms`}
              icon={TrendingUp}
              color="text-muted-foreground"
            />
          </motion.div>
        )}

        {/* Charts */}
        {metrics.length > 0 && (
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
            <motion.div
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.05 }}
              className="glass rounded-2xl p-5"
            >
              <h3 className="text-sm font-semibold text-foreground mb-4">
                Response Time (ms)
              </h3>
              <ResponsiveContainer width="100%" height={240}>
                <LineChart data={metrics}>
                  <CartesianGrid
                    strokeDasharray="3 3"
                    stroke="hsl(var(--border))"
                  />
                  <XAxis
                    dataKey="time"
                    stroke="hsl(var(--muted-foreground))"
                    fontSize={11}
                  />
                  <YAxis stroke="hsl(var(--muted-foreground))" fontSize={11} />
                  <Tooltip contentStyle={tooltipStyle} />
                  <Line
                    type="monotone"
                    dataKey="avgResponseTime"
                    stroke="hsl(var(--primary))"
                    strokeWidth={2}
                    dot={false}
                    name="Avg"
                  />
                  <Line
                    type="monotone"
                    dataKey="p95"
                    stroke="hsl(var(--warning))"
                    strokeWidth={1.5}
                    dot={false}
                    name="P95"
                  />
                  <Line
                    type="monotone"
                    dataKey="p99"
                    stroke="hsl(var(--destructive))"
                    strokeWidth={1.5}
                    dot={false}
                    name="P99"
                  />
                </LineChart>
              </ResponsiveContainer>
            </motion.div>

            <motion.div
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.1 }}
              className="glass rounded-2xl p-5"
            >
              <h3 className="text-sm font-semibold text-foreground mb-4">
                Throughput & Errors
              </h3>
              <ResponsiveContainer width="100%" height={240}>
                <AreaChart data={metrics}>
                  <CartesianGrid
                    strokeDasharray="3 3"
                    stroke="hsl(var(--border))"
                  />
                  <XAxis
                    dataKey="time"
                    stroke="hsl(var(--muted-foreground))"
                    fontSize={11}
                  />
                  <YAxis stroke="hsl(var(--muted-foreground))" fontSize={11} />
                  <Tooltip contentStyle={tooltipStyle} />
                  <Area
                    type="monotone"
                    dataKey="rps"
                    stroke="hsl(var(--success))"
                    fill="hsl(var(--success) / 0.1)"
                    strokeWidth={2}
                    name="RPS"
                  />
                  <Area
                    type="monotone"
                    dataKey="errorRate"
                    stroke="hsl(var(--destructive))"
                    fill="hsl(var(--destructive) / 0.1)"
                    strokeWidth={1.5}
                    name="Error %"
                  />
                </AreaChart>
              </ResponsiveContainer>
            </motion.div>

            <motion.div
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.15 }}
              className="glass rounded-2xl p-5 lg:col-span-2"
            >
              <h3 className="text-sm font-semibold text-foreground mb-4">
                Active Users Over Time
              </h3>
              <ResponsiveContainer width="100%" height={180}>
                <AreaChart data={metrics}>
                  <CartesianGrid
                    strokeDasharray="3 3"
                    stroke="hsl(var(--border))"
                  />
                  <XAxis
                    dataKey="time"
                    stroke="hsl(var(--muted-foreground))"
                    fontSize={11}
                  />
                  <YAxis stroke="hsl(var(--muted-foreground))" fontSize={11} />
                  <Tooltip contentStyle={tooltipStyle} />
                  <Area
                    type="stepAfter"
                    dataKey="activeUsers"
                    stroke="hsl(var(--accent))"
                    fill="hsl(var(--accent) / 0.1)"
                    strokeWidth={2}
                    name="Users"
                  />
                </AreaChart>
              </ResponsiveContainer>
            </motion.div>
          </div>
        )}

        {/* Empty state */}
        {!isRunning && metrics.length === 0 && !summary && (
          <div className="flex flex-col items-center justify-center py-20 text-center">
            <div className="w-16 h-16 rounded-2xl surface-2 flex items-center justify-center mb-4">
              <BarChart3 className="w-8 h-8 text-muted-foreground/40" />
            </div>
            <p className="text-muted-foreground text-sm">
              Configure your test above and click{" "}
              <span className="text-primary font-medium">Run Test</span> to
              start
            </p>
          </div>
        )}
      </div>
    </div>
  );
}
