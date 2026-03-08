"use client";

import Link from "next/link";
import { useActionState } from "react";
import { signupAction } from "../app/actions.js";
import { useTranslation } from "./LocaleContext.jsx";

export default function SignupForm() {
  const [state, action, pending] = useActionState(signupAction, null);
  const t = useTranslation();

  return (
    <div className='auth-page'>
      <div className='auth-card card'>
        <div className='auth-header'>
          <div className='auth-logo'>🍼</div>
          <h1>{t("auth.appName")}</h1>
          <p>{t("auth.createAccountTitle")}</p>
        </div>
        <form action={action}>
          <div className='form-group'>
            <label htmlFor='signup_name'>{t("auth.fullName")}</label>
            <input id='signup_name' type='text' name='name' placeholder='Jane Doe' required />
          </div>
          <div className='form-group'>
            <label htmlFor='signup_email'>{t("auth.email")}</label>
            <input
              id='signup_email'
              type='email'
              name='email'
              placeholder='you@example.com'
              required
            />
          </div>
          <div className='form-group'>
            <label htmlFor='signup_password'>{t("auth.password")}</label>
            <input
              id='signup_password'
              type='password'
              name='password'
              placeholder='At least 6 characters'
              required
              minLength={6}
            />
          </div>
          <div className='form-group'>
            <label htmlFor='signup_confirm'>{t("auth.confirmPassword")}</label>
            <input
              id='signup_confirm'
              type='password'
              name='confirm'
              placeholder='••••••••'
              required
            />
          </div>
          {state?.error && <p className='error-msg'>{state.error}</p>}
          <button type='submit' className='btn btn-primary auth-btn' disabled={pending}>
            {pending ? <span className='spinner' /> : t("auth.createAccount")}
          </button>
        </form>
        <p className='auth-footer'>
          {t("auth.haveAccount")} <Link href='/login'>{t("auth.signInLink")}</Link>
        </p>
      </div>
    </div>
  );
}
