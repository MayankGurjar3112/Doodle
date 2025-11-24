"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { useAuth } from "@/app/components/auth-provider";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Separator } from "@/components/ui/separator";
import { Chrome, Mail, ArrowRight, Sparkles } from "lucide-react";

export default function LoginPage() {
  const {
    signInWithGoogle,
    signInWithEmail,
    signInWithMagicLink,
    completeMagicLinkLogin,
    loginDummy,
    loading,
  } = useAuth();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [magicLinkEmail, setMagicLinkEmail] = useState("");
  const [isLoading, setIsLoading] = useState(false);

  useEffect(() => {
    completeMagicLinkLogin();
  }, []);

  const handleGoogleLogin = async () => {
    setIsLoading(true);
    try {
      await signInWithGoogle();
    } catch (error) {
      console.error(error);
    } finally {
      setIsLoading(false);
    }
  };

  const handleEmailLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    try {
      await signInWithEmail(email, password);
    } catch (error) {
      console.error(error);
      alert("Login failed. Please check your credentials.");
    } finally {
      setIsLoading(false);
    }
  };

  const handleMagicLink = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    try {
      await signInWithMagicLink(magicLinkEmail);
    } catch (error) {
      console.error(error);
    } finally {
      setIsLoading(false);
    }
  };

  if (loading) return null;

  return (
    <div className="min-h-screen flex items-center justify-center bg-black relative overflow-hidden p-4">
      {/* Animated Background */}
      <div className="absolute top-[-20%] left-[-10%] w-[500px] h-[500px] bg-purple-600/20 rounded-full blur-[120px] animate-pulse" />
      <div className="absolute bottom-[-20%] right-[-10%] w-[500px] h-[500px] bg-blue-600/20 rounded-full blur-[120px] animate-pulse delay-1000" />
      <div className="absolute inset-0 bg-[linear-gradient(to_right,#80808012_1px,transparent_1px),linear-gradient(to_bottom,#80808012_1px,transparent_1px)] bg-[size:24px_24px]" />

      <Card className="w-full max-w-md glass border-white/10 bg-black/40 backdrop-blur-xl text-white relative z-10">
        <CardHeader className="space-y-1 text-center">
          <div className="flex justify-center mb-4">
            <div className="p-3 rounded-full bg-white/10 border border-white/20">
              <Sparkles className="w-6 h-6 text-white" />
            </div>
          </div>
          <CardTitle className="text-2xl font-bold">Welcome back</CardTitle>
          <CardDescription className="text-gray-400">
            Sign in to continue to Doodle
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <Tabs defaultValue="email" className="w-full">
            <TabsList className="grid w-full grid-cols-2 bg-white/5 border border-white/10">
              <TabsTrigger
                value="email"
                className="data-[state=active]:bg-white/10 data-[state=active]:text-white text-gray-400"
              >
                Password
              </TabsTrigger>
              <TabsTrigger
                value="magic"
                className="data-[state=active]:bg-white/10 data-[state=active]:text-white text-gray-400"
              >
                Magic Link
              </TabsTrigger>
            </TabsList>

            <TabsContent value="email">
              <form onSubmit={handleEmailLogin} className="space-y-4 mt-4">
                <div className="space-y-2">
                  <Input
                    type="email"
                    placeholder="Email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    className="bg-white/5 border-white/10 text-white placeholder:text-gray-500 focus-visible:ring-white/20"
                    required
                  />
                </div>
                <div className="space-y-2">
                  <Input
                    type="password"
                    placeholder="Password"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    className="bg-white/5 border-white/10 text-white placeholder:text-gray-500 focus-visible:ring-white/20"
                    required
                  />
                </div>
                <Button
                  type="submit"
                  className="w-full bg-white text-black hover:bg-gray-200"
                  disabled={isLoading}
                >
                  {isLoading ? "Signing in..." : "Sign In"}
                </Button>
              </form>
            </TabsContent>

            <TabsContent value="magic">
              <form onSubmit={handleMagicLink} className="space-y-4 mt-4">
                <div className="space-y-2">
                  <Input
                    type="email"
                    placeholder="Email for Magic Link"
                    value={magicLinkEmail}
                    onChange={(e) => setMagicLinkEmail(e.target.value)}
                    className="bg-white/5 border-white/10 text-white placeholder:text-gray-500 focus-visible:ring-white/20"
                    required
                  />
                </div>
                <Button
                  type="submit"
                  className="w-full bg-white text-black hover:bg-gray-200"
                  disabled={isLoading}
                >
                  {isLoading ? "Sending..." : "Send Magic Link"}
                  <Mail className="ml-2 w-4 h-4" />
                </Button>
              </form>
            </TabsContent>
          </Tabs>

          <div className="relative">
            <div className="absolute inset-0 flex items-center">
              <span className="w-full border-t border-white/10" />
            </div>
            <div className="relative flex justify-center text-xs uppercase">
              <span className="bg-black/40 px-2 text-gray-500">
                Or continue with
              </span>
            </div>
          </div>

          <Button
            variant="outline"
            onClick={handleGoogleLogin}
            className="w-full border-white/10 bg-white/5 hover:bg-white/10 text-white"
            disabled={isLoading}
          >
            <Chrome className="mr-2 w-4 h-4" />
            Google
          </Button>

          <div className="mt-6 p-4 rounded-lg bg-white/5 border border-white/10">
            <p className="text-xs text-gray-400 mb-3 text-center">
              Offline Demo Mode
            </p>
            <div className="grid grid-cols-2 gap-2">
              <Button
                variant="ghost"
                size="sm"
                onClick={() => loginDummy("user")}
                className="text-xs text-gray-300 hover:text-white hover:bg-white/10"
              >
                User Demo
              </Button>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => loginDummy("admin")}
                className="text-xs text-gray-300 hover:text-white hover:bg-white/10"
              >
                Admin Demo
              </Button>
            </div>
          </div>
        </CardContent>
        <CardFooter className="justify-center">
          <p className="text-sm text-gray-400">
            Don&apos;t have an account?{" "}
            <Link href="/signup" className="text-white hover:underline">
              Sign up
            </Link>
          </p>
        </CardFooter>
      </Card>
    </div>
  );
}
