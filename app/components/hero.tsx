"use client";

import React from "react";
import Link from "next/link";
import { Sparkles, Users, Zap, Shield } from "lucide-react";
import { Button } from "@/components/ui/button";
import { ThemeToggle } from "./theme-toggle";

export function Hero() {
  return (
    <div className="relative min-h-screen flex flex-col items-center justify-center overflow-hidden bg-background text-foreground selection:bg-primary selection:text-primary-foreground p-4 transition-colors duration-300">
      {/* Theme Toggle */}
      <div className="absolute top-4 right-4 z-50">
        <ThemeToggle />
      </div>

      {/* Animated Background Gradients */}
      <div className="absolute top-[-20%] left-[-10%] w-[500px] h-[500px] bg-purple-600/20 dark:bg-purple-600/30 rounded-full blur-[120px] animate-pulse" />
      <div className="absolute bottom-[-20%] right-[-10%] w-[500px] h-[500px] bg-blue-600/20 dark:bg-blue-600/30 rounded-full blur-[120px] animate-pulse delay-1000" />

      {/* Grid Pattern Overlay */}
      <div className="absolute inset-0 bg-[linear-gradient(to_right,#80808012_1px,transparent_1px),linear-gradient(to_bottom,#80808012_1px,transparent_1px)] bg-[size:24px_24px]" />

      <div className="container relative z-10 px-4 md:px-6 text-center">
        <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-muted/50 border border-border backdrop-blur-md mb-8 animate-in fade-in slide-in-from-bottom-4 duration-1000">
          <Sparkles className="w-4 h-4 text-yellow-500 dark:text-yellow-400" />
          <span className="text-sm font-medium text-muted-foreground">
            The Future of Collaboration
          </span>
        </div>

        <div className="mb-6 animate-in fade-in slide-in-from-bottom-6 duration-1000 delay-50">
          <h2 className="text-2xl font-bold text-foreground tracking-widest uppercase opacity-80">
            Doodle
          </h2>
        </div>

        <h1 className="text-5xl md:text-7xl font-bold tracking-tight mb-6 bg-clip-text text-transparent bg-gradient-to-b from-foreground to-foreground/40 animate-in fade-in slide-in-from-bottom-8 duration-1000 delay-100">
          Think Together, <br />
          <span className="text-foreground">Build Faster.</span>
        </h1>

        <p className="text-lg md:text-xl text-muted-foreground max-w-2xl mx-auto mb-10 animate-in fade-in slide-in-from-bottom-8 duration-1000 delay-200">
          A real-time collaborative whiteboard with AI superpowers. Sketch,
          plan, and brainstorm with your team in infinite space.
        </p>

        <div className="flex flex-col sm:flex-row items-center justify-center gap-4 animate-in fade-in slide-in-from-bottom-8 duration-1000 delay-300">
          <Link href="/signup">
            <Button
              size="lg"
              className="h-12 px-8 text-base rounded-full bg-foreground text-background hover:bg-foreground/90 transition-all hover:scale-105"
            >
              Get Started Free
            </Button>
          </Link>
          <Link href="/login">
            <Button
              variant="outline"
              size="lg"
              className="h-12 px-8 text-base rounded-full border-border bg-background/50 hover:bg-accent hover:text-accent-foreground backdrop-blur-sm transition-all hover:scale-105"
            >
              Login
            </Button>
          </Link>
        </div>
      </div>

      {/* Feature Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mt-20 max-w-5xl mx-auto animate-in fade-in slide-in-from-bottom-12 duration-1000 delay-500">
        <FeatureCard
          icon={<Users className="w-6 h-6 text-blue-500 dark:text-blue-400" />}
          title="Real-time Sync"
          description="Collaborate with your team instantly. See cursors and edits live."
        />
        <FeatureCard
          icon={
            <Zap className="w-6 h-6 text-purple-500 dark:text-purple-400" />
          }
          title="AI Powered"
          description="Generate diagrams and summaries with advanced AI integration."
        />
        <FeatureCard
          icon={
            <Shield className="w-6 h-6 text-green-500 dark:text-green-400" />
          }
          title="Secure & Private"
          description="Enterprise-grade security for your most important ideas."
        />
      </div>
    </div>
  );
}

function FeatureCard({
  icon,
  title,
  description,
}: {
  icon: React.ReactNode;
  title: string;
  description: string;
}) {
  return (
    <div className="p-6 rounded-2xl bg-card border border-border backdrop-blur-md hover:bg-accent/50 transition-colors text-left group shadow-sm dark:shadow-none">
      <div className="mb-4 p-3 rounded-xl bg-muted w-fit group-hover:scale-110 transition-transform duration-300">
        {icon}
      </div>
      <h3 className="text-xl font-semibold mb-2 text-card-foreground">
        {title}
      </h3>
      <p className="text-muted-foreground">{description}</p>
    </div>
  );
}
