import { useState, useCallback } from "react";
import { AppSidebar } from "@/components/AppSidebar";
import { RequestBuilder } from "@/components/RequestBuilder";
import { LoadTesting } from "@/components/LoadTesting";
import { Collections } from "@/components/Collections";
// import { CommandPalette } from "@/components/CommandPalette";
// import { RequestHistory } from "@/components/RequestHistory";
// import { SettingsPage } from "@/components/SettingsPage";
// import { MockServers } from "@/components/MockServers";
import type { SavedRequest } from "@/components/Collections";
import { motion } from "framer-motion";
import { Globe, Users, Settings } from "lucide-react";

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
  environments: { title: "Environments", icon: Globe },
  team: { title: "Team", icon: Users },
};

const Index = () => {
  const [activeTab, setActiveTab] = useState("api");
  const [loadedRequest, setLoadedRequest] = useState<SavedRequest | null>(null);
  const [loadTestRequest, setLoadTestRequest] = useState<SavedRequest | null>(
    null,
  );

  const handleLoadRequest = useCallback((req: SavedRequest) => {
    setLoadedRequest(req);
    setActiveTab("api");
  }, []);

  const handleLoadToLoadTest = useCallback((req: SavedRequest) => {
    setLoadTestRequest(req);
    setActiveTab("loadtest");
  }, []);

  return (
    <div className="flex h-screen w-full overflow-hidden bg-background">
      {/* <CommandPalette
        onNavigate={setActiveTab}
        onLoadRequest={handleLoadRequest}
        onLoadToLoadTest={handleLoadToLoadTest}
      /> */}
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
        ) : (
          // ) : activeTab === "loadtest" ? (
          //   <LoadTesting
          //     initialRequest={loadTestRequest}
          //     onRequestLoaded={() => setLoadTestRequest(null)}
          //   />
          // ) : activeTab === "collections" ? (
          //   <Collections
          //     onLoadRequest={handleLoadRequest}
          //     onLoadToLoadTest={handleLoadToLoadTest}
          //   />
          // ) : activeTab === "history" ? (
          //   <RequestHistory
          //     onLoadRequest={handleLoadRequest}
          //     onLoadToLoadTest={handleLoadToLoadTest}
          //   />
          // ) : activeTab === "settings" ? (
          //   <SettingsPage />
          // ) : activeTab === "mocks" ? (
          //   <MockServers />
          <PlaceholderPanel
            {...(panelMap[activeTab] || { title: "Unknown", icon: Settings })}
          />
        )}
      </motion.main>
    </div>
  );
};

export default Index;
