"use client";

import { useEffect, useMemo, useState, useTransition } from "react";
import { logoutAction, updateLocaleAction } from "../app/auth-actions.js";
import { useTranslation } from "./LocaleContext.jsx";
import Modal from "./Modal.jsx";

export default function SettingsClient({ locale }) {
  const t = useTranslation();
  const [feedFabAction, setFeedFabAction] = useState("timer");
  const [feedingIntervalHours, setFeedingIntervalHours] = useState("3");
  const [selectedLocale, setSelectedLocale] = useState(locale || "");
  const [savingLocale, setSavingLocale] = useState(false);
  const [importing, setImporting] = useState(false);
  const [importResult, setImportResult] = useState(null);
  const [importError, setImportError] = useState("");
  const [importFile, setImportFile] = useState(null);
  const [previewing, setPreviewing] = useState(false);
  const [importPreview, setImportPreview] = useState(null);
  const [showPreview, setShowPreview] = useState(false);
  const [exporting, setExporting] = useState(false);
  const [exportError, setExportError] = useState("");
  const [logoutPending, startLogoutTransition] = useTransition();

  const LOCALE_OPTIONS = [
    { value: "", label: t("settings.browserDefault") },
    { value: "nl-NL", label: "Nederlands (Nederland)" },
    { value: "en-US", label: "English (United States)" },
    { value: "en-GB", label: "English (United Kingdom)" },
    { value: "fr-FR", label: "Français (France)" },
    { value: "de-DE", label: "Deutsch (Deutschland)" },
    { value: "es-ES", label: "Español (España)" },
  ];

  useEffect(() => {
    const saved = window.localStorage.getItem("feedFabAction");
    if (saved) {
      setFeedFabAction(saved);
    }
    const savedInterval = window.localStorage.getItem("feedingIntervalHours");
    if (savedInterval) {
      setFeedingIntervalHours(savedInterval);
    }
  }, []);

  function handleFabChange(e) {
    const value = e.target.value;
    setFeedFabAction(value);
    window.localStorage.setItem("feedFabAction", value);
  }

  function handleIntervalChange(e) {
    const value = e.target.value;
    setFeedingIntervalHours(value);
    window.localStorage.setItem("feedingIntervalHours", value);
  }

  async function handleLocaleChange(e) {
    const value = e.target.value;
    setSelectedLocale(value);
    setSavingLocale(true);
    try {
      const result = await updateLocaleAction(value);
      if (result?.error) {
        setImportError(result.error);
        return;
      }
      window.location.reload();
    } catch {
      setImportError(t("settings.failedLocale"));
    } finally {
      setSavingLocale(false);
    }
  }

  const summaryCounts = useMemo(() => {
    if (!importPreview?.countsByType) {
      return [];
    }
    return Object.entries(importPreview.countsByType).map(([key, count]) => ({
      key,
      count,
    }));
  }, [importPreview]);

  async function handlePreview() {
    setImportError("");
    setImportResult(null);
    setImportPreview(null);
    if (!importFile) {
      setImportError(t("settings.chooseZip"));
      return;
    }
    setPreviewing(true);
    try {
      const formData = new FormData();
      formData.append("file", importFile);
      formData.append("mode", "preview");
      const res = await fetch("/api/import", {
        method: "POST",
        body: formData,
        credentials: "include",
      });
      const result = await res.json();
      if (!res.ok || result?.error) {
        setImportError(result?.error || t("settings.importFailed"));
      } else {
        setImportPreview(result);
        setShowPreview(true);
      }
    } catch (err) {
      console.error(err);
      setImportError(t("settings.importFailed"));
    } finally {
      setPreviewing(false);
    }
  }

  async function handleConfirmImport() {
    if (!importFile) {
      setImportError(t("settings.chooseZip"));
      return;
    }
    setImportError("");
    setImportResult(null);
    setImporting(true);
    try {
      const formData = new FormData();
      formData.append("file", importFile);
      formData.append("mode", "import");
      const res = await fetch("/api/import", {
        method: "POST",
        body: formData,
        credentials: "include",
      });
      const result = await res.json();
      if (!res.ok || result?.error) {
        setImportError(result?.error || t("settings.importFailed"));
      } else {
        setImportResult(result);
        setShowPreview(false);
      }
    } catch (err) {
      console.error(err);
      setImportError(t("settings.importFailed"));
    } finally {
      setImporting(false);
    }
  }

  async function handleExport() {
    setExportError("");
    setExporting(true);
    try {
      const res = await fetch("/api/export", {
        method: "GET",
        credentials: "include",
      });

      if (!res.ok) {
        let message = t("settings.exportFailed");
        try {
          const data = await res.json();
          if (data?.error) {
            message = data.error;
          }
        } catch {
          // fall back to translated message
        }
        setExportError(message);
        return;
      }

      const blob = await res.blob();
      const disposition = res.headers.get("Content-Disposition") || "";
      const filenameMatch = disposition.match(/filename="?([^";]+)"?/i);
      const filename = filenameMatch?.[1] || "babytracker_export.zip";
      const url = window.URL.createObjectURL(blob);
      const anchor = document.createElement("a");
      anchor.href = url;
      anchor.download = filename;
      document.body.appendChild(anchor);
      anchor.click();
      anchor.remove();
      window.URL.revokeObjectURL(url);
    } catch {
      setExportError(t("settings.exportFailed"));
    } finally {
      setExporting(false);
    }
  }

  function handleLogout() {
    startLogoutTransition(() => logoutAction());
  }

  return (
    <div className='settings-page'>
      <div className='settings-card card'>
        <div className='section-header'>
          <h3>{t("settings.feedingDefaults")}</h3>
        </div>
        <div className='settings-row'>
          <div>
            <div className='settings-label'>{t("settings.feedingFabAction")}</div>
            <div className='settings-help'>{t("settings.feedingFabHelp")}</div>
          </div>
          <select value={feedFabAction} onChange={handleFabChange} className='settings-select'>
            <option value='timer'>{t("settings.startTimer")}</option>
            <option value='manual'>{t("settings.manualAdd")}</option>
          </select>
        </div>
        <div className='settings-row'>
          <div>
            <div className='settings-label'>{t("settings.feedingInterval")}</div>
            <div className='settings-help'>{t("settings.feedingIntervalHelp")}</div>
          </div>
          <select
            value={feedingIntervalHours}
            onChange={handleIntervalChange}
            className='settings-select'
          >
            <option value='1.5'>{t("settings.every1_5h")}</option>
            <option value='2'>{t("settings.every2h")}</option>
            <option value='2.5'>{t("settings.every2_5h")}</option>
            <option value='3'>{t("settings.every3h")}</option>
            <option value='3.5'>{t("settings.every3_5h")}</option>
            <option value='4'>{t("settings.every4h")}</option>
          </select>
        </div>
      </div>

      <div className='settings-card card'>
        <div className='section-header'>
          <h3>{t("settings.locale")}</h3>
        </div>
        <div className='settings-row'>
          <div>
            <div className='settings-label'>{t("settings.dateTimeCulture")}</div>
            <div className='settings-help'>{t("settings.dateTimeCultureHelp")}</div>
          </div>
          <select
            value={selectedLocale}
            onChange={handleLocaleChange}
            className='settings-select'
            disabled={savingLocale}
          >
            {LOCALE_OPTIONS.map((option) => (
              <option key={option.value || "browser-default"} value={option.value}>
                {option.label}
              </option>
            ))}
          </select>
        </div>
      </div>

      <div className='settings-card card'>
        <div className='section-header'>
          <h3>{t("settings.exportData")}</h3>
        </div>
        <p className='settings-help' style={{ marginBottom: "0.75rem" }}>
          {t("settings.exportHelp")}
        </p>
        <button
          type='button'
          className='btn btn-secondary'
          onClick={handleExport}
          disabled={exporting || importing || previewing}
        >
          {exporting ? <span className='spinner' /> : t("settings.exportNow")}
        </button>
        {exportError && (
          <p className='error-msg' style={{ marginTop: "0.75rem" }}>
            {exportError}
          </p>
        )}
      </div>

      <div className='settings-card card'>
        <div className='section-header'>
          <h3>{t("settings.importData")}</h3>
        </div>
        <p className='settings-help' style={{ marginBottom: "0.75rem" }}>
          {t("settings.importHelp")}
        </p>
        <div className='form-group'>
          <label htmlFor='importZip'>{t("settings.zipFile")}</label>
          <input
            id='importZip'
            type='file'
            accept='.zip'
            onChange={(e) => setImportFile(e.target.files?.[0] || null)}
          />
        </div>
        <button
          type='button'
          className='btn btn-primary'
          onClick={handlePreview}
          disabled={previewing || importing}
        >
          {previewing ? <span className='spinner' /> : t("settings.previewImport")}
        </button>
        {importError && (
          <p className='error-msg' style={{ marginTop: "0.75rem" }}>
            {importError}
          </p>
        )}
        {importResult && (
          <div className='import-result'>
            {importResult.babiesToCreate?.length > 0 && (
              <div>{t("settings.babiesCreated", { n: importResult.babiesToCreate.length })}</div>
            )}
            <div>{t("settings.milkEntries", { n: importResult.countsByType?.formula || 0 })}</div>
            <div>{t("settings.growthEntries", { n: importResult.countsByType?.growth || 0 })}</div>
            <div>{t("settings.diaperEntries", { n: importResult.countsByType?.diaper || 0 })}</div>
            <div>
              {t("settings.temperatureEntries", {
                n: importResult.countsByType?.temperature || 0,
              })}
            </div>
            <div>
              {t("settings.medicationEntries", {
                n: importResult.countsByType?.medication || 0,
              })}
            </div>
            {importResult.skipped > 0 && (
              <div>{t("settings.skippedDuplicates", { n: importResult.skipped })}</div>
            )}
          </div>
        )}
      </div>
      {showPreview && importPreview && (
        <Modal title={t("settings.reviewImport")} onClose={() => setShowPreview(false)}>
          <p className='settings-help' style={{ marginBottom: "0.75rem" }}>
            {t("settings.reviewInfo")}
          </p>
          <div className='import-preview'>
            <div className='import-preview-row'>
              <div className='import-preview-label'>{t("settings.babiesToCreate")}</div>
              <div className='import-preview-value'>{importPreview.babiesToCreate.length}</div>
            </div>
            <div className='import-preview-row'>
              <div className='import-preview-label'>{t("settings.babiesToReuse")}</div>
              <div className='import-preview-value'>{importPreview.babiesToReuse.length}</div>
            </div>
            {summaryCounts.map((item) => (
              <div className='import-preview-row' key={item.key}>
                <div className='import-preview-label'>
                  {item.key === "formula"
                    ? t("settings.milkEntriesPreview")
                    : item.key === "growth"
                      ? t("settings.growthEntriesPreview")
                      : item.key === "diaper"
                        ? t("settings.diaperEntriesPreview")
                        : item.key === "temperature"
                          ? t("settings.temperatureEntriesPreview")
                          : t("settings.medicationEntriesPreview")}
                </div>
                <div className='import-preview-value'>{item.count}</div>
              </div>
            ))}
            {importPreview.skipped > 0 && (
              <div className='import-preview-row'>
                <div className='import-preview-label'>{t("settings.duplicatesSkipped")}</div>
                <div className='import-preview-value'>{importPreview.skipped}</div>
              </div>
            )}
          </div>
          {(importPreview.babiesToCreate.length > 0 || importPreview.babiesToReuse.length > 0) && (
            <div className='import-preview-list'>
              {importPreview.babiesToCreate.length > 0 && (
                <div>
                  <div className='import-preview-heading'>{t("settings.create")}</div>
                  <div className='import-preview-tags'>
                    {importPreview.babiesToCreate.map((name) => (
                      <span className='badge badge-green' key={`create-${name}`}>
                        {name}
                      </span>
                    ))}
                  </div>
                </div>
              )}
              {importPreview.babiesToReuse.length > 0 && (
                <div>
                  <div className='import-preview-heading'>{t("settings.reuse")}</div>
                  <div className='import-preview-tags'>
                    {importPreview.babiesToReuse.map((name) => (
                      <span className='badge badge-blue' key={`reuse-${name}`}>
                        {name}
                      </span>
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}
          <div className='modal-actions'>
            <button
              type='button'
              className='btn btn-secondary'
              onClick={() => setShowPreview(false)}
            >
              {t("settings.importCancel")}
            </button>
            <button
              type='button'
              className='btn btn-primary'
              onClick={handleConfirmImport}
              disabled={importing}
            >
              {importing ? <span className='spinner' /> : t("settings.importNow")}
            </button>
          </div>
        </Modal>
      )}

      <div className='settings-card card'>
        <button
          type='button'
          className='btn btn-secondary settings-logout-btn'
          onClick={handleLogout}
          disabled={logoutPending}
        >
          {logoutPending ? <span className='spinner' /> : t("nav.logout")}
        </button>
      </div>
    </div>
  );
}
