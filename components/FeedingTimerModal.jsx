"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import {
  durationMinutes,
  formatLocalTime,
  nowInstant,
  nowZoned,
  parsePlainDateTime,
  timeZone,
  toLocalDateTimeInput,
} from "../lib/temporal.js";
import { useLocale, useTranslation } from "./LocaleContext.jsx";
import Modal from "./Modal.jsx";

function formatElapsed(ms) {
  const totalSec = Math.floor(ms / 1000);
  const hrs = Math.floor(totalSec / 3600);
  const mins = Math.floor((totalSec % 3600) / 60);
  const secs = totalSec % 60;
  const parts = [mins.toString().padStart(2, "0"), secs.toString().padStart(2, "0")];
  if (hrs > 0) {
    parts.unshift(hrs.toString().padStart(2, "0"));
  }
  return parts.join(":");
}

export default function FeedingTimerModal({ babyId, onClose, onAdded, defaultVolume }) {
  const locale = useLocale()?.locale;
  const t = useTranslation();
  const initialStart = useMemo(() => nowZoned().toPlainDateTime(), []);
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
      setElapsed(
        Math.max(
          0,
          nowInstant().epochMilliseconds - startedAt.toZonedDateTime(timeZone).epochMilliseconds,
        ),
      );
    }, 1000);
    return () => clearInterval(timer);
  }, [startedAt]);

  function handleStartTimeChange(e) {
    const value = e.target.value;
    if (!value) {
      return;
    }
    const next = parsePlainDateTime(value);
    if (next) {
      setStartedAt(next);
    }
  }

  useEffect(() => {
    if (startedRef.current) {
      return;
    }

    startedRef.current = true;
    async function startEntry() {
      setStarting(true);
      try {
        const initialVolume = parseInt(volume || "0", 10) || 0;
        const start = toLocalDateTimeInput(startedAt);
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
        if (!res.ok || result?.error) {
          setError(result?.error || t("timer.unableToStart"));
        } else {
          setEntryId(result.entryId);
        }
      } catch (err) {
        console.error("Timer start failed:", err);
        setError(t("timer.unableToStart"));
      } finally {
        setStarting(false);
      }
    }
    startEntry();
  }, [babyId, startedAt, volume, t]);

  async function handleStop() {
    setSaving(true);
    setError("");
    try {
      const endedAt = nowZoned().toPlainDateTime();
      const totalMinutes = Math.max(1, durationMinutes(startedAt, endedAt) || 0);
      const fedAt = toLocalDateTimeInput(endedAt);
      let activeEntryId = entryId;
      if (!activeEntryId) {
        const startRes = await fetch(`/api/babies/${babyId}/milk`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            volume_ml: parseInt(volume || "0", 10) || 0,
            started_at: toLocalDateTimeInput(startedAt),
          }),
          credentials: "include",
        });
        const startResult = await startRes.json();
        if (!startRes.ok || startResult?.error) {
          setError(startResult?.error || t("timer.unableToStart"));
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
          started_at: toLocalDateTimeInput(startedAt),
          ended_at: toLocalDateTimeInput(endedAt),
          duration_minutes: totalMinutes,
          notes,
        }),
        credentials: "include",
      });
      const result = await res.json();
      if (!res.ok || result?.error) {
        setError(result?.error || t("timer.unableToSave"));
      } else {
        onAdded();
      }
    } catch (err) {
      console.error("Timer stop failed:", err);
      setError(t("timer.unableToSave"));
    } finally {
      setSaving(false);
    }
  }

  return (
    <Modal title={t("timer.title")} onClose={onClose}>
      <div className='timer-panel'>
        <div className='timer-time'>{formatElapsed(elapsed)}</div>
        <div className='timer-meta'>
          {starting
            ? t("timer.preparing")
            : t("timer.startedAt", { time: formatLocalTime(startedAt, locale) })}
        </div>
      </div>
      <div className='form-group'>
        <label htmlFor='timer_volume_ml'>{t("timer.amount")}</label>
        <input
          id='timer_volume_ml'
          type='number'
          min='5'
          max='2000'
          value={volume}
          onChange={(e) => setVolume(e.target.value)}
          placeholder={t("timer.amountPlaceholder")}
        />
      </div>
      <div className='form-group'>
        <label htmlFor='timer_start_time'>{t("timer.startTime")}</label>
        <input
          id='timer_start_time'
          type='datetime-local'
          value={toLocalDateTimeInput(startedAt)}
          onChange={handleStartTimeChange}
        />
      </div>
      <div className='form-group'>
        <label htmlFor='timer_notes'>{t("timer.notes")}</label>
        <input
          id='timer_notes'
          type='text'
          value={notes}
          onChange={(e) => setNotes(e.target.value)}
          placeholder={t("timer.notesPlaceholder")}
        />
      </div>
      {error && <p className='error-msg'>{error}</p>}
      <div className='modal-actions'>
        <button type='button' className='btn btn-secondary' onClick={onClose}>
          {t("timer.close")}
        </button>
        <button
          type='button'
          className='btn btn-primary'
          onClick={handleStop}
          disabled={saving || !volume}
        >
          {saving ? <span className='spinner' /> : t("timer.stopSave")}
        </button>
      </div>
    </Modal>
  );
}
