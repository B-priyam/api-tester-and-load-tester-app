import { useState, useRef, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { ChevronDown } from "lucide-react";
import type { HttpMethod } from "./RequestBuilder";

const methods: { value: HttpMethod; color: string }[] = [
  { value: "GET", color: "text-method-get" },
  { value: "POST", color: "text-method-post" },
  { value: "PUT", color: "text-method-put" },
  { value: "PATCH", color: "text-method-patch" },
  { value: "DELETE", color: "text-method-delete" },
  { value: "OPTIONS", color: "text-method-options" },
  { value: "HEAD", color: "text-method-head" },
];

interface MethodSelectorProps {
  method: HttpMethod;
  onChange: (method: HttpMethod) => void;
}

export function MethodSelector({ method, onChange }: MethodSelectorProps) {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node))
        setOpen(false);
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, []);

  const current = methods.find((m) => m.value === method)!;

  return (
    <div ref={ref} className="relative">
      <button
        onClick={() => setOpen(!open)}
        className="flex items-center gap-1.5 px-3 py-2.5 rounded-lg surface-2 border border-border hover:border-primary/30 transition-all text-sm font-bold min-w-[100px]"
      >
        <span className={current.color}>{method}</span>
        <ChevronDown className="w-3.5 h-3.5 text-muted-foreground" />
      </button>
      <AnimatePresence>
        {open && (
          <motion.div
            initial={{ opacity: 0, y: -4, scale: 0.96 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: -4, scale: 0.96 }}
            transition={{ duration: 0.12 }}
            className="absolute top-full mt-1 left-0 z-50 glass-strong rounded-lg py-1 min-w-[120px] shadow-xl"
          >
            {methods.map((m) => (
              <button
                key={m.value}
                onClick={() => {
                  onChange(m.value);
                  setOpen(false);
                }}
                className={`w-full text-left px-3 py-1.5 text-sm font-bold hover:bg-primary/10 transition-colors ${m.color} ${
                  m.value === method ? "bg-primary/5" : ""
                }`}
              >
                {m.value}
              </button>
            ))}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
