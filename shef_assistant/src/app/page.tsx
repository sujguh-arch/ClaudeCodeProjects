"use client";

import { useState, useEffect } from "react";
import styles from "./page.module.css";

const STORAGE_KEY_MEALS = "shef_meal_count";
const STORAGE_KEY_THRESHOLD = "shef_low_threshold";
const DEFAULT_SHEF_URL = "https://shef.com";

export default function Home() {
  const [mealCount, setMealCount] = useState<number>(0);
  const [lowThreshold, setLowThreshold] = useState<number>(3);
  const [shefUrl, setShefUrl] = useState<string>(DEFAULT_SHEF_URL);
  const [prefillStatus, setPrefillStatus] = useState<string>("");
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [logs, setLogs] = useState<string[]>([]);

  useEffect(() => {
    const savedMeals = localStorage.getItem(STORAGE_KEY_MEALS);
    const savedThreshold = localStorage.getItem(STORAGE_KEY_THRESHOLD);

    if (savedMeals) setMealCount(parseInt(savedMeals, 10));
    if (savedThreshold) setLowThreshold(parseInt(savedThreshold, 10));

    // Try to load shefHomeUrl from config
    fetch("/api/config")
      .then((res) => res.json())
      .then((data) => {
        if (data.shefHomeUrl) setShefUrl(data.shefHomeUrl);
      })
      .catch(() => {
        // Config endpoint doesn't exist or failed, use default
      });
  }, []);

  const handleMealCountChange = (value: number) => {
    const newValue = Math.max(0, value);
    setMealCount(newValue);
    localStorage.setItem(STORAGE_KEY_MEALS, newValue.toString());
  };

  const handleThresholdChange = (value: number) => {
    const newValue = Math.max(0, value);
    setLowThreshold(newValue);
    localStorage.setItem(STORAGE_KEY_THRESHOLD, newValue.toString());
  };

  const openShef = () => {
    window.open(shefUrl, "_blank");
  };

  const prefillCart = async () => {
    setIsLoading(true);
    setPrefillStatus("Starting prefill...");
    setLogs([]);

    try {
      const response = await fetch("/api/prefill", { method: "POST" });
      const data = await response.json();

      if (data.success) {
        setPrefillStatus("Cart prefilled successfully!");
        setLogs(data.logs || []);
      } else {
        setPrefillStatus(`Failed: ${data.message}`);
        setLogs(data.logs || []);
      }
    } catch (error) {
      setPrefillStatus(`Error: ${error instanceof Error ? error.message : "Unknown error"}`);
    } finally {
      setIsLoading(false);
    }
  };

  const isLow = mealCount <= lowThreshold;

  return (
    <div className={styles.page}>
      <main className={styles.main}>
        <div className={styles.header}>
          <h1>Shef Assistant</h1>
          <p>Manage your meal inventory and automate Shef orders</p>
        </div>

        <div className={styles.card}>
          <h2>Meal Inventory</h2>
          <div className={styles.counter}>
            <button
              className={styles.counterBtn}
              onClick={() => handleMealCountChange(mealCount - 1)}
              aria-label="Decrease meal count"
            >
              -
            </button>
            <span className={`${styles.count} ${isLow ? styles.low : ""}`}>
              {mealCount}
            </span>
            <button
              className={styles.counterBtn}
              onClick={() => handleMealCountChange(mealCount + 1)}
              aria-label="Increase meal count"
            >
              +
            </button>
          </div>
          {isLow && (
            <p className={styles.warning}>Meal count is low! Time to order.</p>
          )}
        </div>

        <div className={styles.card}>
          <h2>Settings</h2>
          <label className={styles.inputGroup}>
            <span>Low threshold:</span>
            <input
              type="number"
              min="0"
              value={lowThreshold}
              onChange={(e) => handleThresholdChange(parseInt(e.target.value, 10) || 0)}
              className={styles.input}
            />
          </label>
        </div>

        <div className={styles.actions}>
          <button className={styles.primary} onClick={openShef}>
            Open Shef
          </button>
          <button
            className={styles.secondary}
            onClick={prefillCart}
            disabled={isLoading}
          >
            {isLoading ? "Prefilling..." : "Prefill Cart"}
          </button>
        </div>

        {prefillStatus && (
          <div className={styles.status}>
            <p>{prefillStatus}</p>
            {logs.length > 0 && (
              <details className={styles.logs}>
                <summary>View logs ({logs.length} lines)</summary>
                <pre>{logs.join("\n")}</pre>
              </details>
            )}
          </div>
        )}
      </main>
    </div>
  );
}
