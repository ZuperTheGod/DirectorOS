import { ReactNode } from "react";
import { Link, useLocation } from "wouter";
import { motion } from "framer-motion";
import {
  Clapperboard,
  LayoutTemplate,
  Image as ImageIcon,
  Video,
  Scissors,
  AudioWaveform,
  Home,
  Menu,
  Brain,
  Settings
} from "lucide-react";
import { cn } from "@/lib/utils";
import { useGetProject } from "@workspace/api-client-react";

interface ShellProps {
  children: ReactNode;
}

export function Shell({ children }: ShellProps) {
  const [location] = useLocation();
  const projectIdMatch = location.match(/\/projects\/(\d+)/);
  const projectId = projectIdMatch ? parseInt(projectIdMatch[1]) : null;

  const { data: project } = useGetProject(projectId || 0, {
    query: { enabled: !!projectId }
  });

  const navItems = [
    { href: "/", icon: Home, label: "Projects", exact: true },
    ...(projectId ? [
      { href: `/projects/${projectId}/director`, icon: Brain, label: "AI Director", exact: false },
      { href: `/projects/${projectId}/storyboard`, icon: LayoutTemplate, label: "Storyboard", exact: false },
      { href: `/projects/${projectId}/image-studio`, icon: ImageIcon, label: "Image Studio", exact: false },
      { href: `/projects/${projectId}/video-studio`, icon: Video, label: "Video Studio", exact: false },
      { href: `/projects/${projectId}/editor`, icon: Scissors, label: "Editor", exact: false },
      { href: `/projects/${projectId}/audio`, icon: AudioWaveform, label: "Audio Studio", exact: false },
    ] : []),
    { href: "/settings", icon: Settings, label: "AI Services", exact: true },
  ];

  const currentNavItem = navItems.find(item => 
    item.exact ? location === item.href : location.startsWith(item.href)
  );

  return (
    <div className="flex h-screen w-full overflow-hidden bg-background">
      {/* Sidebar */}
      <aside className="w-20 border-r border-border bg-card/50 backdrop-blur-xl flex flex-col items-center py-6 z-20 flex-shrink-0">
        <div className="mb-8 flex items-center justify-center">
          <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-primary to-blue-600 flex items-center justify-center shadow-glow">
            <Clapperboard className="w-5 h-5 text-white" />
          </div>
        </div>
        
        <nav className="flex flex-col gap-4 w-full px-4">
          {navItems.map((item) => {
            const isActive = item.exact ? location === item.href : location.startsWith(item.href);
            return (
              <Link key={item.href} href={item.href}>
                <div
                  className={cn(
                    "relative group flex items-center justify-center w-12 h-12 rounded-2xl cursor-pointer transition-all duration-300",
                    isActive 
                      ? "bg-primary/20 text-primary shadow-[inset_0_0_20px_rgba(139,92,246,0.2)]" 
                      : "text-muted-foreground hover:bg-white/5 hover:text-foreground"
                  )}
                  title={item.label}
                >
                  <item.icon className="w-5 h-5" />
                  {isActive && (
                    <motion.div 
                      layoutId="active-nav"
                      className="absolute left-0 w-1 h-8 bg-primary rounded-r-full"
                      initial={false}
                      transition={{ type: "spring", stiffness: 300, damping: 30 }}
                    />
                  )}
                </div>
              </Link>
            );
          })}
        </nav>
      </aside>

      {/* Main Content */}
      <main className="flex-1 flex flex-col min-w-0 overflow-hidden relative">
        {/* Top bar */}
        <header className="h-16 border-b border-border bg-background/80 backdrop-blur-md flex items-center px-8 z-10 flex-shrink-0 justify-between">
          <div className="flex items-center gap-4">
            <h1 className="text-xl font-display font-semibold flex items-center gap-3">
              {project ? (
                <>
                  <span className="text-muted-foreground">{project.name}</span>
                  <span className="text-muted-foreground/30">/</span>
                  <span className="text-foreground">{currentNavItem?.label || "Workspace"}</span>
                </>
              ) : (
                <span className="text-foreground">{currentNavItem?.label || "DirectorOS"}</span>
              )}
            </h1>
          </div>
          
          <div className="flex items-center gap-4">
            <div className="w-8 h-8 rounded-full bg-secondary border border-border flex items-center justify-center">
              <span className="text-xs font-bold text-muted-foreground">DR</span>
            </div>
          </div>
        </header>

        {/* Page Content */}
        <div className="flex-1 overflow-auto relative">
          {children}
        </div>
      </main>
    </div>
  );
}
