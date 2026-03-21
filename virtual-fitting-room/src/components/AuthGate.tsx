"use client";

import { useState, useEffect, createContext, useContext } from "react";
import { motion, AnimatePresence } from "framer-motion";

interface AuthContextType {
  isAuthed: boolean;
  logout: () => void;
}

const AuthContext = createContext<AuthContextType>({ isAuthed: false, logout: () => {} });

export function useAuth() {
  return useContext(AuthContext);
}

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [isAuthed, setIsAuthed] = useState(false);
  const [checking, setChecking] = useState(true);
  const [pin, setPin] = useState("");
  const [error, setError] = useState("");
  const [mode, setMode] = useState<"login" | "setup">("login");

  useEffect(() => {
    const stored = localStorage.getItem("mirror_pin");
    const session = sessionStorage.getItem("mirror_session");
    if (!stored) {
      setMode("setup");
      setChecking(false);
    } else if (session === "active") {
      setIsAuthed(true);
      setChecking(false);
    } else {
      setChecking(false);
    }
  }, []);

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (pin.length < 4) {
      setError("PIN must be at least 4 digits");
      return;
    }

    if (mode === "setup") {
      localStorage.setItem("mirror_pin", pin);
      sessionStorage.setItem("mirror_session", "active");
      setIsAuthed(true);
    } else {
      const stored = localStorage.getItem("mirror_pin");
      if (pin === stored) {
        sessionStorage.setItem("mirror_session", "active");
        setIsAuthed(true);
      } else {
        setError("Wrong PIN");
        setPin("");
      }
    }
  }

  function logout() {
    sessionStorage.removeItem("mirror_session");
    setIsAuthed(false);
    setPin("");
  }

  if (checking) return null;

  return (
    <AuthContext.Provider value={{ isAuthed, logout }}>
      <AnimatePresence mode="wait">
        {isAuthed ? (
          <motion.div
            key="app"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ duration: 0.4 }}
          >
            {children}
          </motion.div>
        ) : (
          <motion.div
            key="auth"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="min-h-screen flex items-center justify-center px-6"
            style={{ background: "var(--bg-base)" }}
          >
            <motion.div
              initial={{ opacity: 0, y: 30 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ type: "spring", stiffness: 300, damping: 30, delay: 0.1 }}
              className="w-full max-w-sm"
            >
              <div className="text-center mb-10">
                <motion.h1
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.2 }}
                  className="text-3xl tracking-[0.4em] uppercase font-extralight mb-3"
                  style={{ color: "var(--text-primary)" }}
                >
                  mirror
                </motion.h1>
                <motion.p
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  transition={{ delay: 0.4 }}
                  className="text-sm font-light"
                  style={{ color: "var(--text-tertiary)" }}
                >
                  {mode === "setup" ? "Create a PIN to get started" : "Enter your PIN"}
                </motion.p>
              </div>

              <form onSubmit={handleSubmit}>
                <motion.div
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.3 }}
                >
                  <input
                    type="password"
                    inputMode="numeric"
                    pattern="[0-9]*"
                    value={pin}
                    onChange={(e) => {
                      setPin(e.target.value.replace(/\D/g, ""));
                      setError("");
                    }}
                    placeholder={mode === "setup" ? "Choose a 4+ digit PIN" : "Enter PIN"}
                    maxLength={8}
                    autoFocus
                    className="w-full text-center text-2xl tracking-[0.5em] py-4 rounded-[var(--radius-lg)] transition-all"
                    style={{
                      background: "var(--bg-surface)",
                      border: `1px solid ${error ? "var(--error)" : "var(--border-default)"}`,
                      color: "var(--text-primary)",
                      caretColor: "var(--accent)",
                    }}
                  />
                </motion.div>

                {error && (
                  <motion.p
                    initial={{ opacity: 0, y: -5 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="text-xs text-center mt-3"
                    style={{ color: "var(--error)" }}
                  >
                    {error}
                  </motion.p>
                )}

                <motion.button
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.4 }}
                  whileHover={{ scale: 1.02 }}
                  whileTap={{ scale: 0.98 }}
                  type="submit"
                  className="w-full mt-6 py-3.5 rounded-[var(--radius-md)] text-sm font-semibold tracking-wider uppercase transition-all"
                  style={{
                    background: "var(--accent)",
                    color: "#0A0A09",
                  }}
                >
                  {mode === "setup" ? "Set PIN" : "Unlock"}
                </motion.button>
              </form>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </AuthContext.Provider>
  );
}
