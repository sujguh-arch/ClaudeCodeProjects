"use client";

import { useState, useEffect } from "react";
import { motion } from "framer-motion";
import Image from "next/image";
import { useToast } from "@/components/Toast";
import { useAuth } from "@/components/AuthGate";
import Link from "next/link";

export default function SettingsPage() {
  const { toast } = useToast();
  const { logout } = useAuth();
  const [refPhoto, setRefPhoto] = useState<string | null>(null);
  const [uploading, setUploading] = useState(false);
  const [newPin, setNewPin] = useState("");
  const [confirmPin, setConfirmPin] = useState("");

  useEffect(() => {
    fetch("/api/settings")
      .then((r) => r.json())
      .then((s) => setRefPhoto(s.referencePhoto));
  }, []);

  async function handlePhotoUpload(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    setUploading(true);
    const formData = new FormData();
    formData.append("referencePhoto", file);
    try {
      await fetch("/api/settings", { method: "POST", body: formData });
      const s = await (await fetch("/api/settings")).json();
      setRefPhoto(s.referencePhoto);
      toast("Reference photo updated", "success");
    } catch {
      toast("Failed to upload photo", "error");
    } finally {
      setUploading(false);
    }
  }

  function handlePinChange(e: React.FormEvent) {
    e.preventDefault();
    if (newPin.length < 4) {
      toast("PIN must be at least 4 digits", "error");
      return;
    }
    if (newPin !== confirmPin) {
      toast("PINs do not match", "error");
      return;
    }
    localStorage.setItem("mirror_pin", newPin);
    setNewPin("");
    setConfirmPin("");
    toast("PIN updated", "success");
  }

  const fadeUp = {
    initial: { opacity: 0, y: 15 },
    animate: { opacity: 1, y: 0 },
  };

  return (
    <main
      className="min-h-screen pb-24"
      style={{ paddingTop: "env(safe-area-inset-top, 0px)" }}
    >
      {/* Nav */}
      <nav
        className="sticky top-0 z-40 px-5 py-4 flex items-center justify-between backdrop-blur-xl"
        style={{
          background: "rgba(17,17,16,0.8)",
          borderBottom: "1px solid var(--border-subtle)",
        }}
      >
        <Link href="/">
          <motion.span
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.95 }}
            className="text-sm"
            style={{ color: "var(--accent)" }}
          >
            ← Back
          </motion.span>
        </Link>
        <h1
          className="tracking-[0.15em] uppercase"
          style={{ fontFamily: "var(--font-display)", fontSize: "var(--text-lg)", color: "var(--text-primary)" }}
        >
          Settings
        </h1>
        <div className="w-12" />
      </nav>

      <div className="max-w-lg mx-auto px-5 pt-8 space-y-8">
        {/* Reference Photo */}
        <motion.section
          {...fadeUp}
          transition={{ delay: 0.1 }}
          className="p-6 rounded-[var(--radius-xl)]"
          style={{
            background: "var(--bg-surface)",
            border: "1px solid var(--border-subtle)",
          }}
        >
          <h2
            className="text-xs uppercase tracking-[0.15em] font-semibold mb-4"
            style={{ color: "var(--text-tertiary)" }}
          >
            Reference Photo
          </h2>
          <div className="flex items-center gap-5">
            {refPhoto ? (
              <Image
                src={refPhoto}
                alt="Reference"
                width={80}
                height={80}
                className="rounded-full object-cover flex-shrink-0"
                style={{ border: "2px solid var(--accent-muted)", width: 80, height: 80 }}
              />
            ) : (
              <div
                className="w-20 h-20 rounded-full flex items-center justify-center flex-shrink-0"
                style={{
                  background: "var(--bg-elevated)",
                  border: "2px dashed var(--border-default)",
                }}
              >
                <span className="text-2xl opacity-40">+</span>
              </div>
            )}
            <div className="flex-1">
              <p className="text-sm mb-2" style={{ color: "var(--text-secondary)" }}>
                {refPhoto ? "Update your reference photo" : "Upload a clear face photo"}
              </p>
              <label>
                <motion.span
                  whileHover={{ scale: 1.03 }}
                  whileTap={{ scale: 0.97 }}
                  className="inline-block px-4 py-2 rounded-[var(--radius-md)] text-xs font-semibold cursor-pointer"
                  style={{
                    background: "var(--bg-elevated)",
                    color: "var(--text-primary)",
                    border: "1px solid var(--border-default)",
                  }}
                >
                  {uploading ? "Uploading..." : "Choose Photo"}
                </motion.span>
                <input
                  type="file"
                  accept="image/*"
                  className="hidden"
                  onChange={handlePhotoUpload}
                  disabled={uploading}
                />
              </label>
            </div>
          </div>
        </motion.section>

        {/* Change PIN */}
        <motion.section
          {...fadeUp}
          transition={{ delay: 0.2 }}
          className="p-6 rounded-[var(--radius-xl)]"
          style={{
            background: "var(--bg-surface)",
            border: "1px solid var(--border-subtle)",
          }}
        >
          <h2
            className="text-xs uppercase tracking-[0.15em] font-semibold mb-4"
            style={{ color: "var(--text-tertiary)" }}
          >
            Change PIN
          </h2>
          <form onSubmit={handlePinChange} className="space-y-3">
            <input
              type="password"
              inputMode="numeric"
              pattern="[0-9]*"
              value={newPin}
              onChange={(e) => setNewPin(e.target.value.replace(/\D/g, ""))}
              placeholder="New PIN"
              maxLength={8}
              className="w-full px-4 py-3 rounded-[var(--radius-md)] text-sm"
              style={{
                background: "var(--bg-elevated)",
                border: "1px solid var(--border-default)",
                color: "var(--text-primary)",
              }}
            />
            <input
              type="password"
              inputMode="numeric"
              pattern="[0-9]*"
              value={confirmPin}
              onChange={(e) => setConfirmPin(e.target.value.replace(/\D/g, ""))}
              placeholder="Confirm PIN"
              maxLength={8}
              className="w-full px-4 py-3 rounded-[var(--radius-md)] text-sm"
              style={{
                background: "var(--bg-elevated)",
                border: "1px solid var(--border-default)",
                color: "var(--text-primary)",
              }}
            />
            <motion.button
              whileHover={{ scale: 1.02 }}
              whileTap={{ scale: 0.98 }}
              type="submit"
              className="w-full py-3"
              style={{ borderRadius: "var(--radius-md)", fontSize: "var(--text-sm)", fontWeight: "var(--weight-medium)", letterSpacing: "0.05em", background: "var(--accent)", color: "var(--bg-base)" }}
            >
              Update PIN
            </motion.button>
          </form>
        </motion.section>

        {/* Logout */}
        <motion.section {...fadeUp} transition={{ delay: 0.3 }}>
          <motion.button
            whileHover={{ scale: 1.02 }}
            whileTap={{ scale: 0.98 }}
            onClick={logout}
            className="w-full py-3"
            style={{ borderRadius: "var(--radius-md)", fontSize: "var(--text-sm)", fontWeight: "var(--weight-medium)", letterSpacing: "0.05em", background: "transparent", color: "var(--error)", border: "1px solid var(--error)" }}
          >
            Lock App
          </motion.button>
        </motion.section>
      </div>
    </main>
  );
}
