"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { api } from "@/lib/api";
import { tokenStore } from "@/lib/tokenStore";
import toast from "react-hot-toast";

export function useAuth() {
  const router = useRouter();
  const [isLoading, setIsLoading] = useState(false);

  const login = async (email: string, password: string) => {
    setIsLoading(true);
    try {
      const { data } = await api.post("/auth/login", { email, password });
      tokenStore.set(data.access_token);
      router.push("/dashboard");
    } catch {
      // error toast handled by axios interceptor
    } finally {
      setIsLoading(false);
    }
  };

  const register = async (name: string, email: string, password: string) => {
    setIsLoading(true);
    try {
      const { data } = await api.post("/auth/register", { name, email, password });
      tokenStore.set(data.access_token);
      toast.success("Account created! Welcome to Content Mirror.");
      router.push("/dashboard");
    } catch {
      // error toast handled by axios interceptor
    } finally {
      setIsLoading(false);
    }
  };

  const logout = async () => {
    try {
      await api.post("/auth/logout");
    } finally {
      tokenStore.clear();
      router.push("/login");
    }
  };

  return { login, register, logout, isLoading };
}
