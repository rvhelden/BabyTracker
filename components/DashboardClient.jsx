"use client";

import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { useEffect, useState } from "react";
import { daysBetween, parsePlainDate, todayPlainDate } from "../lib/temporal.js";
import AddBabyModal from "./AddBabyModal.jsx";
import { useTranslation } from "./LocaleContext.jsx";

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

export default function DashboardClient({ babies }) {
  const [showAdd, setShowAdd] = useState(false);
  const router = useRouter();
  const searchParams = useSearchParams();
  const t = useTranslation();

  useEffect(() => {
    if (babies.length === 0) {
      return;
    }
    if (searchParams.get("dashboard") === "1") {
      return;
    }
    const lastBabyId = window.localStorage.getItem("lastViewedBabyId");
    if (!lastBabyId) {
      return;
    }
    const exists = babies.some((baby) => String(baby.id) === String(lastBabyId));
    if (exists) {
      router.replace(`/baby/${lastBabyId}`);
    }
  }, [babies, router, searchParams]);

  function handleAdded() {
    setShowAdd(false);
    router.refresh();
  }

  return (
    <div className='dashboard'>
      <div className='dashboard-header'>
        <div>
          <h2>{t("dashboard.title")}</h2>
          <p className='subtitle'>{t("dashboard.subtitle")}</p>
        </div>
      </div>

      {babies.length === 0 ? (
        <div className='empty-state card'>
          <div className='empty-icon'>🍼</div>
          <h3>{t("dashboard.noBabies")}</h3>
          <p>{t("dashboard.noBabiesHint")}</p>
        </div>
      ) : (
        <div className='babies-grid'>
          {babies.map((baby) => (
            <Link key={baby.id} href={`/baby/${baby.id}`} className='baby-card card'>
              <div className='baby-card-top'>
                <div className='baby-avatar'>
                  {baby.photo_url ? (
                    <img src={baby.photo_url} alt={baby.name} />
                  ) : (
                    genderIcon(baby.gender)
                  )}
                </div>
                <div className='baby-info'>
                  <h3>{baby.name}</h3>
                  <span className='baby-age'>{ageLabel(baby.birth_date, t)}</span>
                </div>
              </div>
              <div className='baby-stats'>
                {baby.latest_weight ? (
                  <div className='stat'>
                    <span className='stat-label'>{t("dashboard.latestGrowth")}</span>
                    <span className='stat-value'>{(baby.latest_weight / 1000).toFixed(2)} kg</span>
                    <span className='stat-sub'>{baby.latest_weight_date}</span>
                  </div>
                ) : (
                  <div className='stat no-data'>{t("dashboard.noGrowth")}</div>
                )}
              </div>
            </Link>
          ))}
        </div>
      )}

      <button
        type='button'
        className='fab'
        onClick={() => setShowAdd(true)}
        aria-label={t("dashboard.addBaby")}
      >
        +
      </button>

      {showAdd && <AddBabyModal onClose={() => setShowAdd(false)} onAdded={handleAdded} />}
    </div>
  );
}
