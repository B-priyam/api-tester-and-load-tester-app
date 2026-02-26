"use client";

import { useState, useCallback } from "react";
import { AppSidebar } from "@/components/AppSidebar";
import { RequestBuilder } from "@/components/RequestBuilder";
import { LoadTesting } from "@/components/LoadTesting";
import { Collections } from "@/components/Collections";
import type { SavedRequest } from "@/components/Collections";
import { motion } from "framer-motion";
import { History, Globe, FileCode, Users, Settings } from "lucide-react";

const PlaceholderPanel = ({
  title,
  icon: Icon,
}: {
  title: string;
  icon: any;
}) => (
  <div className="flex flex-col items-center justify-center h-full gap-4">
    <div className="w-20 h-20 rounded-2xl surface-2 flex items-center justify-center">
      <Icon className="w-9 h-9 text-muted-foreground/40" />
    </div>
    <div className="text-center">
      <h2 className="text-lg font-semibold text-foreground">{title}</h2>
      <p className="text-sm text-muted-foreground mt-1">Coming soon</p>
    </div>
  </div>
);

const panelMap: Record<string, { title: string; icon: any }> = {
  history: { title: "Request History", icon: History },
  environments: { title: "Environments", icon: Globe },
  mocks: { title: "Mock Servers", icon: FileCode },
  team: { title: "Team", icon: Users },
  settings: { title: "Settings", icon: Settings },
};

const Index = () => {
  const [activeTab, setActiveTab] = useState("api");
  const [loadedRequest, setLoadedRequest] = useState<SavedRequest | null>(null);

  const handleLoadRequest = useCallback((req: SavedRequest) => {
    setLoadedRequest(req);
    setActiveTab("api");
  }, []);

  return (
    <div className="flex h-screen w-full overflow-hidden bg-background">
      <AppSidebar activeTab={activeTab} onTabChange={setActiveTab} />
      <motion.main
        key={activeTab}
        initial={{ opacity: 0, y: 6 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.15 }}
        className="flex-1 overflow-hidden"
      >
        {activeTab === "api" ? (
          <RequestBuilder
            initialRequest={loadedRequest}
            onRequestLoaded={() => setLoadedRequest(null)}
          />
        ) : activeTab === "loadtest" ? (
          <LoadTesting />
        ) : activeTab === "collections" ? (
          <Collections onLoadRequest={handleLoadRequest} />
        ) : (
          <PlaceholderPanel
            {...(panelMap[activeTab] || { title: "Unknown", icon: Settings })}
          />
        )}
      </motion.main>
    </div>
  );
};

export default Index;
