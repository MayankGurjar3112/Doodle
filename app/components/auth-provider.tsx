"use client";

import React, { createContext, useContext, useEffect, useState } from "react";
import {
  User,
  onAuthStateChanged,
  signInWithPopup,
  signInWithEmailAndPassword,
  createUserWithEmailAndPassword,
  signOut as firebaseSignOut,
  sendSignInLinkToEmail,
  isSignInWithEmailLink,
  signInWithEmailLink,
} from "firebase/auth";
import { auth, googleProvider } from "@/lib/firebase";
import { useRouter } from "next/navigation";
import Cookies from "js-cookie";

interface AuthContextType {
  user: User | null; // Type as Firebase User for compatibility, or a custom union
  loading: boolean;
  isDummy: boolean;
  signInWithGoogle: () => Promise<void>;
  signInWithEmail: (email: string, pass: string) => Promise<void>;
  signUpWithEmail: (email: string, pass: string) => Promise<void>;
  signInWithMagicLink: (email: string) => Promise<void>;
  completeMagicLinkLogin: () => Promise<void>;
  loginDummy: (role: "user" | "admin") => void;
  logout: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

// Dummy Users
const DUMMY_USER = {
  uid: "dummy-user-123",
  email: "demo@doodle.com",
  displayName: "Demo User",
  photoURL: "https://api.dicebear.com/7.x/avataaars/svg?seed=Felix",
  emailVerified: true,
} as User;

const DUMMY_ADMIN = {
  uid: "dummy-admin-123",
  email: "admin@doodle.com",
  displayName: "Admin User",
  photoURL: "https://api.dicebear.com/7.x/avataaars/svg?seed=Aneka",
  emailVerified: true,
} as User;

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const [isDummy, setIsDummy] = useState(false);
  const router = useRouter();

  useEffect(() => {
    // Check for dummy session first
    const dummySession = localStorage.getItem("doodle_dummy_user");
    if (dummySession) {
      // Wrap in setTimeout to avoid synchronous state updates
      setTimeout(() => {
        setUser(JSON.parse(dummySession));
        setIsDummy(true);
        setLoading(false);
      }, 0);
    }

    // Listen for real Firebase auth
    const unsubscribe = onAuthStateChanged(auth, (currentUser) => {
      // If dummy session is active, ignore firebase updates
      if (localStorage.getItem("doodle_dummy_user")) {
        return;
      }

      setUser(currentUser);
      setLoading(false);
      if (currentUser) {
        // Set cookie for middleware
        Cookies.set("auth_token", "true", { expires: 7 });
      } else {
        Cookies.remove("auth_token");
      }
    });

    return () => unsubscribe();
  }, []);

  const signInWithGoogle = async () => {
    try {
      await signInWithPopup(auth, googleProvider);
      router.push("/");
    } catch (error) {
      console.error("Google Sign In Error", error);
      throw error;
    }
  };

  const signInWithEmail = async (email: string, pass: string) => {
    try {
      await signInWithEmailAndPassword(auth, email, pass);
      router.push("/");
    } catch (error) {
      console.error("Email Sign In Error", error);
      throw error;
    }
  };

  const signUpWithEmail = async (email: string, pass: string) => {
    try {
      await createUserWithEmailAndPassword(auth, email, pass);
      router.push("/");
    } catch (error) {
      console.error("Sign Up Error", error);
      throw error;
    }
  };

  const signInWithMagicLink = async (email: string) => {
    try {
      const actionCodeSettings = {
        url: window.location.origin + "/login?verify=true",
        handleCodeInApp: true,
      };
      await sendSignInLinkToEmail(auth, email, actionCodeSettings);
      window.localStorage.setItem("emailForSignIn", email);
      alert("Check your email for the login link!");
    } catch (error) {
      console.error("Magic Link Error", error);
      throw error;
    }
  };

  const completeMagicLinkLogin = async () => {
    if (isSignInWithEmailLink(auth, window.location.href)) {
      let email = window.localStorage.getItem("emailForSignIn");
      if (!email) {
        email = window.prompt("Please provide your email for confirmation");
      }
      if (email) {
        try {
          await signInWithEmailLink(auth, email, window.location.href);
          window.localStorage.removeItem("emailForSignIn");
          router.push("/");
        } catch (error) {
          console.error("Magic Link Verification Error", error);
        }
      }
    }
  };

  const loginDummy = (role: "user" | "admin") => {
    const dummy = role === "admin" ? DUMMY_ADMIN : DUMMY_USER;
    localStorage.setItem("doodle_dummy_user", JSON.stringify(dummy));
    Cookies.set("auth_token", "dummy", { expires: 7 });
    setUser(dummy);
    setIsDummy(true);
    router.push("/");
  };

  const logout = async () => {
    if (isDummy) {
      localStorage.removeItem("doodle_dummy_user");
      setIsDummy(false);
      setUser(null);
    } else {
      await firebaseSignOut(auth);
    }
    Cookies.remove("auth_token");
    router.push("/login");
  };

  return (
    <AuthContext.Provider
      value={{
        user,
        loading,
        isDummy,
        signInWithGoogle,
        signInWithEmail,
        signUpWithEmail,
        signInWithMagicLink,
        completeMagicLinkLogin,
        loginDummy,
        logout,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error("useAuth must be used within an AuthProvider");
  }
  return context;
};
