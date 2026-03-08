"use client";

import Link from "next/link";
import { useActionState } from "react";
import { loginAction } from "../app/actions.js";
import { useTranslation } from "./LocaleContext.jsx";

export default function LoginForm({ from }) {
  const [state, action, pending] = useActionState(loginAction, null);
  const t = useTranslation();

  return (
    <div className='auth-page'>
      <div className='auth-card card'>
        <div className='auth-header'>
          <div className='auth-logo'>🍼</div>
          <h1>{t("auth.appName")}</h1>
          <p>{t("auth.signInTitle")}</p>
        </div>
        <form action={action}>
          <input type='hidden' name='from' value={from} />
          <div className='form-group'>
            <label htmlFor='login_email'>{t("auth.email")}</label>
            <input
              id='login_email'
              type='email'
              name='email'
              placeholder='you@example.com'
              required
            />
          </div>
          <div className='form-group'>
            <label htmlFor='login_password'>{t("auth.password")}</label>
            <input
              id='login_password'
              type='password'
              name='password'
              placeholder='••••••••'
              required
            />
          </div>
          {state?.error && <p className='error-msg'>{state.error}</p>}
          <button type='submit' className='btn btn-primary auth-btn' disabled={pending}>
            {pending ? <span className='spinner' /> : t("auth.signIn")}
          </button>
        </form>
        <p className='auth-footer'>
          {t("auth.noAccount")} <Link href='/signup'>{t("auth.signUpLink")}</Link>
        </p>
      </div>
    </div>
  );
}
