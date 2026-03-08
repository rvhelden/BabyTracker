"use client";

import { useActionState, useEffect } from "react";
import { createBabyAction } from "../app/actions.js";
import { toLocalDateInput } from "../lib/temporal.js";
import { useTranslation } from "./LocaleContext.jsx";
import Modal from "./Modal.jsx";

export default function AddBabyModal({ onClose, onAdded }) {
  const [state, action, pending] = useActionState(createBabyAction, null);
  const t = useTranslation();

  useEffect(() => {
    if (state?.success) {
      onAdded();
    }
  }, [state?.success, onAdded]);

  const today = toLocalDateInput();

  return (
    <Modal title={t("addBaby.title")} onClose={onClose}>
      <form action={action}>
        <div className='form-group'>
          <label htmlFor='baby_name'>{t("addBaby.name")}</label>
          <input
            id='baby_name'
            type='text'
            name='name'
            placeholder={t("addBaby.namePlaceholder")}
            required
          />
        </div>
        <div className='form-group'>
          <label htmlFor='baby_birth_date'>{t("addBaby.dateOfBirth")}</label>
          <input id='baby_birth_date' type='date' name='birth_date' required max={today} />
        </div>
        <div className='form-group'>
          <label htmlFor='baby_gender'>{t("addBaby.gender")}</label>
          <select id='baby_gender' name='gender'>
            <option value=''>{t("addBaby.preferNotToSay")}</option>
            <option value='female'>{t("addBaby.girl")}</option>
            <option value='male'>{t("addBaby.boy")}</option>
          </select>
        </div>
        {state?.error && <p className='error-msg'>{state.error}</p>}
        <div className='modal-actions'>
          <button type='button' className='btn btn-secondary' onClick={onClose}>
            {t("addBaby.cancel")}
          </button>
          <button type='submit' className='btn btn-primary' disabled={pending}>
            {pending ? <span className='spinner' /> : t("addBaby.add")}
          </button>
        </div>
      </form>
    </Modal>
  );
}
