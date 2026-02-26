import { useState, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Send, Loader2 } from "lucide-react";
import { MethodSelector } from "./MethodSelector";
import { RequestTabs } from "./RequestTabs";
import { ResponseViewer } from "./ResponseViewer";

export type HttpMethod =
  | "GET"
  | "POST"
  | "PUT"
  | "PATCH"
  | "DELETE"
  | "OPTIONS"
  | "HEAD";

export interface KeyValuePair {
  key: string;
  value: string;
  enabled: boolean;
  id: string;
}

export interface ApiResponse {
  status: number;
  statusText: string;
  headers: Record<string, string>;
  body: string;
  time: number;
  size: number;
}

import { useEffect } from "react";
import type { SavedRequest } from "./Collections";

interface RequestBuilderProps {
  initialRequest?: SavedRequest | null;
  onRequestLoaded?: () => void;
}

export function RequestBuilder({
  initialRequest,
  onRequestLoaded,
}: RequestBuilderProps) {
  const [method, setMethod] = useState<HttpMethod>("GET");
  const [url, setUrl] = useState("");
  const [loading, setLoading] = useState(false);
  const [response, setResponse] = useState<ApiResponse | null>(null);

  const [headers, setHeaders] = useState<KeyValuePair[]>([
    { key: "Content-Type", value: "application/json", enabled: true, id: "1" },
    { key: "", value: "", enabled: true, id: "2" },
  ]);
  const [params, setParams] = useState<KeyValuePair[]>([
    { key: "", value: "", enabled: true, id: "1" },
  ]);
  const [bodyContent, setBodyContent] = useState("{\n  \n}");
  const [bodyType, setBodyType] = useState<string>("json");
  const [authType, setAuthType] = useState<string>("none");
  const [authToken, setAuthToken] = useState("");

  useEffect(() => {
    if (initialRequest) {
      setMethod(initialRequest.method);
      setUrl(initialRequest.url);
      setHeaders(initialRequest.headers);
      setParams(initialRequest.params);
      setBodyContent(initialRequest.bodyContent);
      setBodyType(initialRequest.bodyType);
      setAuthType(initialRequest.authType);
      setAuthToken(initialRequest.authToken);
      setResponse(null);
      onRequestLoaded?.();
    }
  }, [initialRequest, onRequestLoaded]);

  const handleSend = useCallback(async () => {
    if (!url.trim()) return;
    setLoading(true);
    const startTime = performance.now();

    try {
      const activeHeaders: Record<string, string> = {};
      headers
        .filter((h) => h.enabled && h.key)
        .forEach((h) => {
          activeHeaders[h.key] = h.value;
        });

      if (authType === "bearer" && authToken) {
        activeHeaders["Authorization"] = `Bearer ${authToken}`;
      } else if (authType === "apikey" && authToken) {
        activeHeaders["X-API-Key"] = authToken;
      }

      let queryString = "";
      const activeParams = params.filter((p) => p.enabled && p.key);
      if (activeParams.length > 0) {
        queryString =
          "?" +
          activeParams
            .map(
              (p) =>
                `${encodeURIComponent(p.key)}=${encodeURIComponent(p.value)}`,
            )
            .join("&");
      }

      const fetchOptions: RequestInit = {
        method,
        headers: activeHeaders,
      };

      if (method !== "GET" && method !== "HEAD") {
        if (bodyType === "json" || bodyType === "raw") {
          fetchOptions.body = bodyContent;
        }
      }

      const res = await fetch(url + queryString, fetchOptions);
      const endTime = performance.now();
      const text = await res.text();

      const responseHeaders: Record<string, string> = {};
      res.headers.forEach((value, key) => {
        responseHeaders[key] = value;
      });

      setResponse({
        status: res.status,
        statusText: res.statusText,
        headers: responseHeaders,
        body: text,
        time: Math.round(endTime - startTime),
        size: new Blob([text]).size,
      });
    } catch (err: any) {
      const endTime = performance.now();
      setResponse({
        status: 0,
        statusText: "Network Error",
        headers: {},
        body: err.message || "Failed to connect",
        time: Math.round(endTime - startTime),
        size: 0,
      });
    } finally {
      setLoading(false);
    }
  }, [
    url,
    method,
    headers,
    params,
    bodyContent,
    bodyType,
    authType,
    authToken,
  ]);

  return (
    <div className="flex flex-col h-full overflow-hidden">
      {/* URL Bar */}
      <motion.div
        initial={{ y: -10, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        className="flex items-center gap-2 p-4 border-b border-border"
      >
        <MethodSelector method={method} onChange={setMethod} />
        <div className="flex-1 relative">
          <input
            type="text"
            value={url}
            onChange={(e) => setUrl(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && handleSend()}
            placeholder="Enter request URL..."
            className="w-full px-4 py-2.5 rounded-lg surface-2 border border-border text-foreground placeholder:text-muted-foreground text-sm font-mono focus:outline-none focus:ring-1 focus:ring-primary/50 focus:border-primary/50 transition-all"
          />
        </div>
        <button
          onClick={handleSend}
          disabled={loading || !url.trim()}
          className="flex items-center gap-2 px-5 py-2.5 rounded-lg bg-primary text-primary-foreground font-medium text-sm hover:bg-primary/90 disabled:opacity-40 disabled:cursor-not-allowed transition-all glow-primary"
        >
          {loading ? (
            <Loader2 className="w-4 h-4 animate-spin" />
          ) : (
            <Send className="w-4 h-4" />
          )}
          Send
        </button>
      </motion.div>

      {/* Split View */}
      <div className="flex-1 flex flex-col lg:flex-row overflow-hidden">
        {/* Request Config */}
        <div className="flex-1 overflow-y-auto scrollbar-thin border-b lg:border-b-0 lg:border-r border-border">
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

        {/* Response */}
        <div className="flex-1 overflow-y-auto scrollbar-thin">
          <ResponseViewer response={response} loading={loading} />
        </div>
      </div>
    </div>
  );
}
