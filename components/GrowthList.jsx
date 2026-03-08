"use client";

import { useActionState, useEffect, useState } from "react";
import { deleteGrowthEntryAction, updateGrowthEntryAction } from "../app/actions.js";
import { formatLocalDate, parsePlainDate } from "../lib/temporal.js";
import { useLocale, useTranslation } from "./LocaleContext.jsx";
import Modal from "./Modal.jsx";

function formatDateLabel(value, locale) {
  const date = parsePlainDate(value);
  if (!date) {
    return value;
  }
  return formatLocalDate(date, locale);
}

function isEnglishLocale(locale) {
  return (locale || "").toLowerCase().startsWith("en");
}

function formatLength(lengthCm, locale) {
  if (!Number.isFinite(lengthCm)) {
    return "—";
  }

  if (isEnglishLocale(locale)) {
    const inches = lengthCm / 2.54;
    return `${inches.toFixed(2)} in`;
  }

  return `${lengthCm.toFixed(1)} cm`;
}

function lengthInputDefault(lengthCm, locale) {
  if (!Number.isFinite(lengthCm)) {
    return "";
  }

  if (isEnglishLocale(locale)) {
    return (lengthCm / 2.54).toFixed(2);
  }

  return lengthCm.toFixed(1);
}

function EditForm({ entry, babyId, onDone, onDelete, deleting, locale }) {
  const boundUpdate = updateGrowthEntryAction.bind(null, babyId, entry.id);
  const [state, action, pending] = useActionState(boundUpdate, null);
  const [confirmingDelete, setConfirmingDelete] = useState(false);
  const t = useTranslation();
  const lengthUnit = isEnglishLocale(locale) ? "in" : "cm";

  useEffect(() => {
    if (state?.success) {
      onDone();
    }
  }, [state?.success, onDone]);

  return (
    <div className='growth-edit-form'>
      <form action={action}>
        <div className='form-group'>
          <label htmlFor='growth_edit_date'>{t("growthList.date")}</label>
          <input
            id='growth_edit_date'
            type='date'
            name='measured_at'
            defaultValue={entry.measured_at}
          />
        </div>
        <div className='form-group'>
          <label htmlFor='growth_edit_grams'>{t("growthList.weight")}</label>
          <input
            id='growth_edit_grams'
            type='number'
            name='weight_grams'
            defaultValue={entry.weight_grams ?? ""}
            min='100'
            max='50000'
          />
        </div>
        <div className='form-group' style={{ marginBottom: 0 }}>
          <label htmlFor='growth_edit_length'>{t("growthList.length", { unit: lengthUnit })}</label>
          <input
            id='growth_edit_length'
            type='number'
            name='length_value'
            defaultValue={lengthInputDefault(entry.length_cm, locale)}
            min='1'
            step='0.1'
            placeholder={t("growthList.lengthPlaceholder")}
          />
        </div>
        <div className='form-group' style={{ marginBottom: 0 }}>
          <label htmlFor='growth_edit_notes'>{t("growthList.notes")}</label>
          <input
            id='growth_edit_notes'
            type='text'
            name='notes'
            placeholder={t("growthList.noteOptional")}
            defaultValue={entry.notes || ""}
          />
        </div>
        {state?.error && <p className='error-msg'>{state.error}</p>}
        <div className='growth-edit-actions'>
          <button type='button' className='btn btn-secondary' onClick={onDone}>
            {t("growthList.cancel")}
          </button>
          <button type='submit' className='btn btn-primary' disabled={pending}>
            {pending ? <span className='spinner' /> : t("growthList.save")}
          </button>
        </div>
      </form>
      <div className='edit-dialog-delete'>
        {confirmingDelete ? (
          <div className='delete-confirm-row'>
            <span>{t("growthList.deleteConfirm")}</span>
            <button
              type='button'
              className='btn btn-secondary btn-sm'
              onClick={() => setConfirmingDelete(false)}
            >
              {t("growthList.cancel")}
            </button>
            <button
              type='button'
              className='btn btn-danger btn-sm'
              onClick={onDelete}
              disabled={deleting}
            >
              {deleting ? <span className='spinner' /> : t("growthList.deleteEntry")}
            </button>
          </div>
        ) : (
          <button
            type='button'
            className='btn btn-danger btn-sm'
            onClick={() => setConfirmingDelete(true)}
          >
            {t("growthList.deleteEntry")}
          </button>
        )}
      </div>
    </div>
  );
}

export default function GrowthList({ entries, babyId, onMutated }) {
  const locale = useLocale()?.locale;
  const t = useTranslation();
  const [dialogEntry, setDialogEntry] = useState(null);
  const [deleting, setDeleting] = useState(null);

  async function handleDelete(id) {
    setDeleting(id);
    try {
      const result = await deleteGrowthEntryAction(babyId, id);
      if (result?.error) {
        alert(result.error);
      } else {
        setDialogEntry(null);
        onMutated();
      }
    } finally {
      setDeleting(null);
    }
  }

  if (entries.length === 0) {
    return <p className='history-empty'>{t("growthList.noMeasurements")}</p>;
  }

  const sorted = [...entries].sort((a, b) => b.measured_at.localeCompare(a.measured_at));
  const openDialogEntry = dialogEntry ? entries.find((w) => w.id === dialogEntry) : null;

  return (
    <div>
      {openDialogEntry && (
        <Modal title={t("growthList.editTitle")} onClose={() => setDialogEntry(null)}>
          <EditForm
            entry={openDialogEntry}
            babyId={babyId}
            locale={locale}
            onDone={() => {
              setDialogEntry(null);
              onMutated();
            }}
            onDelete={() => handleDelete(openDialogEntry.id)}
            deleting={deleting === openDialogEntry.id}
          />
        </Modal>
      )}
      <div className='history-list'>
        {sorted.map((w, idx) => {
          const prev = sorted[idx + 1];
          const diff =
            prev && Number.isFinite(w.weight_grams) && Number.isFinite(prev.weight_grams)
              ? w.weight_grams - prev.weight_grams
              : null;

          return (
            <button
              key={w.id}
              type='button'
              className='history-row'
              onClick={() => setDialogEntry(w.id)}
            >
              <span className='history-row-icon'>⚖️</span>
              <div className='history-row-body'>
                <div className='history-row-title'>{formatDateLabel(w.measured_at, locale)}</div>
                <div className='history-row-sub'>
                  {formatLength(w.length_cm, locale)}
                  {w.notes ? ` · ${w.notes}` : ""}
                </div>
              </div>
              <div className='history-row-value'>
                {w.weight_grams != null ? (
                  <>
                    <div className='history-row-primary'>{w.weight_grams} g</div>
                    <div className='history-row-secondary'>
                      {(w.weight_grams / 1000).toFixed(3)} kg
                    </div>
                  </>
                ) : (
                  <div className='history-row-secondary'>—</div>
                )}
              </div>
              {diff !== null && (
                <div className='history-row-end'>
                  <span className={`history-badge ${diff >= 0 ? "pos" : "neg"}`}>
                    {diff >= 0 ? "+" : ""}
                    {diff} g
                  </span>
                </div>
              )}
            </button>
          );
        })}
      </div>
    </div>
  );
}
