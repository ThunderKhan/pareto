import Link from "next/link";

export default function ForgotPasswordPage() {
  return <main className="auth-minimal"><Link href="/" className="auth-minimal__brand">pareto.</Link><div><p className="eyebrow">ACCOUNT RECOVERY</p><h1>Password recovery</h1><p>Email-based password recovery is planned for the Supabase integration and is not yet activated. No reset email is sent from this screen.</p><Link className="button button--dark" href="/login">Return to login →</Link></div></main>;
}
