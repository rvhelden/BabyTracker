"use client";

import Link from "next/link";
import { useActionState } from "react";
import { signupAction } from "../app/actions.js";

export default function SignupForm() {
  const [state, action, pending] = useActionState(signupAction, null);

  return (
    <div className='auth-page'>
      <div className='auth-card card'>
        <div className='auth-header'>
          <div className='auth-logo'>🍼</div>
          <h1>Baby Tracker</h1>
          <p>Create your account</p>
        </div>
        <form action={action}>
          <div className='form-group'>
            <label>Full Name</label>
            <input type='text' name='name' placeholder='Jane Doe' required autoFocus />
          </div>
          <div className='form-group'>
            <label>Email</label>
            <input type='email' name='email' placeholder='you@example.com' required />
          </div>
          <div className='form-group'>
            <label>Password</label>
            <input
              type='password'
              name='password'
              placeholder='At least 6 characters'
              required
              minLength={6}
            />
          </div>
          <div className='form-group'>
            <label>Confirm Password</label>
            <input type='password' name='confirm' placeholder='••••••••' required />
          </div>
          {state?.error && <p className='error-msg'>{state.error}</p>}
          <button type='submit' className='btn btn-primary auth-btn' disabled={pending}>
            {pending ? <span className='spinner' /> : "Create Account"}
          </button>
        </form>
        <p className='auth-footer'>
          Already have an account? <Link href='/login'>Sign in</Link>
        </p>
      </div>
    </div>
  );
}
