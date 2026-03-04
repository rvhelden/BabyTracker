"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import Modal from "./Modal.jsx";

function formatElapsed(ms) {
  const totalSec = Math.floor(ms / 1000);
  const hrs = Math.floor(totalSec / 3600);
  const mins = Math.floor((totalSec % 3600) / 60);
  const secs = totalSec % 60;
  const parts = [mins.toString().padStart(2, "0"), secs.toString().padStart(2, "0")];
  if (hrs > 0) parts.unshift(hrs.toString().padStart(2, "0"));
  return parts.join(":");
}

/** Format a Date as local datetime string suitable for DB storage (YYYY-MM-DD HH:MM) */
function toLocalDateTime(d) {
  const pad = (n) => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
}

export default function FeedingTimerModal({ babyId, onClose, onAdded, defaultVolume }) {
  const initialStart = useMemo(() => new Date(), []);
  const [startedAt, setStartedAt] = useState(initialStart);
  const [elapsed, setElapsed] = useState(0);
  const [volume, setVolume] = useState(defaultVolume || "");
  const [notes, setNotes] = useState("");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [entryId, setEntryId] = useState(null);
  const [starting, setStarting] = useState(true);
  const startedRef = useRef(false);

  useEffect(() => {
    const timer = setInterval(() => {
      setElapsed(Math.max(0, Date.now() - startedAt.getTime()));
    }, 1000);
    return () => clearInterval(timer);
  }, [startedAt]);

  function handleStartTimeChange(e) {
    const value = e.target.value;
    if (!value) return;
    const next = new Date(value);
    if (!Number.isNaN(next.getTime())) setStartedAt(next);
  }

  useEffect(() => {
    if (startedRef.current) return;
    startedRef.current = true;
    async function startEntry() {
      setStarting(true);
      try {
        const initialVolume = parseInt(volume || "0", 10) || 0;
        const start = toLocalDateTime(startedAt);
        const controller = new AbortController();
        const timeout = setTimeout(() => controller.abort(), 10000);
        const res = await fetch(`/api/babies/${babyId}/milk`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ volume_ml: initialVolume, started_at: start }),
          credentials: "include",
          signal: controller.signal,
        });
        clearTimeout(timeout);
        const result = await res.json();
        if (!res.ok || result?.error)
          setError(result?.error || "Unable to start feeding. Please try again.");
        else setEntryId(result.entryId);
      } catch (err) {
        console.error("Timer start failed:", err);
        setError("Unable to start feeding. Please try again.");
      } finally {
        setStarting(false);
      }
    }
    startEntry();
  }, [babyId]);

  async function handleStop() {
    setSaving(true);
    setError("");
    try {
      const endedAt = new Date();
      const durationMinutes = Math.max(1, Math.round((endedAt - startedAt) / 60000));
      const fedAt = toLocalDateTime(endedAt);
      let activeEntryId = entryId;
      if (!activeEntryId) {
        const startRes = await fetch(`/api/babies/${babyId}/milk`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            volume_ml: parseInt(volume || "0", 10) || 0,
            started_at: toLocalDateTime(startedAt),
          }),
          credentials: "include",
        });
        const startResult = await startRes.json();
        if (!startRes.ok || startResult?.error) {
          setError(startResult?.error || "Unable to start feeding. Please try again.");
          return;
        }
        activeEntryId = startResult.entryId;
        setEntryId(activeEntryId);
      }
      const res = await fetch(`/api/babies/${babyId}/milk`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          entryId: activeEntryId,
          volume_ml: parseInt(volume || "0", 10) || 0,
          fed_at: fedAt,
          started_at: toLocalDateTime(startedAt),
          ended_at: toLocalDateTime(endedAt),
          duration_minutes: durationMinutes,
          notes,
        }),
        credentials: "include",
      });
      const result = await res.json();
      if (!res.ok || result?.error)
        setError(result?.error || "Unable to save feeding. Please try again.");
      else onAdded();
    } catch (err) {
      console.error("Timer stop failed:", err);
      setError("Unable to save feeding. Please try again.");
    } finally {
      setSaving(false);
    }
  }

  return (
    <Modal title='Feeding Timer' onClose={onClose}>
      <div className='timer-panel'>
        <div className='timer-time'>{formatElapsed(elapsed)}</div>
        <div className='timer-meta'>
          {starting
            ? "Preparing entry…"
            : `Started at ${startedAt.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}`}
        </div>
      </div>
      <div className='form-group'>
        <label>Amount (ml)</label>
        <input
          type='number'
          min='5'
          max='2000'
          value={volume}
          onChange={(e) => setVolume(e.target.value)}
          placeholder='e.g. 120'
        />
      </div>
      <div className='form-group'>
        <label>Start time</label>
        <input
          type='datetime-local'
          value={toLocalDateTime(startedAt)}
          onChange={handleStartTimeChange}
        />
      </div>
      <div className='form-group'>
        <label>Notes (optional)</label>
        <input
          type='text'
          value={notes}
          onChange={(e) => setNotes(e.target.value)}
          placeholder='e.g. Left side'
        />
      </div>
      {error && <p className='error-msg'>{error}</p>}
      <div className='modal-actions'>
        <button type='button' className='btn btn-secondary' onClick={onClose}>
          Close
        </button>
        <button
          type='button'
          className='btn btn-primary'
          onClick={handleStop}
          disabled={saving || !volume}
        >
          {saving ? <span className='spinner' /> : "Stop & Save"}
        </button>
      </div>
    </Modal>
  );
}
