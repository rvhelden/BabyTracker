import Link from "next/link";
import AcceptInviteClient from "../../../components/AcceptInviteClient.jsx";
import { getInviteByToken } from "../../../lib/dal.js";
import { getUser } from "../../../lib/session.js";
import { nowInstant, parseInstant } from "../../../lib/temporal.js";

export default async function InvitePage({ params }) {
  const { token } = await params;
  const user = await getUser();

  const invite = getInviteByToken(token);

  if (!invite) {
    return (
      <div className='auth-page'>
        <div className='auth-card card invite-accept-card'>
          <div className='auth-header'>
            <div className='auth-logo'>🍼</div>
            <h1>Baby Tracker</h1>
          </div>
          <div className='invite-error'>
            <p className='error-msg'>Invite not found or already used.</p>
            <Link
              href='/'
              className='btn btn-primary'
              style={{ display: "inline-block", marginTop: "1rem" }}
            >
              Go to Dashboard
            </Link>
          </div>
        </div>
      </div>
    );
  }

  const expiresAt = parseInstant(invite.expires_at);
  const now = nowInstant();
  const isExpired = expiresAt ? expiresAt.epochMilliseconds < now.epochMilliseconds : true;

  if (invite.used_at || isExpired) {
    return (
      <div className='auth-page'>
        <div className='auth-card card invite-accept-card'>
          <div className='auth-header'>
            <div className='auth-logo'>🍼</div>
            <h1>Baby Tracker</h1>
          </div>
          <div className='invite-error'>
            <p className='error-msg'>
              {invite.used_at ? "This invite has already been used." : "This invite has expired."}
            </p>
            <Link
              href='/'
              className='btn btn-primary'
              style={{ display: "inline-block", marginTop: "1rem" }}
            >
              Go to Dashboard
            </Link>
          </div>
        </div>
      </div>
    );
  }

  return (
    <AcceptInviteClient
      token={token}
      invite={{
        babyName: invite.baby_name,
        birthDate: invite.birth_date,
        invitedBy: invite.invited_by,
        expiresAt: invite.expires_at,
      }}
      isLoggedIn={!!user}
    />
  );
}
