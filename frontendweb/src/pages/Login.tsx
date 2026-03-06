import React, { useState } from "react";
import { useNavigate } from "react-router-dom";
import { useAuthStore } from "@/store/authStore";
import { Button } from "@/components/common/Button";
import { Mail, Lock, Eye, EyeOff } from "lucide-react";

const Login: React.FC = () => {
  const navigate = useNavigate();
  const { login } = useAuthStore();
  const [email, setEmail] = useState("admin@warehouse.ai");
  const [password, setPassword] = useState("demo123");
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    try {
      // Use email as the dev token (backend accepts any Bearer token in dev mode)
      const devToken = email.replace("@", "-at-");

      // Call the real auth endpoint to create/get user
      const res = await fetch("/api/v1/auth/me", {
        headers: { Authorization: `Bearer ${devToken}` },
      });

      if (res.ok) {
        const userData = await res.json();
        login(
          {
            id: userData.id,
            firebaseUid: userData.firebase_uid,
            email: userData.email,
            name: userData.name || email.split("@")[0],
            role: userData.role || "admin",
            orgId: userData.org_id,
            preferences: userData.preferences || {},
            createdAt: userData.created_at,
          },
          devToken
        );
      } else {
        // Fallback to local mock if backend unavailable
        login(
          {
            id: "user-1",
            firebaseUid: devToken,
            email,
            name: "Alex Martinez",
            role: "admin",
            orgId: "org-1",
            preferences: {},
            createdAt: new Date().toISOString(),
          },
          devToken
        );
      }

      navigate("/dashboard");
    } catch {
      // Fallback for offline dev
      login(
        {
          id: "user-1",
          firebaseUid: "dev-user",
          email,
          name: "Alex Martinez",
          role: "admin",
          orgId: "org-1",
          preferences: {},
          createdAt: new Date().toISOString(),
        },
        "dev-user"
      );
      navigate("/dashboard");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-background flex items-center justify-center p-4">
      {/* Background effects */}
      <div className="fixed inset-0 pointer-events-none">
        <div className="absolute top-1/4 left-1/4 w-96 h-96 bg-accent/5 rounded-full blur-[120px]" />
        <div className="absolute bottom-1/4 right-1/4 w-96 h-96 bg-critical/5 rounded-full blur-[120px]" />
      </div>

      <div className="relative w-full max-w-md">
        {/* Brand */}
        <div className="text-center mb-8">
          <div className="inline-flex items-center gap-3 mb-4">
            <div className="w-10 h-10 rounded-button bg-accent/10 flex items-center justify-center">
              <div className="w-4 h-4 rounded-full bg-accent shadow-[0_0_15px_rgba(0,255,178,0.5)]" />
            </div>
            <span className="text-2xl font-bold text-text-primary tracking-tight font-display">
              WareHouse <span className="text-accent">AI</span>
            </span>
          </div>
          <p className="text-sm text-text-secondary">
            Warehouse Intelligence Platform
          </p>
        </div>

        {/* Login card */}
        <div className="bg-surface border border-border rounded-card p-8">
          <h1 className="text-xl font-bold text-text-primary mb-1 font-display">
            Welcome back
          </h1>
          <p className="text-sm text-text-muted mb-6">
            Sign in to your account to continue
          </p>

          <form onSubmit={handleSubmit} className="space-y-4">
            {/* Email */}
            <div className="space-y-2">
              <label className="text-xs font-medium text-text-secondary uppercase tracking-wider">
                Email
              </label>
              <div className="relative">
                <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-text-muted" />
                <input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="w-full pl-10 pr-4 py-2.5 bg-surface-elevated border border-border rounded-button text-sm text-text-primary placeholder:text-text-muted focus:outline-none focus:border-accent/40 transition-colors"
                  placeholder="you@company.com"
                  required
                />
              </div>
            </div>

            {/* Password */}
            <div className="space-y-2">
              <label className="text-xs font-medium text-text-secondary uppercase tracking-wider">
                Password
              </label>
              <div className="relative">
                <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-text-muted" />
                <input
                  type={showPassword ? "text" : "password"}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="w-full pl-10 pr-10 py-2.5 bg-surface-elevated border border-border rounded-button text-sm text-text-primary placeholder:text-text-muted focus:outline-none focus:border-accent/40 transition-colors"
                  placeholder="Enter password"
                  required
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-text-muted hover:text-text-primary transition-colors"
                >
                  {showPassword ? (
                    <EyeOff className="w-4 h-4" />
                  ) : (
                    <Eye className="w-4 h-4" />
                  )}
                </button>
              </div>
            </div>

            {/* Submit */}
            <Button
              type="submit"
              variant="primary"
              size="lg"
              loading={loading}
              className="w-full mt-6"
            >
              Sign In
            </Button>
          </form>

          <div className="mt-6 text-center">
            <p className="text-sm text-text-muted">
              Don't have an account?{" "}
              <button className="text-accent hover:text-accent/80 font-medium transition-colors">
                Sign up
              </button>
            </p>
          </div>
        </div>

        <p className="text-center text-xs text-text-muted mt-6">
          Powered by NVIDIA Cosmos Reason 2
        </p>
      </div>
    </div>
  );
};

export default Login;
