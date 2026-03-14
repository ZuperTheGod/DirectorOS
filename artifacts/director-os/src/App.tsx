import { Switch, Route, Router as WouterRouter } from "wouter";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";

// Layouts & Pages
import { Shell } from "@/components/layout/Shell";
import Home from "@/pages/Home";
import Director from "@/pages/Director";
import Storyboard from "@/pages/Storyboard";
import ImageStudio from "@/pages/ImageStudio";
import VideoStudio from "@/pages/VideoStudio";
import Editor from "@/pages/Editor";
import AudioStudio from "@/pages/Audio";
import NotFound from "@/pages/not-found";

const queryClient = new QueryClient();

function Router() {
  return (
    <Shell>
      <Switch>
        <Route path="/" component={Home} />
        
        {/* Project Specific Routes */}
        <Route path="/projects/:id/director" component={Director} />
        <Route path="/projects/:id/storyboard" component={Storyboard} />
        <Route path="/projects/:id/image-studio/:shotId" component={ImageStudio} />
        <Route path="/projects/:id/image-studio" component={ImageStudio} />
        <Route path="/projects/:id/video-studio/:shotId" component={VideoStudio} />
        <Route path="/projects/:id/video-studio" component={VideoStudio} />
        <Route path="/projects/:id/editor" component={Editor} />
        <Route path="/projects/:id/audio" component={AudioStudio} />
        
        {/* Fallback to Home for bare project route */}
        <Route path="/projects/:id">
          {(params) => {
            // Can't use hooks directly in render prop, standard redirect pattern
            window.location.replace(`/projects/${params.id}/director`);
            return null;
          }}
        </Route>

        <Route component={NotFound} />
      </Switch>
    </Shell>
  );
}

function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <TooltipProvider>
        <WouterRouter base={import.meta.env.BASE_URL.replace(/\/$/, "")}>
          <Router />
        </WouterRouter>
        <Toaster />
      </TooltipProvider>
    </QueryClientProvider>
  );
}

export default App;
