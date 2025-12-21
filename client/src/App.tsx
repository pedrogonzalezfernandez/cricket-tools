import { Switch, Route } from "wouter";
import { queryClient } from "./lib/queryClient";
import { QueryClientProvider } from "@tanstack/react-query";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import Landing from "@/pages/landing";
import Player from "@/pages/player";
import Conductor from "@/pages/conductor";
import Mp3Conductor from "@/pages/mp3-conductor";
import Mp3Player from "@/pages/mp3-player";
import NotFound from "@/pages/not-found";

function Router() {
  return (
    <Switch>
      <Route path="/" component={Landing} />
      <Route path="/player" component={Player} />
      <Route path="/conductor" component={Conductor} />
      <Route path="/tool/mp3sync" component={Mp3Conductor} />
      <Route path="/player/mp3sync" component={Mp3Player} />
      <Route component={NotFound} />
    </Switch>
  );
}

function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <TooltipProvider>
        <Toaster />
        <Router />
      </TooltipProvider>
    </QueryClientProvider>
  );
}

export default App;
