"use client";

import { useAuth } from "@/app/components/auth-provider";
import { Hero } from "@/app/components/hero";
import { DashboardView } from "@/app/components/dashboard-view";

export default function Page() {
  const { user, loading } = useAuth();

  if (loading) {
    return (
      <div className="min-h-screen bg-black flex items-center justify-center">
        <div className="animate-spin rounded-full h-8 w-8 border-t-2 border-b-2 border-white"></div>
      </div>
    );
  }

  if (!user) {
    return <Hero />;
  }

  return <DashboardView />;
}
