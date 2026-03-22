"use client";

import { useEffect, useCallback, useState, useRef } from "react";
import { motion, AnimatePresence, type PanInfo } from "framer-motion";

interface MotionLightboxProps {
  title: string;
  store: string;
  price: number | null;
  url: string;
  images: string[];
  currentIndex: number;
  onClose: () => void;
  onNext: () => void;
  onPrev: () => void;
  onGoTo: (index: number) => void;
}

export default function MotionLightbox({
  title,
  store,
  price,
  url,
  images,
  currentIndex,
  onClose,
  onNext,
  onPrev,
  onGoTo,
}: MotionLightboxProps) {
  const [direction, setDirection] = useState(0);
  const [sheetY, setSheetY] = useState(0);
  const [isMobile, setIsMobile] = useState(false);
  const constraintsRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    setIsMobile(window.innerWidth < 768);
    const handler = () => setIsMobile(window.innerWidth < 768);
    window.addEventListener("resize", handler);
    return () => window.removeEventListener("resize", handler);
  }, []);

  const handleKey = useCallback(
    (e: KeyboardEvent) => {
      if (e.key === "ArrowRight") {
        setDirection(1);
        onNext();
      }
      if (e.key === "ArrowLeft") {
        setDirection(-1);
        onPrev();
      }
      if (e.key === "Escape") onClose();
    },
    [onNext, onPrev, onClose]
  );

  useEffect(() => {
    document.addEventListener("keydown", handleKey);
    document.body.style.overflow = "hidden";
    return () => {
      document.removeEventListener("keydown", handleKey);
      document.body.style.overflow = "";
    };
  }, [handleKey]);

  function goNext() {
    setDirection(1);
    onNext();
  }

  function goPrev() {
    setDirection(-1);
    onPrev();
  }

  function handleSwipe(_: MouseEvent | TouchEvent | PointerEvent, info: PanInfo) {
    if (Math.abs(info.offset.x) > 50) {
      if (info.offset.x > 0) goPrev();
      else goNext();
    }
  }

  function handleSheetDrag(_: MouseEvent | TouchEvent | PointerEvent, info: PanInfo) {
    setSheetY(Math.max(0, info.offset.y));
  }

  function handleSheetDragEnd(_: MouseEvent | TouchEvent | PointerEvent, info: PanInfo) {
    if (info.offset.y > 150 || info.velocity.y > 500) {
      onClose();
    }
    setSheetY(0);
  }

  const slideVariants = {
    enter: (dir: number) => ({
      x: dir > 0 ? 100 : -100,
      opacity: 0,
    }),
    center: {
      x: 0,
      opacity: 1,
    },
    exit: (dir: number) => ({
      x: dir < 0 ? 100 : -100,
      opacity: 0,
    }),
  };

  if (isMobile) {
    // Mobile: bottom sheet
    return (
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        className="fixed inset-0 z-50"
        style={{ background: "var(--overlay-heavy)" }}
        onClick={(e) => e.target === e.currentTarget && onClose()}
      >
        <motion.div
          initial={{ y: "100%" }}
          animate={{ y: sheetY }}
          exit={{ y: "100%" }}
          transition={{ type: "spring", damping: 30, stiffness: 300 }}
          drag="y"
          dragConstraints={{ top: 0 }}
          dragElastic={0.2}
          onDrag={handleSheetDrag}
          onDragEnd={handleSheetDragEnd}
          className="absolute bottom-0 left-0 right-0 rounded-t-[28px] overflow-hidden"
          style={{
            background: "var(--bg-surface)",
            maxHeight: "95vh",
            paddingBottom: "env(safe-area-inset-bottom, 0px)",
          }}
        >
          {/* Drag handle */}
          <div className="flex justify-center pt-3 pb-2">
            <div
              className="w-10 h-1 rounded-full"
              style={{ background: "var(--border-default)" }}
            />
          </div>

          {/* Image area */}
          <div className="relative aspect-[3/4] overflow-hidden" ref={constraintsRef}>
            <AnimatePresence initial={false} custom={direction} mode="popLayout">
              <motion.img
                key={currentIndex}
                custom={direction}
                variants={slideVariants}
                initial="enter"
                animate="center"
                exit="exit"
                transition={{ type: "spring", stiffness: 300, damping: 30 }}
                src={images[currentIndex]}
                alt={title}
                className="absolute inset-0 w-full h-full object-contain"
                drag="x"
                dragConstraints={{ left: 0, right: 0 }}
                dragElastic={0.5}
                onDragEnd={handleSwipe}
              />
            </AnimatePresence>

            {/* Dots */}
            {images.length > 1 && (
              <div className="absolute bottom-3 left-0 right-0 flex justify-center gap-1.5">
                {images.map((_, i) => (
                  <button
                    key={i}
                    onClick={() => {
                      setDirection(i > currentIndex ? 1 : -1);
                      onGoTo(i);
                    }}
                    className="w-1.5 h-1.5 rounded-full transition-all duration-300"
                    style={{
                      background:
                        i === currentIndex ? "var(--accent)" : "rgba(255,255,255,0.4)",
                      width: i === currentIndex ? "16px" : "6px",
                    }}
                  />
                ))}
              </div>
            )}
          </div>

          {/* Info */}
          <div className="px-5 pt-4 pb-2">
            <h2
              className="text-sm font-medium mb-0.5"
              style={{ color: "var(--text-primary)" }}
            >
              {title}
            </h2>
            <p className="text-xs mb-1" style={{ color: "var(--text-tertiary)" }}>
              {store}
            </p>
            {price && (
              <p
                className="text-lg font-semibold mb-3"
                style={{ color: "var(--text-primary)" }}
              >
                ${price}
              </p>
            )}
          </div>

          {/* CTA */}
          <div
            className="px-5 pb-4"
            style={{ paddingBottom: "calc(16px + env(safe-area-inset-bottom, 0px))" }}
          >
            <motion.a
              whileHover={{ scale: 1.02 }}
              whileTap={{ scale: 0.98 }}
              href={url}
              target="_blank"
              rel="noopener noreferrer"
              className="block w-full py-3.5 rounded-[var(--radius-md)] text-sm font-semibold tracking-wider uppercase text-center"
              style={{ background: "var(--accent)", color: "var(--bg-base)" }}
            >
              Shop this look
            </motion.a>
          </div>
        </motion.div>
      </motion.div>
    );
  }

  // Desktop lightbox
  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      transition={{ duration: 0.2 }}
      className="fixed inset-0 z-50 flex items-center justify-center"
      style={{ background: "var(--bg-base)" }}
      onClick={(e) => e.target === e.currentTarget && onClose()}
    >
      <motion.button
        whileHover={{ scale: 1.1 }}
        whileTap={{ scale: 0.9 }}
        onClick={onClose}
        className="absolute top-4 right-5 w-10 h-10 flex items-center justify-center text-xl z-10 rounded-full"
        style={{
          color: "var(--text-tertiary)",
          background: "var(--bg-elevated)",
        }}
      >
        ✕
      </motion.button>

      <motion.div
        initial={{ scale: 0.95, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        exit={{ scale: 0.95, opacity: 0 }}
        transition={{ type: "spring", stiffness: 300, damping: 30 }}
        className="flex w-full max-w-[1100px] max-h-[92vh] px-4 gap-6"
      >
        {/* Main image */}
        <div className="flex-1 flex items-center justify-center relative">
          <motion.button
            whileHover={{ scale: 1.2 }}
            whileTap={{ scale: 0.9 }}
            onClick={goPrev}
            className="absolute left-2 text-3xl select-none p-3 rounded-full z-10"
            style={{
              color: "var(--text-tertiary)",
              background: "var(--bg-elevated)",
            }}
          >
            ‹
          </motion.button>

          <div className="relative w-full h-full flex items-center justify-center overflow-hidden">
            <AnimatePresence initial={false} custom={direction} mode="popLayout">
              <motion.img
                key={currentIndex}
                custom={direction}
                variants={slideVariants}
                initial="enter"
                animate="center"
                exit="exit"
                transition={{ type: "spring", stiffness: 300, damping: 30 }}
                src={images[currentIndex]}
                alt={title}
                className="max-w-full max-h-[88vh] object-contain rounded-[var(--radius-lg)]"
                drag="x"
                dragConstraints={{ left: 0, right: 0 }}
                dragElastic={0.3}
                onDragEnd={handleSwipe}
              />
            </AnimatePresence>
          </div>

          <motion.button
            whileHover={{ scale: 1.2 }}
            whileTap={{ scale: 0.9 }}
            onClick={goNext}
            className="absolute right-2 text-3xl select-none p-3 rounded-full z-10"
            style={{
              color: "var(--text-tertiary)",
              background: "var(--bg-elevated)",
            }}
          >
            ›
          </motion.button>
        </div>

        {/* Sidebar */}
        <motion.div
          initial={{ opacity: 0, x: 20 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ delay: 0.15 }}
          className="hidden md:flex flex-col w-60 py-6"
        >
          <h2
            className="text-sm font-medium mb-1"
            style={{ color: "var(--text-primary)" }}
          >
            {title}
          </h2>
          <p className="text-xs mb-1" style={{ color: "var(--text-tertiary)" }}>
            {store}
          </p>
          {price && (
            <p
              className="text-lg font-semibold mb-5"
              style={{ color: "var(--text-primary)" }}
            >
              ${price}
            </p>
          )}

          <div className="grid grid-cols-3 gap-1.5 mb-3">
            {images.map((img, i) => (
              <motion.img
                key={i}
                whileHover={{ scale: 1.05 }}
                whileTap={{ scale: 0.95 }}
                src={img}
                className="w-full aspect-[3/4] object-cover cursor-pointer transition-all"
                style={{
                  borderRadius: "var(--radius-sm)",
                  opacity: i === currentIndex ? 1 : 0.5,
                  border:
                    i === currentIndex
                      ? "2px solid var(--accent)"
                      : "2px solid transparent",
                }}
                onClick={() => {
                  setDirection(i > currentIndex ? 1 : -1);
                  onGoTo(i);
                }}
              />
            ))}
          </div>

          <p className="text-xs text-center mb-4" style={{ color: "var(--text-tertiary)" }}>
            {currentIndex + 1} of {images.length}
          </p>

          <motion.a
            whileHover={{ scale: 1.03, boxShadow: "0 4px 20px rgba(201,169,110,0.3)" }}
            whileTap={{ scale: 0.97 }}
            href={url}
            target="_blank"
            rel="noopener noreferrer"
            className="mt-auto py-3 rounded-[var(--radius-md)] text-sm font-semibold tracking-wider uppercase text-center transition-all"
            style={{ background: "var(--accent)", color: "var(--bg-base)" }}
          >
            Shop this look
          </motion.a>
        </motion.div>
      </motion.div>
    </motion.div>
  );
}
