"use client";

import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { Loader2 } from "lucide-react";

interface AuthGuardProps {
  children: React.ReactNode;
  allowedRoles?: ("ADMIN" | "COACH" | "CUSTOMER")[];
}

export function AuthGuard({ children, allowedRoles }: AuthGuardProps) {
  const router = useRouter();
  const [isChecking, setIsChecking] = useState(true);
  const [isAuthorized, setIsAuthorized] = useState(false);

  useEffect(() => {
    const checkAuth = () => {
      // Check for access token
      const accessToken = localStorage.getItem("accessToken");
      const authStorage = localStorage.getItem("auth-storage");

      if (!accessToken || !authStorage) {
        console.log("No auth credentials found, redirecting to login");
        router.push("/login");
        return;
      }

      try {
        const auth = JSON.parse(authStorage);
        if (!auth?.state?.isAuthenticated) {
          console.log("Not authenticated, redirecting to login");
          router.push("/login");
          return;
        }

        const userRole = auth?.state?.user?.role;

        // Check role permissions if specified
        if (allowedRoles && userRole) {
          if (!allowedRoles.includes(userRole)) {
            // Redirect to appropriate dashboard
            if (userRole === "ADMIN") {
              router.push("/admin");
            } else if (userRole === "COACH") {
              router.push("/coach");
            } else {
              router.push("/dashboard");
            }
            return;
          }
        }

        // All checks passed
        setIsAuthorized(true);
        setIsChecking(false);
      } catch (e) {
        console.error("Auth check failed:", e);
        router.push("/login");
      }
    };

    // Give time for zustand to hydrate from localStorage
    const timeout = setTimeout(checkAuth, 50);
    return () => clearTimeout(timeout);
  }, [router, allowedRoles]);

  if (isChecking || !isAuthorized) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-muted/30">
        <div className="flex flex-col items-center gap-4">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
          <p className="text-muted-foreground">Loading...</p>
        </div>
      </div>
    );
  }

  return <>{children}</>;
}
