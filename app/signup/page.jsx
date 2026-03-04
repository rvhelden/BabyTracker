import { redirect } from "next/navigation";
import SignupForm from "../../components/SignupForm.jsx";
import { getUser } from "../../lib/session.js";

export default async function SignupPage() {
  const user = await getUser();
  if (user) {
    redirect("/");
  }

  return <SignupForm />;
}
