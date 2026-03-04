"use client";

import { useEffect, useActionState, useState } from "react";
import { updateBabyAction } from "../app/actions.js";
import Modal from "./Modal.jsx";

export default function EditBabyModal({ baby, onClose, onUpdated }) {
  const boundAction = updateBabyAction.bind(null, baby.id);
  const [state, action, pending] = useActionState(boundAction, null);
  const [photoUploading, setPhotoUploading] = useState(false);
  const [photoError, setPhotoError] = useState("");
  const [photoUrl, setPhotoUrl] = useState(baby.photo_url || "");

  useEffect(() => {
    if (state?.success) onUpdated();
  }, [state?.success]);

  const today = new Date().toISOString().split("T")[0];

  async function handlePhotoChange(event) {
    const file = event.target.files?.[0];
    if (!file) return;
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
        setPhotoError(data?.error || "Failed to upload photo");
      } else {
        setPhotoUrl(data.photo_url || "");
      }
    } catch {
      setPhotoError("Failed to upload photo");
    } finally {
      setPhotoUploading(false);
    }
  }

  return (
    <Modal title='Edit Baby' onClose={onClose}>
      <form action={action}>
        <input type='hidden' name='photo_url' value={photoUrl} />
        <div className='form-group'>
          <label>Photo</label>
          <div className='photo-picker'>
            <div className='photo-preview'>
              {photoUrl ? (
                <img src={photoUrl} alt={`${baby.name} photo`} />
              ) : (
                <span className='photo-fallback'>{baby.name?.[0] || "👶"}</span>
              )}
            </div>
            <div className='photo-actions'>
              <input
                type='file'
                name='photo'
                accept='image/*'
                onChange={handlePhotoChange}
                disabled={photoUploading}
              />
              <span className='photo-hint'>JPG, PNG, or WebP up to 5MB.</span>
            </div>
          </div>
          {photoError && <p className='error-msg'>{photoError}</p>}
        </div>
        <div className='form-group'>
          <label>Name</label>
          <input type='text' name='name' defaultValue={baby.name} required autoFocus />
        </div>
        <div className='form-group'>
          <label>Date of Birth</label>
          <input
            type='date'
            name='birth_date'
            defaultValue={baby.birth_date}
            required
            max={today}
          />
        </div>
        <div className='form-group'>
          <label>Gender</label>
          <select name='gender' defaultValue={baby.gender || ""}>
            <option value=''>Prefer not to say</option>
            <option value='female'>Girl</option>
            <option value='male'>Boy</option>
          </select>
        </div>
        {state?.error && <p className='error-msg'>{state.error}</p>}
        <div className='modal-actions'>
          <button type='button' className='btn btn-secondary' onClick={onClose}>
            Cancel
          </button>
          <button type='submit' className='btn btn-primary' disabled={pending}>
            {pending ? <span className='spinner' /> : "Save Changes"}
          </button>
        </div>
      </form>
    </Modal>
  );
}
