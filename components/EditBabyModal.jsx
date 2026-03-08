"use client";

import { useActionState, useEffect, useState } from "react";
import { updateBabyAction } from "../app/actions.js";
import { toLocalDateInput } from "../lib/temporal.js";
import { useTranslation } from "./LocaleContext.jsx";
import Modal from "./Modal.jsx";

export default function EditBabyModal({ baby, onClose, onUpdated }) {
  const boundAction = updateBabyAction.bind(null, baby.id);
  const [state, action, pending] = useActionState(boundAction, null);
  const [photoUploading, setPhotoUploading] = useState(false);
  const [photoError, setPhotoError] = useState("");
  const [photoUrl, setPhotoUrl] = useState(baby.photo_url || "");
  const t = useTranslation();

  useEffect(() => {
    if (state?.success) {
      onUpdated();
    }
  }, [state?.success, onUpdated]);

  const today = toLocalDateInput();

  async function handlePhotoChange(event) {
    const file = event.target.files?.[0];
    if (!file) {
      return;
    }
    setPhotoError("");
    setPhotoUploading(true);
    try {
      const formData = new FormData();
      formData.append("photo", file);
      const res = await fetch(`/api/babies/${baby.id}/photo`, {
        method: "POST",
        body: formData,
      });
      const data = await res.json();
      if (!res.ok) {
        setPhotoError(data?.error || t("editBaby.failedUpload"));
      } else {
        setPhotoUrl(data.photo_url || "");
      }
    } catch {
      setPhotoError(t("editBaby.failedUpload"));
    } finally {
      setPhotoUploading(false);
    }
  }

  return (
    <Modal title={t("editBaby.title")} onClose={onClose}>
      <form action={action}>
        <input type='hidden' name='photo_url' value={photoUrl} />
        <div className='form-group'>
          <label htmlFor='baby_photo'>{t("editBaby.photo")}</label>
          <div className='photo-picker'>
            <div className='photo-preview'>
              {photoUrl ? (
                <img src={photoUrl} alt={baby.name} />
              ) : (
                <span className='photo-fallback'>{baby.name?.[0] || "👶"}</span>
              )}
            </div>
            <div className='photo-actions'>
              <input
                id='baby_photo'
                type='file'
                name='photo'
                accept='image/*'
                onChange={handlePhotoChange}
                disabled={photoUploading}
              />
              <span className='photo-hint'>{t("editBaby.photoHint")}</span>
            </div>
          </div>
          {photoError && <p className='error-msg'>{photoError}</p>}
        </div>
        <div className='form-group'>
          <label htmlFor='edit_baby_name'>{t("editBaby.name")}</label>
          <input id='edit_baby_name' type='text' name='name' defaultValue={baby.name} required />
        </div>
        <div className='form-group'>
          <label htmlFor='edit_baby_birth_date'>{t("editBaby.dateOfBirth")}</label>
          <input
            id='edit_baby_birth_date'
            type='date'
            name='birth_date'
            defaultValue={baby.birth_date}
            required
            max={today}
          />
        </div>
        <div className='form-group'>
          <label htmlFor='edit_baby_gender'>{t("editBaby.gender")}</label>
          <select id='edit_baby_gender' name='gender' defaultValue={baby.gender || ""}>
            <option value=''>{t("editBaby.preferNotToSay")}</option>
            <option value='female'>{t("editBaby.girl")}</option>
            <option value='male'>{t("editBaby.boy")}</option>
          </select>
        </div>
        {state?.error && <p className='error-msg'>{state.error}</p>}
        <div className='modal-actions'>
          <button type='button' className='btn btn-secondary' onClick={onClose}>
            {t("editBaby.cancel")}
          </button>
          <button type='submit' className='btn btn-primary' disabled={pending}>
            {pending ? <span className='spinner' /> : t("editBaby.save")}
          </button>
        </div>
      </form>
    </Modal>
  );
}
