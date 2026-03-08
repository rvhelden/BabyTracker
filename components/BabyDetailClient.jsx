"use client";

import Image from "next/image.js";
import { useRouter } from "next/navigation";
import { useCallback, useEffect, useMemo, useRef, useState, useTransition } from "react";
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
import { useLocale, useTranslation } from "./LocaleContext.jsx";
import MilkChart from "./MilkChart.jsx";
import MilkList from "./MilkList.jsx";
import WeightChart from "./WeightChart.jsx";
import WeightGainChart from "./WeightGainChart.jsx";
import WeightList from "./WeightList.jsx";

function ageLabel(birthDate, t) {
  const birth = parsePlainDate(birthDate);
  const now = todayPlainDate();
  const days = birth ? Math.floor(daysBetween(birth, now)) : 0;
  if (days < 30) {
    return days === 1 ? t("baby.ageDay", { n: days }) : t("baby.ageDays", { n: days });
  }
  const months = Math.floor(days / 30.44);
  if (months < 24) {
    return months === 1 ? t("baby.ageMonth", { n: months }) : t("baby.ageMonths", { n: months });
  }
  const years = Math.floor(months / 12);
  return years === 1 ? t("baby.ageYear", { n: years }) : t("baby.ageYears", { n: years });
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

function formatElapsedSince(date, nowTick, t) {
  if (!date) {
    return t("feeding.noFeedsYet");
  }
  const diffMs = nowTick - date.epochMilliseconds;
  if (diffMs < 0) {
    return t("feeding.justNow");
  }
  const totalMin = Math.floor(diffMs / 60000);
  const hours = Math.floor(totalMin / 60);
  const mins = totalMin % 60;
  if (hours > 0) {
    return `${hours}h ${mins}m ago`;
  }
  return `${mins}m ago`;
}

function formatEtaUntil(date, nowTick, t) {
  if (!date) {
    return "";
  }
  const diffMs = date.epochMilliseconds - nowTick;
  if (diffMs <= 0) {
    return t("feeding.dueNow");
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
  const t = useTranslation();
  const [modal, setModal] = useState(null); // 'add-weight' | 'invite' | 'edit' | 'add-milk' | 'timer'
  const [activeSection, setActiveSection] = useState("feeding");
  const [showWeightReports, setShowWeightReports] = useState(false);
  const [showFeedingReports, setShowFeedingReports] = useState(false);
  const [feedFabAction, setFeedFabAction] = useState("timer");
  const [feedingIntervalHours, setFeedingIntervalHours] = useState("3");
  const [nowTick, setNowTick] = useState(() => nowInstant().epochMilliseconds);
  const [babyState, setBabyState] = useState(baby);
  const router = useRouter();
  const [, startTransition] = useTransition();
  const optimisticRef = useRef(false);

  useEffect(() => {
    // Only sync from server prop when we haven't done an optimistic update.
    // After an optimistic update, we trust the local state until the server
    // sends a genuinely different baby (different id).
    if (optimisticRef.current) {
      return;
    }
    setBabyState(baby);
  }, [baby]);

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
    window.localStorage.setItem("lastViewedBabyId", String(babyState.id));
  }, [babyState?.id]);

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
  const lastBottleAmount = latestMilk?.volume_ml ?? null;
  const remainingMilk =
    advisedDailyMilk != null ? Math.max(advisedDailyMilk - milkTotals.dayTotal, 0) : null;
  const remainingBottles =
    remainingMilk != null && remainingMilk > 0 && lastBottleAmount > 0
      ? Math.ceil(remainingMilk / lastBottleAmount)
      : null;
  const gainGrams =
    latestWeight && firstWeight && weights.length > 1
      ? latestWeight.weight_grams - firstWeight.weight_grams
      : null;

  function handleMutated() {
    setModal(null);
    router.refresh();
  }

  const handleBabyUpdated = useCallback((updatedBaby) => {
    setModal(null);
    if (updatedBaby?.id) {
      optimisticRef.current = true;
      setBabyState((prev) => ({
        ...(prev || {}),
        ...updatedBaby,
        // Preserve fields only present on the full getBabyForUser result
        role: prev?.role,
        parents: prev?.parents,
        birth_date: updatedBaby.birth_date ?? prev?.birth_date,
        photo_url: updatedBaby.photo_url ?? prev?.photo_url,
      }));
    }
  }, []);

  async function handleDelete() {
    if (!window.confirm(t("baby.deleteConfirm", { name: babyState.name }))) {
      return;
    }
    startTransition(async () => {
      const result = await deleteBabyAction(babyState.id);
      if (result?.error) {
        alert(result.error);
      }
    });
  }

  async function handleLeave() {
    if (!window.confirm(t("baby.leaveConfirm", { name: babyState.name }))) {
      return;
    }
    startTransition(async () => {
      const result = await leaveBabyAction(babyState.id);
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
              {babyState.photo_url ? (
                <Image src={babyState.photo_url} alt={babyState.name} width={100} height={100} />
              ) : (
                genderIcon(babyState.gender)
              )}
            </div>
            <div className='baby-hero-text'>
              <h2>{babyState.name}</h2>
              <p className='baby-detail-age'>{ageLabel(babyState.birth_date, t)}</p>
              <p className='baby-born'>
                {t("baby.born")} {formatLocalDate(parsePlainDate(babyState.birth_date), locale)}
              </p>
            </div>
          </div>
          <div className='baby-hero-actions'>
            <button type='button' className='baby-action-btn' onClick={() => setModal("edit")}>
              <span>✏️</span> {t("baby.edit")}
            </button>
            <button type='button' className='baby-action-btn' onClick={() => setModal("invite")}>
              <span>📲</span> {t("baby.share")}
            </button>
            {babyState.role === "owner" ? (
              <button type='button' className='baby-action-btn danger' onClick={handleDelete}>
                <span>🗑️</span> {t("baby.delete")}
              </button>
            ) : (
              <button type='button' className='baby-action-btn' onClick={handleLeave}>
                <span>👋</span> {t("baby.leave")}
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
          {t("tabs.weight")}
        </button>
        <button
          type='button'
          className={`tab-btn${activeSection === "feeding" ? " active" : ""}`}
          onClick={() => setActiveSection("feeding")}
          role='tab'
          aria-selected={activeSection === "feeding"}
        >
          {t("tabs.feeding")}
        </button>
      </div>

      {activeSection === "weight" && (
        <section className='detail-section' role='tabpanel'>
          <div className='section-title'>
            <h3>{t("weight.title")}</h3>
            <button
              type='button'
              className={`reports-icon-btn${showWeightReports ? " active" : ""}`}
              onClick={() => setShowWeightReports((v) => !v)}
              aria-label={t("reports.title")}
              title={t("reports.title")}
            >
              📊
            </button>
          </div>

          {showWeightReports ? (
            <>
              <div className='chart-card card'>
                <div className='section-header'>
                  <h3>{t("weight.growthChart")}</h3>
                </div>
                {weights.length > 0 ? (
                  <WeightChart weights={weights} birthDate={babyState.birth_date} />
                ) : (
                  <p className='chart-empty'>{t("weight.noEntries")}</p>
                )}
              </div>

              <div className='chart-card card'>
                <div className='section-header'>
                  <h3>{t("weight.gainLossChart")}</h3>
                </div>
                <WeightGainChart weights={weights} />
              </div>
            </>
          ) : (
            <>
              <div className='weight-summary'>
                <div className='summary-card card'>
                  <div className='summary-label'>{t("weight.current")}</div>
                  <div className='summary-value'>
                    {latestWeight ? `${(latestWeight.weight_grams / 1000).toFixed(2)} kg` : "—"}
                  </div>
                  {latestWeight && <div className='summary-sub'>{latestWeight.weight_grams} g</div>}
                </div>
                <div className='summary-card card'>
                  <div className='summary-label'>{t("weight.atBirth")}</div>
                  <div className='summary-value'>
                    {firstWeight ? `${(firstWeight.weight_grams / 1000).toFixed(2)} kg` : "—"}
                  </div>
                  {firstWeight && <div className='summary-sub'>{firstWeight.weight_grams} g</div>}
                </div>
                <div className='summary-card card'>
                  <div className='summary-label'>{t("weight.gained")}</div>
                  <div
                    className={`summary-value ${gainGrams !== null && gainGrams >= 0 ? "gain-positive" : ""}`}
                  >
                    {gainGrams !== null ? `${gainGrams >= 0 ? "+" : ""}${gainGrams} g` : "—"}
                  </div>
                  {weights.length > 1 && (
                    <div className='summary-sub'>{t("weight.entries", { n: weights.length })}</div>
                  )}
                </div>
              </div>

              <div className='history-card card'>
                <div className='section-header'>
                  <h3>{t("weight.history")}</h3>
                </div>
                <WeightList weights={weights} babyId={babyState.id} onMutated={handleMutated} />
              </div>
            </>
          )}
        </section>
      )}

      {activeSection === "feeding" && (
        <section className='detail-section' role='tabpanel'>
          <div className='section-title'>
            <h3>{t("feeding.title")}</h3>
            <button
              type='button'
              className={`reports-icon-btn${showFeedingReports ? " active" : ""}`}
              onClick={() => setShowFeedingReports((v) => !v)}
              aria-label={t("reports.title")}
              title={t("reports.title")}
            >
              📊
            </button>
          </div>

          {showFeedingReports ? (
            <>
              <div className='chart-card card'>
                <div className='section-header'>
                  <h3>{t("reports.milkIntake")}</h3>
                </div>
                {milkEntries.length > 0 ? (
                  <MilkChart entries={milkEntries} weights={weights} />
                ) : (
                  <p className='chart-empty'>{t("reports.noMilkEntries")}</p>
                )}
              </div>

              <div className='chart-card card'>
                <div className='section-header'>
                  <h3>{t("reports.feedingsByHour")}</h3>
                </div>
                {milkEntries.length > 0 ? (
                  <FeedingHourChart entries={milkEntries} />
                ) : (
                  <p className='chart-empty'>{t("reports.noFeedingData")}</p>
                )}
              </div>
            </>
          ) : (
            <>
              <div className={`feeding-timeline-card card${isFeedingLate ? " late" : ""}`}>
                <div className='feeding-timeline-row'>
                  <div className='feed-chip feed-chip-last'>
                    <span className='feed-chip-label'>{t("feeding.last")}</span>
                    <span className='feed-chip-value'>
                      {formatElapsedSince(milkTotals.lastFeedAt, nowTick, t)}
                    </span>
                    {milkTotals.lastFeedAt && (
                      <span className='feed-chip-sub'>
                        {formatLocalDateTime(milkTotals.lastFeedAt.toPlainDateTime(), locale)}
                      </span>
                    )}
                  </div>

                  <div className='feed-chip feed-chip-next'>
                    <span className='feed-chip-label'>{t("feeding.next")}</span>
                    {nextFeedings.length > 0 ? (
                      (() => {
                        const next = nextFeedings[0];
                        const eta = formatEtaUntil(next, nowTick, t);
                        return (
                          <div className='feed-chip-next-body'>
                            <div className='feed-chip-next-main'>
                              <span className='feed-chip-value'>
                                {formatTimeOnly(next, locale)}
                              </span>
                              <span className={`feed-chip-sub${isFeedingLate ? " late" : ""}`}>
                                {isFeedingLate ? t("feeding.late") : eta}
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
                                      {formatEtaUntil(time, nowTick, t)}
                                    </span>
                                  </div>
                                ))}
                              </div>
                            )}
                          </div>
                        );
                      })()
                    ) : (
                      <span className='feed-chip-sub'>{t("feeding.addFeedingSchedule")}</span>
                    )}
                  </div>
                </div>
              </div>

              <div className='milk-metrics-card card'>
                <div className='milk-metrics-row'>
                  <div className='milk-chip milk-chip-primary'>
                    <span className='milk-chip-label'>{t("feeding.currentMilk")}</span>
                    <span className='milk-chip-value'>{milkTotals.dayTotal} ml</span>
                    <span className='milk-chip-sub'>{t("feeding.midnightToNow")}</span>
                  </div>

                  <div className='milk-chip'>
                    <span className='milk-chip-label'>{t("feeding.milkPast24h")}</span>
                    <span className='milk-chip-value'>{milkTotals.last24hTotal} ml</span>
                    <span className='milk-chip-sub'>{t("feeding.rollingTotal")}</span>
                  </div>

                  <div className='milk-chip milk-chip-remaining'>
                    <span className='milk-chip-label'>{t("feeding.remainingMilk")}</span>
                    <span className='milk-chip-value'>
                      {remainingMilk != null ? `${remainingMilk} ml` : "—"}
                    </span>
                    <span className='milk-chip-sub'>
                      {advisedDailyMilk == null
                        ? t("feeding.addWeightForGuidance")
                        : remainingMilk === 0
                          ? t("feeding.goalReached")
                          : lastBottleAmount > 0
                            ? t("feeding.remainingBottlesEstimate", {
                                n: remainingBottles,
                                ml: lastBottleAmount,
                              })
                            : t("feeding.addFeedingForBottleEstimate")}
                    </span>
                  </div>

                  <div className='milk-chip milk-chip-guidance'>
                    <span className='milk-chip-label'>{t("feeding.advisedMax")}</span>
                    {advisedDailyMilk != null ? (
                      <>
                        <span className='milk-chip-value'>{advisedDailyMilk} ml</span>
                        <span className='milk-chip-sub'>
                          {t("feeding.maxPerDay", { n: maxDailyMilk })}
                        </span>
                      </>
                    ) : (
                      <span className='milk-chip-sub'>{t("feeding.addWeightForGuidance")}</span>
                    )}
                  </div>
                </div>
              </div>

              <div className='history-card card'>
                <div className='section-header'>
                  <h3>{t("feeding.milkHistory")}</h3>
                </div>
                <MilkList entries={milkEntries} babyId={babyState.id} onMutated={handleMutated} />
              </div>
            </>
          )}
        </section>
      )}

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
        aria-label={activeSection === "weight" ? t("weight.addWeight") : t("feeding.startFeeding")}
      >
        +
      </button>

      {modal === "add-weight" && (
        <AddWeightModal
          babyId={babyState.id}
          onClose={() => setModal(null)}
          onAdded={handleMutated}
        />
      )}
      {modal === "add-milk" && (
        <AddMilkModal
          babyId={babyState.id}
          onClose={() => setModal(null)}
          onAdded={handleMutated}
          defaultVolume={latestMilkVolume}
        />
      )}
      {modal === "timer" && (
        <FeedingTimerModal
          babyId={babyState.id}
          onClose={() => setModal(null)}
          onAdded={handleMutated}
          defaultVolume={latestMilkVolume}
        />
      )}
      {modal === "invite" && (
        <InviteModal
          babyId={babyState.id}
          babyName={babyState.name}
          onClose={() => setModal(null)}
        />
      )}
      {modal === "edit" && (
        <EditBabyModal
          baby={babyState}
          onClose={() => setModal(null)}
          onUpdated={handleBabyUpdated}
        />
      )}
    </div>
  );
}
