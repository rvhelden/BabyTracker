"use client";

import Image from "next/image.js";
import { useRouter } from "next/navigation";
import { useCallback, useEffect, useMemo, useRef, useState, useTransition } from "react";
import { deleteBabyAction, leaveBabyAction } from "../app/baby-actions.js";
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
import AddDiaperModal from "./AddDiaperModal.jsx";
import AddGrowthEntryModal from "./AddGrowthEntryModal.jsx";
import AddMedicationModal from "./AddMedicationModal.jsx";
import AddMilkModal from "./AddMilkModal.jsx";
import AddTemperatureModal from "./AddTemperatureModal.jsx";
import DiaperList from "./DiaperList.jsx";
import EditBabyModal from "./EditBabyModal.jsx";
import FeedingHourChart from "./FeedingHourChart.jsx";
import FeedingTimerModal from "./FeedingTimerModal.jsx";
import GrowthChart from "./GrowthChart.jsx";
import GrowthGainChart from "./GrowthGainChart.jsx";
import GrowthList from "./GrowthList.jsx";
import InviteModal from "./InviteModal.jsx";
import { useLocale, useTranslation } from "./LocaleContext.jsx";
import MedicationList from "./MedicationList.jsx";
import MilkChart from "./MilkChart.jsx";
import MilkList from "./MilkList.jsx";
import TemperatureList from "./TemperatureList.jsx";

function isEnglishLocale(locale) {
  return (locale || "").toLowerCase().startsWith("en");
}

function formatLengthFromCm(lengthCm, locale, fractionDigits = 1) {
  if (!Number.isFinite(lengthCm)) {
    return "—";
  }

  if (isEnglishLocale(locale)) {
    return `${(lengthCm / 2.54).toFixed(2)} in`;
  }

  return `${lengthCm.toFixed(fractionDigits)} cm`;
}

function formatLengthDeltaFromCm(lengthCm, locale, fractionDigits = 2) {
  if (!Number.isFinite(lengthCm)) {
    return "—";
  }

  const sign = lengthCm >= 0 ? "+" : "";
  if (isEnglishLocale(locale)) {
    return `${sign}${(lengthCm / 2.54).toFixed(fractionDigits)} in`;
  }

  return `${sign}${lengthCm.toFixed(fractionDigits)} cm`;
}

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

export default function BabyDetailClient({
  baby,
  growthEntries,
  milkEntries,
  diaperEntries,
  temperatureEntries,
  medicationEntries,
  predefinedMedications,
}) {
  const locale = useLocale()?.locale;
  const t = useTranslation();
  const [modal, setModal] = useState(null); // 'add-growth' | 'invite' | 'edit' | 'add-milk' | 'timer'
  const [activeSection, setActiveSection] = useState("feeding");
  const [showGrowthReports, setShowGrowthReports] = useState(false);
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
  }, [babyState?.id, baby?.id]);

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

  const latestWeight = useMemo(() => {
    for (let i = growthEntries.length - 1; i >= 0; i--) {
      if (growthEntries[i].weight_grams != null) {
        return growthEntries[i];
      }
    }
    return null;
  }, [growthEntries]);

  const firstWeight = useMemo(() => {
    for (let i = 0; i < growthEntries.length; i++) {
      if (growthEntries[i].weight_grams != null) {
        return growthEntries[i];
      }
    }
    return null;
  }, [growthEntries]);

  const latestLength = useMemo(() => {
    for (let i = growthEntries.length - 1; i >= 0; i--) {
      if (growthEntries[i].length_cm != null) {
        return growthEntries[i];
      }
    }
    return null;
  }, [growthEntries]);

  const firstLength = useMemo(() => {
    for (let i = 0; i < growthEntries.length; i++) {
      if (growthEntries[i].length_cm != null) {
        return growthEntries[i];
      }
    }
    return null;
  }, [growthEntries]);

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
    latestWeight && firstWeight && growthEntries.length > 1
      ? latestWeight.weight_grams - firstWeight.weight_grams
      : null;
  const lengthGainCm =
    latestLength && firstLength && growthEntries.length > 1
      ? latestLength.length_cm - firstLength.length_cm
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
    window.localStorage.removeItem("lastViewedBabyId");
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
    window.localStorage.removeItem("lastViewedBabyId");
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
            {babyState.role !== "owner" && (
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
          className={`tab-btn${activeSection === "growth" ? " active" : ""}`}
          onClick={() => setActiveSection("growth")}
          role='tab'
          aria-selected={activeSection === "growth"}
        >
          <span className='tab-icon'>📈</span>
          {t("tabs.growth")}
        </button>
        <button
          type='button'
          className={`tab-btn${activeSection === "feeding" ? " active" : ""}`}
          onClick={() => setActiveSection("feeding")}
          role='tab'
          aria-selected={activeSection === "feeding"}
        >
          <span className='tab-icon'>🍼</span>
          {t("tabs.feeding")}
        </button>
        <button
          type='button'
          className={`tab-btn${activeSection === "diaper" ? " active" : ""}`}
          onClick={() => setActiveSection("diaper")}
          role='tab'
          aria-selected={activeSection === "diaper"}
        >
          <span className='tab-icon'>🧷</span>
          {t("tabs.diaper")}
        </button>
        <button
          type='button'
          className={`tab-btn${activeSection === "temperature" ? " active" : ""}`}
          onClick={() => setActiveSection("temperature")}
          role='tab'
          aria-selected={activeSection === "temperature"}
        >
          <span className='tab-icon'>🌡️</span>
          {t("tabs.temperature")}
        </button>
        <button
          type='button'
          className={`tab-btn${activeSection === "medication" ? " active" : ""}`}
          onClick={() => setActiveSection("medication")}
          role='tab'
          aria-selected={activeSection === "medication"}
        >
          <span className='tab-icon'>💊</span>
          {t("tabs.medication")}
        </button>
      </div>

      {activeSection === "growth" && (
        <section className='detail-section' role='tabpanel'>
          <div className='section-title'>
            <h3>{t("growth.title")}</h3>
            <button
              type='button'
              className={`reports-icon-btn${showGrowthReports ? " active" : ""}`}
              onClick={() => setShowGrowthReports((v) => !v)}
              aria-label={t("reports.title")}
              title={t("reports.title")}
            >
              📊
            </button>
          </div>

          {showGrowthReports ? (
            <>
              <div className='chart-card card'>
                <div className='section-header'>
                  <h3>{t("growth.growthChart")}</h3>
                </div>
                {growthEntries.length > 0 ? (
                  <GrowthChart entries={growthEntries} birthDate={babyState.birth_date} />
                ) : (
                  <p className='chart-empty'>{t("growth.noEntries")}</p>
                )}
              </div>

              <div className='chart-card card'>
                <div className='section-header'>
                  <h3>{t("growth.gainLossChart")}</h3>
                </div>
                <GrowthGainChart entries={growthEntries} />
              </div>
            </>
          ) : (
            <>
              <div className='growth-summary'>
                <div className='summary-card card'>
                  <div className='summary-label'>{t("growth.currentWeight")}</div>
                  <div className='summary-value'>
                    {latestWeight ? `${(latestWeight.weight_grams / 1000).toFixed(2)} kg` : "—"}
                  </div>
                  {latestWeight && <div className='summary-sub'>{latestWeight.weight_grams} g</div>}
                </div>
                <div className='summary-card card'>
                  <div className='summary-label'>{t("growth.currentLength")}</div>
                  <div className='summary-value'>
                    {formatLengthFromCm(latestLength?.length_cm, locale)}
                  </div>
                  {latestLength && (
                    <div className='summary-sub'>
                      {formatLocalDate(parsePlainDate(latestLength.measured_at), locale)}
                    </div>
                  )}
                </div>
                <div className='summary-card card'>
                  <div className='summary-label'>{t("growth.gained")}</div>
                  <div
                    className={`summary-value ${gainGrams !== null && gainGrams >= 0 ? "gain-positive" : ""}`}
                  >
                    {gainGrams !== null ? `${gainGrams >= 0 ? "+" : ""}${gainGrams} g` : "—"}
                  </div>
                  {growthEntries.length > 1 && (
                    <div className='summary-sub'>
                      {t("growth.entries", { n: growthEntries.length })}
                    </div>
                  )}
                </div>
                <div className='summary-card card'>
                  <div className='summary-label'>{t("growth.lengthGained")}</div>
                  <div
                    className={`summary-value ${lengthGainCm !== null && lengthGainCm >= 0 ? "gain-positive" : ""}`}
                  >
                    {formatLengthDeltaFromCm(lengthGainCm, locale)}
                  </div>
                  {firstLength && <div className='summary-sub'>{t("growth.sinceBirth")}</div>}
                </div>
              </div>

              <div className='history-card card'>
                <div className='section-header'>
                  <h3>{t("growth.history")}</h3>
                </div>
                <GrowthList
                  entries={growthEntries}
                  babyId={babyState.id}
                  onMutated={handleMutated}
                />
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
                  <MilkChart entries={milkEntries} growthEntries={growthEntries} />
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

      {activeSection === "diaper" && (
        <section className='detail-section' role='tabpanel'>
          <div className='section-title'>
            <h3>{t("diaper.title")}</h3>
          </div>
          <div className='history-card card'>
            <DiaperList entries={diaperEntries} babyId={babyState.id} onMutated={handleMutated} />
          </div>
        </section>
      )}

      {activeSection === "temperature" && (
        <section className='detail-section' role='tabpanel'>
          <div className='section-title'>
            <h3>{t("temperature.title")}</h3>
          </div>
          <div className='history-card card'>
            <TemperatureList
              entries={temperatureEntries}
              babyId={babyState.id}
              onMutated={handleMutated}
            />
          </div>
        </section>
      )}

      {activeSection === "medication" && (
        <section className='detail-section' role='tabpanel'>
          <div className='section-title'>
            <h3>{t("medication.title")}</h3>
          </div>
          <MedicationList
            entries={medicationEntries}
            babyId={babyState.id}
            predefinedMedications={predefinedMedications}
            onMutated={handleMutated}
          />
        </section>
      )}

      <button
        type='button'
        className='fab'
        onClick={() => {
          if (activeSection === "growth") {
            setModal("add-growth");
          }
          if (activeSection === "feeding") {
            if (feedFabAction === "manual") {
              setModal("add-milk");
            } else {
              setModal("timer");
            }
          }
          if (activeSection === "diaper") {
            setModal("add-diaper");
          }
          if (activeSection === "temperature") {
            setModal("add-temperature");
          }
          if (activeSection === "medication") {
            setModal("add-medication");
          }
        }}
        aria-label={
          activeSection === "growth"
            ? t("growth.addEntry")
            : activeSection === "feeding"
              ? t("feeding.startFeeding")
              : activeSection === "diaper"
                ? t("diaper.addEntry")
                : activeSection === "temperature"
                  ? t("temperature.addEntry")
                  : t("medication.addEntry")
        }
      >
        +
      </button>

      {modal === "add-growth" && (
        <AddGrowthEntryModal
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
      {modal === "add-diaper" && (
        <AddDiaperModal
          babyId={babyState.id}
          onClose={() => setModal(null)}
          onAdded={handleMutated}
        />
      )}
      {modal === "add-temperature" && (
        <AddTemperatureModal
          babyId={babyState.id}
          onClose={() => setModal(null)}
          onAdded={handleMutated}
        />
      )}
      {modal === "add-medication" && (
        <AddMedicationModal
          babyId={babyState.id}
          predefinedMedications={predefinedMedications}
          entries={medicationEntries}
          onClose={() => setModal(null)}
          onAdded={handleMutated}
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
          canDelete={babyState.role === "owner"}
          onDelete={handleDelete}
          onClose={() => setModal(null)}
          onUpdated={handleBabyUpdated}
        />
      )}
    </div>
  );
}
