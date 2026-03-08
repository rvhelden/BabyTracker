"use client";

import Image from "next/image.js";
import { useRouter } from "next/navigation";
import { useEffect, useMemo, useState, useTransition } from "react";
import { deleteBabyAction, leaveBabyAction } from "../app/actions.js";
import {
  addMinutes,
  daysBetween,
  formatLocalDate,
  formatLocalDateTime,
  formatLocalTime,
  nowInstant,
  nowZoned,
  parsePlainDate,
  parsePlainDateTime,
  todayPlainDate,
  zonedFromPlainDateTime,
} from "../lib/temporal.js";
import AddMilkModal from "./AddMilkModal.jsx";
import AddWeightModal from "./AddWeightModal.jsx";
import EditBabyModal from "./EditBabyModal.jsx";
import FeedingHourChart from "./FeedingHourChart.jsx";
import FeedingTimerModal from "./FeedingTimerModal.jsx";
import InviteModal from "./InviteModal.jsx";
import { useLocale } from "./LocaleContext.jsx";
import MilkChart from "./MilkChart.jsx";
import MilkList from "./MilkList.jsx";
import WeightChart from "./WeightChart.jsx";
import WeightGainChart from "./WeightGainChart.jsx";
import WeightList from "./WeightList.jsx";

function ageLabel(birthDate) {
  const birth = parsePlainDate(birthDate);
  const now = todayPlainDate();
  const days = birth ? Math.floor(daysBetween(birth, now)) : 0;
  if (days < 30) {
    return `${days} day${days !== 1 ? "s" : ""} old`;
  }
  const months = Math.floor(days / 30.44);
  if (months < 24) {
    return `${months} month${months !== 1 ? "s" : ""} old`;
  }
  const years = Math.floor(months / 12);
  return `${years} year${years !== 1 ? "s" : ""} old`;
}

function genderIcon(gender) {
  if (gender === "male") {
    return "👦";
  }
  if (gender === "female") {
    return "👧";
  }
  return "🍼";
}

function normalizeDateTime(value) {
  if (!value) {
    return null;
  }
  return value.includes("T") ? value : value.replace(" ", "T");
}

function parseDateTime(value) {
  const normalized = normalizeDateTime(value);
  if (!normalized) {
    return null;
  }
  const plain = parsePlainDateTime(normalized);
  return plain ? zonedFromPlainDateTime(plain) : null;
}

function formatElapsedSince(date, nowTick) {
  if (!date) {
    return "No feeds yet";
  }
  const diffMs = nowTick - date.epochMilliseconds;
  if (diffMs < 0) {
    return "Just now";
  }
  const totalMin = Math.floor(diffMs / 60000);
  const hours = Math.floor(totalMin / 60);
  const mins = totalMin % 60;
  if (hours > 0) {
    return `${hours}h ${mins}m ago`;
  }
  return `${mins}m ago`;
}

function formatEtaUntil(date, nowTick) {
  if (!date) {
    return "";
  }
  const diffMs = date.epochMilliseconds - nowTick;
  if (diffMs <= 0) {
    return "due now";
  }
  const totalMin = Math.ceil(diffMs / 60000);
  const hours = Math.floor(totalMin / 60);
  const mins = totalMin % 60;
  if (hours > 0) {
    return `in ${hours}h ${mins}m`;
  }
  return `in ${mins}m`;
}

function formatTimeOnly(date, locale) {
  if (!date) {
    return "";
  }
  return formatLocalTime(date.toPlainDateTime ? date.toPlainDateTime() : date, locale);
}

function formatDayKey(date) {
  return date.toPlainDate().toString();
}

export default function BabyDetailClient({ baby, weights, milkEntries }) {
  const locale = useLocale()?.locale;
  const [modal, setModal] = useState(null); // 'add-weight' | 'invite' | 'edit' | 'add-milk' | 'timer'
  const [activeSection, setActiveSection] = useState("feeding");
  const [feedFabAction, setFeedFabAction] = useState("timer");
  const [feedingIntervalHours, setFeedingIntervalHours] = useState("3");
  const [nowTick, setNowTick] = useState(() => nowInstant().epochMilliseconds);
  const router = useRouter();
  const [, startTransition] = useTransition();

  useEffect(() => {
    const saved = window.localStorage.getItem("feedFabAction");
    if (saved) {
      setFeedFabAction(saved);
    }
    const savedInterval = window.localStorage.getItem("feedingIntervalHours");
    if (savedInterval) {
      setFeedingIntervalHours(savedInterval);
    }
    const timer = setInterval(() => setNowTick(nowInstant().epochMilliseconds), 60000);
    return () => clearInterval(timer);
  }, []);

  useEffect(() => {
    if (!baby?.id) {
      return;
    }
    window.localStorage.setItem("lastViewedBabyId", String(baby.id));
  }, [baby?.id]);

  const latestMilk = milkEntries.length
    ? [...milkEntries].sort((a, b) => b.fed_at.localeCompare(a.fed_at))[0]
    : null;
  const latestMilkVolume = latestMilk?.volume_ml || "";

  const milkTotals = useMemo(() => {
    if (!milkEntries.length) {
      return { dayTotal: 0, last24hTotal: 0, lastFeedAt: null };
    }
    const now = nowZoned();
    const todayKey = formatDayKey(now);
    const since24h = now.subtract({ hours: 24 });
    let dayTotal = 0;
    let last24hTotal = 0;
    let lastFeedAt = null;

    for (const entry of milkEntries) {
      const when = parseDateTime(entry.fed_at);
      if (!when) {
        continue;
      }
      if (!lastFeedAt || when.epochMilliseconds > lastFeedAt.epochMilliseconds) {
        lastFeedAt = when;
      }
      if (formatDayKey(when) === todayKey) {
        dayTotal += entry.volume_ml;
      }
      if (when.epochMilliseconds >= since24h.epochMilliseconds) {
        last24hTotal += entry.volume_ml;
      }
    }
    return { dayTotal, last24hTotal, lastFeedAt };
  }, [milkEntries]);

  const nextFeedings = useMemo(() => {
    const intervalHours = Number.parseFloat(feedingIntervalHours);
    if (!milkTotals.lastFeedAt || !Number.isFinite(intervalHours) || intervalHours <= 0) {
      return [];
    }
    const intervalMinutes = intervalHours * 60;
    const dueAt = addMinutes(milkTotals.lastFeedAt, intervalMinutes);
    return [0, 1, 2].map((step) => addMinutes(dueAt, step * intervalMinutes));
  }, [feedingIntervalHours, milkTotals.lastFeedAt]);

  const feedingIntervalMinutes = useMemo(() => {
    const intervalHours = Number.parseFloat(feedingIntervalHours);
    if (!Number.isFinite(intervalHours) || intervalHours <= 0) {
      return null;
    }
    return intervalHours * 60;
  }, [feedingIntervalHours]);

  const isFeedingLate = useMemo(() => {
    if (!milkTotals.lastFeedAt || !feedingIntervalMinutes) {
      return false;
    }
    const dueAt = addMinutes(milkTotals.lastFeedAt, feedingIntervalMinutes);
    return nowTick > dueAt.epochMilliseconds;
  }, [milkTotals.lastFeedAt, feedingIntervalMinutes, nowTick]);

  const latestWeight = weights.length > 0 ? weights[weights.length - 1] : null;
  const firstWeight = weights.length > 0 ? weights[0] : null;
  const advisedDailyMilk = latestWeight
    ? Math.round((latestWeight.weight_grams / 1000) * 150)
    : null;
  const maxDailyMilk = latestWeight ? Math.round((latestWeight.weight_grams / 1000) * 180) : null;
  const gainGrams =
    latestWeight && firstWeight && weights.length > 1
      ? latestWeight.weight_grams - firstWeight.weight_grams
      : null;

  function handleMutated() {
    setModal(null);
    router.refresh();
  }

  async function handleDelete() {
    if (!window.confirm(`Delete ${baby.name}'s profile? This cannot be undone.`)) {
      return;
    }
    startTransition(async () => {
      const result = await deleteBabyAction(baby.id);
      if (result?.error) {
        alert(result.error);
      }
    });
  }

  async function handleLeave() {
    if (!window.confirm(`Remove yourself from ${baby.name}'s profile?`)) {
      return;
    }
    startTransition(async () => {
      const result = await leaveBabyAction(baby.id);
      if (result?.error) {
        alert(result.error);
      }
    });
  }

  return (
    <div className='baby-detail'>
      {/* Hero card */}
      <div className='baby-hero card'>
        <div className='baby-hero-main'>
          <div className='baby-hero-info'>
            <div className='baby-detail-avatar'>
              {baby.photo_url ? (
                <Image src={baby.photo_url} alt={baby.name} width={100} height={100} />
              ) : (
                genderIcon(baby.gender)
              )}
            </div>
            <div className='baby-hero-text'>
              <h2>{baby.name}</h2>
              <p className='baby-detail-age'>{ageLabel(baby.birth_date)}</p>
              <p className='baby-born'>
                Born {formatLocalDate(parsePlainDate(baby.birth_date), locale)}
              </p>
            </div>
          </div>
          <div className='baby-hero-actions'>
            <button type='button' className='baby-action-btn' onClick={() => setModal("edit")}>
              <span>✏️</span> Edit
            </button>
            <button type='button' className='baby-action-btn' onClick={() => setModal("invite")}>
              <span>📲</span> Share
            </button>
            {baby.role === "owner" ? (
              <button type='button' className='baby-action-btn danger' onClick={handleDelete}>
                <span>🗑️</span> Delete
              </button>
            ) : (
              <button type='button' className='baby-action-btn' onClick={handleLeave}>
                <span>👋</span> Leave
              </button>
            )}
          </div>
        </div>
      </div>

      <div className='section-tabs' role='tablist' aria-label='Detail sections'>
        <button
          type='button'
          className={`tab-btn${activeSection === "weight" ? " active" : ""}`}
          onClick={() => setActiveSection("weight")}
          role='tab'
          aria-selected={activeSection === "weight"}
        >
          Weight
        </button>
        <button
          type='button'
          className={`tab-btn${activeSection === "feeding" ? " active" : ""}`}
          onClick={() => setActiveSection("feeding")}
          role='tab'
          aria-selected={activeSection === "feeding"}
        >
          Feeding
        </button>
        <button
          type='button'
          className={`tab-btn${activeSection === "reports" ? " active" : ""}`}
          onClick={() => setActiveSection("reports")}
          role='tab'
          aria-selected={activeSection === "reports"}
        >
          Reports
        </button>
      </div>

      {activeSection === "weight" && (
        <section className='detail-section' role='tabpanel'>
          <div className='section-title'>
            <h3>Weight</h3>
          </div>
          <div className='weight-summary'>
            <div className='summary-card card'>
              <div className='summary-label'>Current</div>
              <div className='summary-value'>
                {latestWeight ? `${(latestWeight.weight_grams / 1000).toFixed(2)} kg` : "—"}
              </div>
              {latestWeight && <div className='summary-sub'>{latestWeight.weight_grams} g</div>}
            </div>
            <div className='summary-card card'>
              <div className='summary-label'>At birth</div>
              <div className='summary-value'>
                {firstWeight ? `${(firstWeight.weight_grams / 1000).toFixed(2)} kg` : "—"}
              </div>
              {firstWeight && <div className='summary-sub'>{firstWeight.weight_grams} g</div>}
            </div>
            <div className='summary-card card'>
              <div className='summary-label'>Gained</div>
              <div
                className={`summary-value ${gainGrams !== null && gainGrams >= 0 ? "gain-positive" : ""}`}
              >
                {gainGrams !== null ? `${gainGrams >= 0 ? "+" : ""}${gainGrams} g` : "—"}
              </div>
              {weights.length > 1 && <div className='summary-sub'>{weights.length} entries</div>}
            </div>
          </div>

          <div className='chart-card card'>
            <div className='section-header'>
              <h3>Growth Chart</h3>
            </div>
            {weights.length > 0 ? (
              <WeightChart weights={weights} birthDate={baby.birth_date} />
            ) : (
              <p className='chart-empty'>No weight entries yet.</p>
            )}
          </div>

          <div className='chart-card card'>
            <div className='section-header'>
              <h3>Gain / Loss per Measurement</h3>
            </div>
            <WeightGainChart weights={weights} />
          </div>

          <div className='history-card card'>
            <div className='section-header'>
              <h3>Weight History</h3>
              <a
                href={`/api/export/${baby.id}`}
                download
                className='btn btn-secondary btn-sm'
                style={{ textDecoration: "none", display: "inline-flex", alignItems: "center", gap: "0.3rem" }}
              >
                ⬇ Export
              </a>
            </div>
            <WeightList weights={weights} babyId={baby.id} onMutated={handleMutated} />
          </div>
        </section>
      )}

      {activeSection === "feeding" && (
        <section className='detail-section' role='tabpanel'>
          <div className='section-title'>
            <h3>Feeding</h3>
          </div>
          <div className={`feeding-timeline-card card${isFeedingLate ? " late" : ""}`}>
            <div className='feeding-timeline-row'>
              <div className='feed-chip feed-chip-last'>
                <span className='feed-chip-label'>Last</span>
                <span className='feed-chip-value'>
                  {formatElapsedSince(milkTotals.lastFeedAt, nowTick)}
                </span>
                {milkTotals.lastFeedAt && (
                  <span className='feed-chip-sub'>
                    {formatLocalDateTime(milkTotals.lastFeedAt.toPlainDateTime(), locale)}
                  </span>
                )}
              </div>

              <div className='feed-chip feed-chip-next'>
                <span className='feed-chip-label'>Next</span>
                {nextFeedings.length > 0 ? (
                  (() => {
                    const next = nextFeedings[0];
                    const eta = formatEtaUntil(next, nowTick);
                    return (
                      <div className='feed-chip-next-body'>
                        <div className='feed-chip-next-main'>
                          <span className='feed-chip-value'>{formatTimeOnly(next, locale)}</span>
                          <span className={`feed-chip-sub${isFeedingLate ? " late" : ""}`}>
                            {isFeedingLate ? "Late" : eta}
                          </span>
                        </div>
                        {nextFeedings.length > 1 && (
                          <div className='feed-chip-next-rail'>
                            {nextFeedings.slice(1, 3).map((time) => (
                              <div key={time.toString()} className='feed-chip-next-mini'>
                                <span className='feed-chip-next-mini-time'>
                                  {formatTimeOnly(time, locale)}
                                </span>
                                <span className='feed-chip-next-mini-eta'>
                                  {formatEtaUntil(time, nowTick)}
                                </span>
                              </div>
                            ))}
                          </div>
                        )}
                      </div>
                    );
                  })()
                ) : (
                  <span className='feed-chip-sub'>Add a feeding to see schedule</span>
                )}
              </div>
            </div>
          </div>

          <div className='milk-metrics-card card'>
            <div className='milk-metrics-row'>
              <div className='milk-chip milk-chip-primary'>
                <span className='milk-chip-label'>Current Milk</span>
                <span className='milk-chip-value'>{milkTotals.dayTotal} ml</span>
                <span className='milk-chip-sub'>Midnight to now</span>
              </div>

              <div className='milk-chip'>
                <span className='milk-chip-label'>Milk Past 24h</span>
                <span className='milk-chip-value'>{milkTotals.last24hTotal} ml</span>
                <span className='milk-chip-sub'>Rolling total</span>
              </div>

              <div className='milk-chip milk-chip-guidance milk-chip-wide'>
                <span className='milk-chip-label'>Advised / Max</span>
                {advisedDailyMilk != null ? (
                  <>
                    <span className='milk-chip-value'>{advisedDailyMilk} ml</span>
                    <span className='milk-chip-sub'>max {maxDailyMilk} ml/day</span>
                  </>
                ) : (
                  <span className='milk-chip-sub'>Add weight to get guidance</span>
                )}
              </div>
            </div>
          </div>

          <div className='history-card card'>
            <div className='section-header'>
              <h3>Milk History</h3>
            </div>
            <MilkList entries={milkEntries} babyId={baby.id} onMutated={handleMutated} />
          </div>
        </section>
      )}

      {activeSection === "reports" && (
        <section className='detail-section' role='tabpanel'>
          <div className='section-title'>
            <h3>Reports</h3>
          </div>
          <div className='chart-card card'>
            <div className='section-header'>
              <h3>Milk Intake</h3>
            </div>
            {milkEntries.length > 0 ? (
              <MilkChart entries={milkEntries} weights={weights} />
            ) : (
              <p className='chart-empty'>No milk entries yet.</p>
            )}
          </div>

          <div className='chart-card card'>
            <div className='section-header'>
              <h3>Feedings by Hour</h3>
            </div>
            {milkEntries.length > 0 ? (
              <FeedingHourChart entries={milkEntries} />
            ) : (
              <p className='chart-empty'>No feeding data yet.</p>
            )}
          </div>
        </section>
      )}

      {activeSection !== "reports" && (
        <button
          type='button'
          className='fab'
          onClick={() => {
            if (activeSection === "weight") {
              setModal("add-weight");
            }
            if (activeSection === "feeding") {
              if (feedFabAction === "manual") {
                setModal("add-milk");
              } else {
                setModal("timer");
              }
            }
          }}
          aria-label={activeSection === "weight" ? "Add weight" : "Start feeding"}
        >
          +
        </button>
      )}

      {modal === "add-weight" && (
        <AddWeightModal babyId={baby.id} onClose={() => setModal(null)} onAdded={handleMutated} />
      )}
      {modal === "add-milk" && (
        <AddMilkModal
          babyId={baby.id}
          onClose={() => setModal(null)}
          onAdded={handleMutated}
          defaultVolume={latestMilkVolume}
        />
      )}
      {modal === "timer" && (
        <FeedingTimerModal
          babyId={baby.id}
          onClose={() => setModal(null)}
          onAdded={handleMutated}
          defaultVolume={latestMilkVolume}
        />
      )}
      {modal === "invite" && (
        <InviteModal babyId={baby.id} babyName={baby.name} onClose={() => setModal(null)} />
      )}
      {modal === "edit" && (
        <EditBabyModal baby={baby} onClose={() => setModal(null)} onUpdated={handleMutated} />
      )}
    </div>
  );
}
