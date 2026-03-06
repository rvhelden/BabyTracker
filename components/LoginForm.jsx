"use client";

import Link from "next/link";
import { useActionState } from "react";
import { loginAction } from "../app/actions.js";

export default function LoginForm({ from }) {
  const [state, action, pending] = useActionState(loginAction, null);

  return (
    <div className='auth-page'>
      <div className='auth-card card'>
        <div className='auth-header'>
          <div className='auth-logo'>🍼</div>
          <h1>Baby Tracker</h1>
          <p>Sign in to your account</p>
        </div>
        <form action={action}>
          <input type='hidden' name='from' value={from} />
          <div className='form-group'>
            <label htmlFor='login_email'>Email</label>
            <input
              id='login_email'
              type='email'
              name='email'
              placeholder='you@example.com'
              required
            />
          </div>
          <div className='form-group'>
            <label htmlFor='login_password'>Password</label>
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
            {pending ? <span className='spinner' /> : "Sign In"}
          </button>
        </form>
        <p className='auth-footer'>
          Don't have an account? <Link href='/signup'>Sign up</Link>
        </p>
      </div>
    </div>
  );
}
