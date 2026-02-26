import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  Copy,
  Download,
  Check,
  Clock,
  HardDrive,
  FileJson,
  Code,
  Eye,
  List,
} from "lucide-react";
import type { ApiResponse } from "./RequestBuilder";

interface ResponseViewerProps {
  response: ApiResponse | null;
  loading: boolean;
}

function getStatusColor(status: number) {
  if (status === 0) return "text-destructive";
  if (status < 300) return "text-success";
  if (status < 400) return "text-warning";
  return "text-destructive";
}

function getStatusBg(status: number) {
  if (status === 0) return "bg-destructive/10";
  if (status < 300) return "bg-success/10";
  if (status < 400) return "bg-warning/10";
  return "bg-destructive/10";
}

function formatSize(bytes: number) {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

function tryFormatJson(str: string) {
  try {
    return JSON.stringify(JSON.parse(str), null, 2);
  } catch {
    return str;
  }
}

type ViewMode = "pretty" | "raw" | "headers";

export function ResponseViewer({ response, loading }: ResponseViewerProps) {
  const [viewMode, setViewMode] = useState<ViewMode>("pretty");
  const [copied, setCopied] = useState(false);

  const copyToClipboard = () => {
    if (!response) return;
    navigator.clipboard.writeText(response.body);
    setCopied(true);
    setTimeout(() => setCopied(false), 1500);
  };

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center h-full gap-3">
        <div className="relative">
          <div className="w-10 h-10 rounded-full border-2 border-primary/20 border-t-primary animate-spin" />
        </div>
        <p className="text-sm text-muted-foreground">Sending request...</p>
      </div>
    );
  }

  if (!response) {
    return (
      <div className="flex flex-col items-center justify-center h-full gap-3 px-8">
        <div className="w-16 h-16 rounded-2xl surface-2 flex items-center justify-center">
          <Code className="w-7 h-7 text-muted-foreground/50" />
        </div>
        <div className="text-center">
          <p className="text-sm text-muted-foreground">
            Enter a URL and click Send
          </p>
          <p className="text-xs text-muted-foreground/60 mt-1">
            Response will appear here
          </p>
        </div>
      </div>
    );
  }

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      className="flex flex-col h-full"
    >
      {/* Status Bar */}
      <div className="flex items-center justify-between px-4 py-3 border-b border-border">
        <div className="flex items-center gap-3">
          <span
            className={`px-2.5 py-1 rounded-md text-sm font-bold ${getStatusColor(response.status)} ${getStatusBg(response.status)}`}
          >
            {response.status || "ERR"} {response.statusText}
          </span>
          <div className="flex items-center gap-1 text-xs text-muted-foreground">
            <Clock className="w-3 h-3" />
            {response.time}ms
          </div>
          <div className="flex items-center gap-1 text-xs text-muted-foreground">
            <HardDrive className="w-3 h-3" />
            {formatSize(response.size)}
          </div>
        </div>
        <div className="flex items-center gap-1">
          <button
            onClick={copyToClipboard}
            className="p-1.5 rounded-md text-muted-foreground hover:text-foreground hover:bg-secondary transition-colors"
            title="Copy response"
          >
            {copied ? (
              <Check className="w-3.5 h-3.5 text-success" />
            ) : (
              <Copy className="w-3.5 h-3.5" />
            )}
          </button>
          <button
            className="p-1.5 rounded-md text-muted-foreground hover:text-foreground hover:bg-secondary transition-colors"
            title="Download"
          >
            <Download className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>

      {/* View Tabs */}
      <div className="flex items-center gap-0 border-b border-border px-4">
        {[
          { id: "pretty" as ViewMode, label: "Pretty", icon: FileJson },
          { id: "raw" as ViewMode, label: "Raw", icon: Code },
          { id: "headers" as ViewMode, label: "Headers", icon: List },
        ].map((tab) => {
          const isActive = viewMode === tab.id;
          return (
            <button
              key={tab.id}
              onClick={() => setViewMode(tab.id)}
              className={`relative flex items-center gap-1.5 px-3 py-2.5 text-xs transition-colors ${
                isActive
                  ? "text-primary font-medium"
                  : "text-muted-foreground hover:text-foreground"
              }`}
            >
              <tab.icon className="w-3 h-3" />
              {tab.label}
              {isActive && (
                <motion.div
                  layoutId="response-tab-indicator"
                  className="absolute bottom-0 left-0 right-0 h-0.5 bg-primary rounded-full"
                />
              )}
            </button>
          );
        })}
      </div>

      {/* Content */}
      <div className="flex-1 overflow-auto scrollbar-thin p-4">
        <AnimatePresence mode="wait">
          {viewMode === "pretty" && (
            <motion.pre
              key="pretty"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="text-sm font-mono text-foreground whitespace-pre-wrap break-words leading-relaxed"
            >
              {tryFormatJson(response.body)}
            </motion.pre>
          )}
          {viewMode === "raw" && (
            <motion.pre
              key="raw"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="text-sm font-mono text-foreground whitespace-pre-wrap break-all leading-relaxed"
            >
              {response.body}
            </motion.pre>
          )}
          {viewMode === "headers" && (
            <motion.div
              key="headers"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="space-y-1.5"
            >
              {Object.entries(response.headers).map(([key, value]) => (
                <div key={key} className="flex gap-3 text-sm">
                  <span className="text-primary font-mono font-medium min-w-[180px]">
                    {key}
                  </span>
                  <span className="text-foreground/80 font-mono break-all">
                    {value}
                  </span>
                </div>
              ))}
              {Object.keys(response.headers).length === 0 && (
                <p className="text-sm text-muted-foreground">
                  No headers available (CORS may restrict header visibility)
                </p>
              )}
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </motion.div>
  );
}
