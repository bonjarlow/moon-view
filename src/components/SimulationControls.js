import { useState } from "react";
import { julian } from "astronomia";

export default function SimulationControls({ jdNow, sampleRate, setSampleRate, speedUp, setSpeedUp }) {
  const isPaused = sampleRate === 0;

  return (
    <div
      style={{
        position: "absolute",
        top: 20,
        right: 20,
        zIndex: 10,
        padding: "0.5rem 1rem",
        background: "#111",
        color: "#fff",
        border: "1px solid #333",
        borderRadius: "4px",
        fontFamily: "monospace",
        fontSize: "0.8rem",
        minWidth: "270px",
      }}
    >
      <div style={{ marginBottom: "0.5rem" }}>
        Simulated Time:<br />
        {julian.JDToDate(jdNow).toLocaleString("en-US", {
          timeZone: "America/New_York",
          year: "numeric",
          month: "2-digit",
          day: "2-digit",
          hour: "2-digit",
          minute: "2-digit",
          second: "2-digit",
        })}
      </div>

      {/* Pause/Resume Button */}
      <button
        onClick={() => setSampleRate(isPaused ? 0.01 : 0)}
        style={{
          marginBottom: "0.5rem",
          width: "100%",
          background: "#222",
          color: "#fff",
          border: "1px solid #444",
          borderRadius: "4px",
          padding: "0.4rem",
          cursor: "pointer",
        }}
      >
        {isPaused ? "▶ Resume" : "⏸ Pause"}
      </button>

      {/* SpeedUp Selector */}
      <label style={{ display: "block", marginBottom: "0.25rem" }}>
        Speed:
        <select
          value={speedUp}
          onChange={(e) => setSpeedUp(Number(e.target.value))}
          style={{
            marginLeft: "0.5rem",
            background: "#222",
            color: "#fff",
            border: "1px solid #444",
            borderRadius: "4px",
            padding: "0.2rem",
            fontFamily: "monospace",
          }}
        >
          <option value={1}>1× (Real Time)</option>
          <option value={100}>100×</option>
          <option value={1000}>1,000×</option>
          <option value={100000}>100,000×</option>
        </select>
      </label>
    </div>
  );
}
