'use client';

import { useEffect, useState } from 'react';

export default function SettingsClient() {
  const [feedFabAction, setFeedFabAction] = useState('timer');
  const [importing, setImporting] = useState(false);
  const [importResult, setImportResult] = useState(null);
  const [importError, setImportError] = useState('');

  useEffect(() => {
    const saved = window.localStorage.getItem('feedFabAction');
    if (saved) setFeedFabAction(saved);
  }, []);

  function handleFabChange(e) {
    const value = e.target.value;
    setFeedFabAction(value);
    window.localStorage.setItem('feedFabAction', value);
  }

  async function handleImport() {
    setImportError('');
    setImportResult(null);
    setImporting(true);
    try {
      const res = await fetch('/api/import', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ sourcePath: 'd:/Downloads/csv' }),
        credentials: 'include',
      });
      const result = await res.json();
      if (!res.ok || result?.error) {
        setImportError(result?.error || 'Import failed. Please try again.');
      } else {
        setImportResult(result);
      }
    } catch (err) {
      console.error(err);
      setImportError('Import failed. Please try again.');
    } finally {
      setImporting(false);
    }
  }

  return (
    <div className="settings-page">
      <div className="settings-card card">
        <div className="section-header">
          <h3>Feeding Defaults</h3>
        </div>
        <div className="settings-row">
          <div>
            <div className="settings-label">Feeding FAB action</div>
            <div className="settings-help">What happens when you tap the + on the Feeding tab.</div>
          </div>
          <select value={feedFabAction} onChange={handleFabChange} className="settings-select">
            <option value="timer">Start timer</option>
            <option value="manual">Manual add</option>
          </select>
        </div>
      </div>

      <div className="settings-card card">
        <div className="section-header">
          <h3>Import Data</h3>
        </div>
        <p className="settings-help" style={{ marginBottom: '0.75rem' }}>
          Import Formula (milk) and Growth (weight) entries from Baby Tracker CSV exports.
        </p>
        <button className="btn btn-primary" onClick={handleImport} disabled={importing}>
          {importing ? <span className="spinner" /> : 'Import from d:/Downloads/csv'}
        </button>
        {importError && <p className="error-msg" style={{ marginTop: '0.75rem' }}>{importError}</p>}
        {importResult && (
          <div className="import-result">
            <div>Imported babies: {importResult.babiesCreated}</div>
            <div>Milk entries: {importResult.milkInserted}</div>
            <div>Weight entries: {importResult.weightInserted}</div>
            {importResult.skipped > 0 && <div>Skipped duplicates: {importResult.skipped}</div>}
          </div>
        )}
      </div>
    </div>
  );
}
