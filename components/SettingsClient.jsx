"use client";

import { useEffect, useMemo, useState } from "react";
import { updateLocaleAction } from "../app/actions.js";
import Modal from "./Modal.jsx";

const LOCALE_OPTIONS = [
  { value: "", label: "Browser default" },
  { value: "nl-NL", label: "Dutch (Netherlands)" },
  { value: "en-US", label: "English (United States)" },
  { value: "en-GB", label: "English (United Kingdom)" },
  { value: "fr-FR", label: "French (France)" },
  { value: "de-DE", label: "German (Germany)" },
  { value: "es-ES", label: "Spanish (Spain)" },
];

export default function SettingsClient({ locale }) {
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
      setImportError("Failed to save locale. Please try again.");
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
      setImportError("Please choose a zip file to import.");
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
        setImportError(result?.error || "Import failed. Please try again.");
      } else {
        setImportPreview(result);
        setShowPreview(true);
      }
    } catch (err) {
      console.error(err);
      setImportError("Import failed. Please try again.");
    } finally {
      setPreviewing(false);
    }
  }

  async function handleConfirmImport() {
    if (!importFile) {
      setImportError("Please choose a zip file to import.");
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
        setImportError(result?.error || "Import failed. Please try again.");
      } else {
        setImportResult(result);
        setShowPreview(false);
      }
    } catch (err) {
      console.error(err);
      setImportError("Import failed. Please try again.");
    } finally {
      setImporting(false);
    }
  }

  return (
    <div className='settings-page'>
      <div className='settings-card card'>
        <div className='section-header'>
          <h3>Feeding Defaults</h3>
        </div>
        <div className='settings-row'>
          <div>
            <div className='settings-label'>Feeding FAB action</div>
            <div className='settings-help'>What happens when you tap the + on the Feeding tab.</div>
          </div>
          <select value={feedFabAction} onChange={handleFabChange} className='settings-select'>
            <option value='timer'>Start timer</option>
            <option value='manual'>Manual add</option>
          </select>
        </div>
        <div className='settings-row'>
          <div>
            <div className='settings-label'>Feeding interval</div>
            <div className='settings-help'>
              Used for the next feeding schedule on the baby view.
            </div>
          </div>
          <select
            value={feedingIntervalHours}
            onChange={handleIntervalChange}
            className='settings-select'
          >
            <option value='1.5'>Every 1.5 hours</option>
            <option value='2'>Every 2 hours</option>
            <option value='2.5'>Every 2.5 hours</option>
            <option value='3'>Every 3 hours</option>
            <option value='3.5'>Every 3.5 hours</option>
            <option value='4'>Every 4 hours</option>
          </select>
        </div>
      </div>

      <div className='settings-card card'>
        <div className='section-header'>
          <h3>Locale</h3>
        </div>
        <div className='settings-row'>
          <div>
            <div className='settings-label'>Date and time culture</div>
            <div className='settings-help'>
              Override your browser locale for dates, times, and chart labels.
            </div>
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
          <h3>Import Data</h3>
        </div>
        <p className='settings-help' style={{ marginBottom: "0.75rem" }}>
          Import Formula (milk) and Growth (weight) entries from Baby Tracker CSV exports.
        </p>
        <div className='form-group'>
          <label htmlFor='importZip'>Zip file</label>
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
          {previewing ? <span className='spinner' /> : "Preview import"}
        </button>
        {importError && (
          <p className='error-msg' style={{ marginTop: "0.75rem" }}>
            {importError}
          </p>
        )}
        {importResult && (
          <div className='import-result'>
            {importResult.babiesToCreate?.length > 0 && (
              <div>Babies created: {importResult.babiesToCreate.length}</div>
            )}
            <div>Milk entries: {importResult.countsByType?.formula || 0}</div>
            <div>Weight entries: {importResult.countsByType?.growth || 0}</div>
            {importResult.skipped > 0 && <div>Skipped duplicates: {importResult.skipped}</div>}
          </div>
        )}
      </div>
      {showPreview && importPreview && (
        <Modal title='Review import' onClose={() => setShowPreview(false)}>
          <p className='settings-help' style={{ marginBottom: "0.75rem" }}>
            Review what will be created or reused before importing.
          </p>
          <div className='import-preview'>
            <div className='import-preview-row'>
              <div className='import-preview-label'>Babies to create</div>
              <div className='import-preview-value'>{importPreview.babiesToCreate.length}</div>
            </div>
            <div className='import-preview-row'>
              <div className='import-preview-label'>Babies to reuse</div>
              <div className='import-preview-value'>{importPreview.babiesToReuse.length}</div>
            </div>
            {summaryCounts.map((item) => (
              <div className='import-preview-row' key={item.key}>
                <div className='import-preview-label'>
                  {item.key === "formula" ? "Milk entries" : "Weight entries"}
                </div>
                <div className='import-preview-value'>{item.count}</div>
              </div>
            ))}
            {importPreview.skipped > 0 && (
              <div className='import-preview-row'>
                <div className='import-preview-label'>Duplicates skipped</div>
                <div className='import-preview-value'>{importPreview.skipped}</div>
              </div>
            )}
          </div>
          {(importPreview.babiesToCreate.length > 0 || importPreview.babiesToReuse.length > 0) && (
            <div className='import-preview-list'>
              {importPreview.babiesToCreate.length > 0 && (
                <div>
                  <div className='import-preview-heading'>Create</div>
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
                  <div className='import-preview-heading'>Reuse</div>
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
              Cancel
            </button>
            <button
              type='button'
              className='btn btn-primary'
              onClick={handleConfirmImport}
              disabled={importing}
            >
              {importing ? <span className='spinner' /> : "Import now"}
            </button>
          </div>
        </Modal>
      )}
    </div>
  );
}
