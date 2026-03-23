"use client";

import { useState, useEffect } from "react";
import { motion } from "framer-motion";
import Image from "next/image";
import { useToast } from "@/components/Toast";
import Link from "next/link";

export default function SettingsPage() {
  const { toast } = useToast();
  const [refPhoto, setRefPhoto] = useState<string | null>(null);
  const [uploading, setUploading] = useState(false);

  useEffect(() => {
    fetch("/api/settings")
      .then((r) => r.json())
      .then((s) => setRefPhoto(s.referencePhoto));
  }, []);

  // Serve uploaded reference photos through API route to avoid 404 in production
  const refPhotoSrc = refPhoto?.startsWith("/uploads/") ? "/api/reference-photo" : refPhoto;

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

  return (
    <main className="min-h-screen pb-24" style={{ paddingTop: "env(safe-area-inset-top, 0px)" }}>
      <nav
        className="sticky top-0 z-40 px-5 py-4 flex items-center justify-between"
        style={{
          background: "var(--bg-frosted)",
          backdropFilter: "blur(20px) saturate(1.6)",
          WebkitBackdropFilter: "blur(20px) saturate(1.6)",
          borderBottom: "1px solid var(--border-subtle)",
        }}
      >
        <Link href="/">
          <motion.span
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.95 }}
            style={{ fontSize: "var(--text-sm)", color: "var(--accent)" }}
          >
            ← Back
          </motion.span>
        </Link>
        <h1
          style={{
            fontFamily: "var(--font-display)",
            fontSize: "var(--text-lg)",
            color: "var(--text-primary)",
            letterSpacing: "var(--tracking-widest)",
            textTransform: "uppercase",
          }}
        >
          Settings
        </h1>
        <div className="w-12" />
      </nav>

      <div className="max-w-lg mx-auto px-5 pt-8 space-y-5">
        {/* Reference Photo */}
        <motion.section
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.05 }}
          className="p-5"
          style={{
            background: "rgba(255,255,255,0.03)",
            border: "none",
            borderRadius: "12px",
            boxShadow: "0 2px 8px rgba(0,0,0,0.3)",
          }}
        >
          <h2
            className="mb-4"
            style={{ fontFamily: "var(--font-display)", fontSize: "10px", letterSpacing: "0.15em", fontWeight: "var(--weight-semibold)", color: "var(--text-tertiary)", textTransform: "uppercase" }}
          >
            Reference Photo
          </h2>
          <div className="flex items-center gap-5">
            {refPhoto ? (
              <div className="relative w-20 h-20 rounded-full overflow-hidden flex-shrink-0" style={{ border: "2px solid var(--accent-muted)" }}>
                <Image src={refPhotoSrc!} alt="Reference" width={80} height={80} className="object-cover w-full h-full" />
              </div>
            ) : (
              <div
                className="w-20 h-20 rounded-full flex items-center justify-center flex-shrink-0"
                style={{ background: "var(--bg-elevated)", border: "2px dashed var(--border-default)" }}
              >
                <span style={{ fontSize: "24px", opacity: 0.3, color: "var(--text-tertiary)" }}>+</span>
              </div>
            )}
            <div className="flex-1">
              <p className="mb-2" style={{ fontSize: "var(--text-sm)", color: "var(--text-secondary)" }}>
                {refPhoto ? "Update your reference photo" : "Upload a clear face photo"}
              </p>
              <label>
                <motion.span
                  whileHover={{ scale: 1.03 }}
                  whileTap={{ scale: 0.97 }}
                  className="inline-block px-4 py-2 cursor-pointer"
                  style={{
                    borderRadius: "var(--radius-md)",
                    fontSize: "var(--text-xs)",
                    fontWeight: "var(--weight-semibold)",
                    background: "var(--bg-elevated)",
                    color: "var(--text-primary)",
                    border: "1px solid var(--border-default)",
                  }}
                >
                  {uploading ? "Uploading..." : "Choose Photo"}
                </motion.span>
                <input type="file" accept="image/*" className="hidden" onChange={handlePhotoUpload} disabled={uploading} />
              </label>
            </div>
          </div>
        </motion.section>

        {/* App info */}
        <motion.section
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
          className="text-center py-4"
        >
          <p style={{ fontSize: "var(--text-caption)", color: "var(--text-tertiary)", letterSpacing: "var(--tracking-wider)" }}>
            mirror -- Virtual Fitting Room
          </p>
        </motion.section>
      </div>
    </main>
  );
}
