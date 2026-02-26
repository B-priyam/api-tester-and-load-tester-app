import { useState } from "react";
import { motion } from "framer-motion";
import {
  Plus,
  Trash2,
  Lock,
  Key,
  FileJson,
  Code,
  FileText,
} from "lucide-react";
import type { KeyValuePair, HttpMethod } from "./RequestBuilder";

interface RequestTabsProps {
  headers: KeyValuePair[];
  setHeaders: (h: KeyValuePair[]) => void;
  params: KeyValuePair[];
  setParams: (p: KeyValuePair[]) => void;
  bodyContent: string;
  setBodyContent: (b: string) => void;
  bodyType: string;
  setBodyType: (t: string) => void;
  authType: string;
  setAuthType: (t: string) => void;
  authToken: string;
  setAuthToken: (t: string) => void;
  method: HttpMethod;
}

type TabId = "params" | "headers" | "body" | "auth";

const tabs: { id: TabId; label: string }[] = [
  { id: "params", label: "Params" },
  { id: "headers", label: "Headers" },
  { id: "body", label: "Body" },
  { id: "auth", label: "Auth" },
];

function KeyValueEditor({
  pairs,
  onChange,
}: {
  pairs: KeyValuePair[];
  onChange: (pairs: KeyValuePair[]) => void;
}) {
  const updatePair = (
    id: string,
    field: "key" | "value" | "enabled",
    val: string | boolean,
  ) => {
    onChange(pairs.map((p) => (p.id === id ? { ...p, [field]: val } : p)));
  };
  const addPair = () => {
    onChange([
      ...pairs,
      { key: "", value: "", enabled: true, id: Date.now().toString() },
    ]);
  };
  const removePair = (id: string) => {
    if (pairs.length <= 1) return;
    onChange(pairs.filter((p) => p.id !== id));
  };

  return (
    <div className="space-y-1.5">
      {pairs.map((pair, i) => (
        <motion.div
          key={pair.id}
          initial={{ opacity: 0, x: -8 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ delay: i * 0.03 }}
          className="flex items-center gap-2"
        >
          <input
            type="checkbox"
            checked={pair.enabled}
            onChange={(e) => updatePair(pair.id, "enabled", e.target.checked)}
            className="w-3.5 h-3.5 rounded border-border accent-primary"
          />
          <input
            placeholder="Key"
            value={pair.key}
            onChange={(e) => updatePair(pair.id, "key", e.target.value)}
            className="flex-1 px-3 py-1.5 rounded-md surface-2 border border-border text-sm font-mono text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-1 focus:ring-primary/40"
          />
          <input
            placeholder="Value"
            value={pair.value}
            onChange={(e) => updatePair(pair.id, "value", e.target.value)}
            className="flex-1 px-3 py-1.5 rounded-md surface-2 border border-border text-sm font-mono text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-1 focus:ring-primary/40"
          />
          <button
            onClick={() => removePair(pair.id)}
            className="p-1 text-muted-foreground hover:text-destructive transition-colors"
          >
            <Trash2 className="w-3.5 h-3.5" />
          </button>
        </motion.div>
      ))}
      <button
        onClick={addPair}
        className="flex items-center gap-1.5 text-xs text-muted-foreground hover:text-primary transition-colors mt-2"
      >
        <Plus className="w-3 h-3" />
        Add Row
      </button>
    </div>
  );
}

const bodyTypes = [
  { id: "json", label: "JSON", icon: FileJson },
  { id: "raw", label: "Raw", icon: FileText },
  { id: "formdata", label: "Form Data", icon: Code },
];

const authTypes = [
  { id: "none", label: "No Auth" },
  { id: "bearer", label: "Bearer Token" },
  { id: "basic", label: "Basic Auth" },
  { id: "apikey", label: "API Key" },
];

export function RequestTabs(props: RequestTabsProps) {
  const [activeTab, setActiveTab] = useState<TabId>("params");

  return (
    <div className="flex flex-col h-full">
      {/* Tab Headers */}
      <div className="flex items-center border-b border-border px-4">
        {tabs.map((tab) => {
          const isActive = activeTab === tab.id;
          const isDisabled =
            tab.id === "body" &&
            (props.method === "GET" || props.method === "HEAD");
          return (
            <button
              key={tab.id}
              onClick={() => !isDisabled && setActiveTab(tab.id)}
              disabled={isDisabled}
              className={`relative px-4 py-3 text-sm transition-colors ${
                isDisabled
                  ? "text-muted-foreground/40 cursor-not-allowed"
                  : isActive
                    ? "text-primary font-medium"
                    : "text-muted-foreground hover:text-foreground"
              }`}
            >
              {tab.label}
              {tab.id === "headers" &&
                props.headers.filter((h) => h.key).length > 0 && (
                  <span className="ml-1.5 px-1.5 py-0.5 rounded-full bg-primary/15 text-primary text-[10px] font-medium">
                    {props.headers.filter((h) => h.key).length}
                  </span>
                )}
              {isActive && (
                <motion.div
                  layoutId="request-tab-indicator"
                  className="absolute bottom-0 left-0 right-0 h-0.5 bg-primary rounded-full"
                />
              )}
            </button>
          );
        })}
      </div>

      {/* Tab Content */}
      <div className="flex-1 p-4 overflow-y-auto">
        {activeTab === "params" && (
          <KeyValueEditor pairs={props.params} onChange={props.setParams} />
        )}

        {activeTab === "headers" && (
          <KeyValueEditor pairs={props.headers} onChange={props.setHeaders} />
        )}

        {activeTab === "body" && (
          <div className="space-y-3">
            <div className="flex gap-1.5">
              {bodyTypes.map((bt) => (
                <button
                  key={bt.id}
                  onClick={() => props.setBodyType(bt.id)}
                  className={`flex items-center gap-1.5 px-3 py-1.5 rounded-md text-xs font-medium transition-colors ${
                    props.bodyType === bt.id
                      ? "bg-primary/15 text-primary"
                      : "text-muted-foreground hover:text-foreground surface-2"
                  }`}
                >
                  <bt.icon className="w-3 h-3" />
                  {bt.label}
                </button>
              ))}
            </div>
            {props.bodyType === "formdata" ? (
              <KeyValueEditor
                pairs={[{ key: "", value: "", enabled: true, id: "fd1" }]}
                onChange={() => {}}
              />
            ) : (
              <textarea
                value={props.bodyContent}
                onChange={(e) => props.setBodyContent(e.target.value)}
                rows={12}
                spellCheck={false}
                className="w-full px-4 py-3 rounded-lg surface-2 border border-border font-mono text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-1 focus:ring-primary/40 resize-none scrollbar-thin"
                placeholder='{\n  "key": "value"\n}'
              />
            )}
          </div>
        )}

        {activeTab === "auth" && (
          <div className="space-y-4">
            <div className="flex gap-1.5 flex-wrap">
              {authTypes.map((at) => (
                <button
                  key={at.id}
                  onClick={() => props.setAuthType(at.id)}
                  className={`px-3 py-1.5 rounded-md text-xs font-medium transition-colors ${
                    props.authType === at.id
                      ? "bg-primary/15 text-primary"
                      : "text-muted-foreground hover:text-foreground surface-2"
                  }`}
                >
                  {at.label}
                </button>
              ))}
            </div>
            {props.authType !== "none" && (
              <motion.div
                initial={{ opacity: 0, y: 4 }}
                animate={{ opacity: 1, y: 0 }}
                className="space-y-2"
              >
                <label className="text-xs text-muted-foreground font-medium flex items-center gap-1.5">
                  <Lock className="w-3 h-3" />
                  {props.authType === "bearer"
                    ? "Token"
                    : props.authType === "apikey"
                      ? "API Key"
                      : "Credentials"}
                </label>
                <input
                  type="password"
                  value={props.authToken}
                  onChange={(e) => props.setAuthToken(e.target.value)}
                  placeholder={
                    props.authType === "bearer"
                      ? "Enter bearer token..."
                      : "Enter key..."
                  }
                  className="w-full px-3 py-2 rounded-lg surface-2 border border-border text-sm font-mono text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-1 focus:ring-primary/40"
                />
              </motion.div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
