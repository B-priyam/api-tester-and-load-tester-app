import { useState } from "react";
import { motion } from "framer-motion";
import {
  Zap,
  FolderOpen,
  History,
  BarChart3,
  Settings,
  Users,
  Search,
  Plus,
  ChevronDown,
  Globe,
  FileCode,
} from "lucide-react";
import { ThemeToggle } from "./ThemeToggle";

interface SidebarProps {
  activeTab: string;
  onTabChange: (tab: string) => void;
}

const navItems = [
  { id: "api", label: "API Testing", icon: Zap },
  { id: "collections", label: "Collections", icon: FolderOpen },
  { id: "history", label: "History", icon: History },
  { id: "loadtest", label: "Load Testing", icon: BarChart3 },
  { id: "environments", label: "Environments", icon: Globe },
  { id: "mocks", label: "Mock Servers", icon: FileCode },
];

const bottomItems = [
  { id: "team", label: "Team", icon: Users },
  { id: "settings", label: "Settings", icon: Settings },
];

export function AppSidebar({ activeTab, onTabChange }: SidebarProps) {
  const [collapsed, setCollapsed] = useState(false);

  return (
    <motion.aside
      initial={{ x: -20, opacity: 0 }}
      animate={{ x: 0, opacity: 1 }}
      className={`flex flex-col h-screen border-r border-border bg-sidebar transition-all duration-300 ${
        collapsed ? "w-16" : "w-60"
      }`}
    >
      {/* Logo */}
      <div className="flex items-center gap-2.5 px-4 h-14 border-b border-border">
        <div className="w-8 h-8 rounded-lg bg-primary/20 flex items-center justify-center glow-primary">
          <Zap className="w-4 h-4 text-primary" />
        </div>
        {!collapsed && (
          <span className="font-bold text-foreground tracking-tight text-lg">
            Volt<span className="text-primary">API</span>
          </span>
        )}
      </div>

      {/* New Request */}
      {!collapsed && (
        <div className="px-3 pt-3">
          <button
            onClick={() => onTabChange("api")}
            className="w-full flex items-center gap-2 px-3 py-2 rounded-lg bg-primary/10 text-primary hover:bg-primary/20 transition-colors text-sm font-medium"
          >
            <Plus className="w-4 h-4" />
            New Request
          </button>
        </div>
      )}

      {/* Search */}
      {!collapsed && (
        <div className="px-3 pt-2">
          <div className="flex items-center gap-2 px-3 py-1.5 rounded-lg surface-2 text-muted-foreground text-sm">
            <Search className="w-3.5 h-3.5" />
            <span>Search... ⌘K</span>
          </div>
        </div>
      )}

      {/* Nav Items */}
      <nav className="flex-1 px-2 pt-4 space-y-0.5 overflow-y-auto scrollbar-thin">
        {navItems.map((item) => {
          const isActive = activeTab === item.id;
          return (
            <button
              key={item.id}
              onClick={() => onTabChange(item.id)}
              className={`w-full flex items-center gap-2.5 px-3 py-2 rounded-lg text-sm transition-all duration-150 ${
                isActive
                  ? "bg-primary/10 text-primary font-medium"
                  : "text-sidebar-foreground hover:bg-sidebar-accent hover:text-foreground"
              }`}
            >
              <item.icon
                className={`w-4 h-4 flex-shrink-0 ${isActive ? "text-primary" : ""}`}
              />
              {!collapsed && <span>{item.label}</span>}
              {isActive && (
                <motion.div
                  layoutId="sidebar-indicator"
                  className="absolute left-0 w-0.5 h-5 bg-primary rounded-r-full"
                />
              )}
            </button>
          );
        })}
      </nav>

      {/* Bottom Items section*/}
      <div className="px-2 pb-3 space-y-0.5 border-t border-border pt-2">
        {!collapsed && <ThemeToggle />}
        {bottomItems.map((item) => (
          <button
            key={item.id}
            onClick={() => onTabChange(item.id)}
            className="w-full flex items-center gap-2.5 px-3 py-2 rounded-lg text-sm text-sidebar-foreground hover:bg-sidebar-accent hover:text-foreground transition-colors"
          >
            <item.icon className="w-4 h-4 flex-shrink-0" />
            {!collapsed && <span>{item.label}</span>}
          </button>
        ))}
      </div>
    </motion.aside>
  );
}
