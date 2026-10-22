"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";
import { supabaseBrowser } from "@/lib/supabase/client";

export default function Login() {
  const router = useRouter();
  const [signup, setSignup] = useState(false);
  const [f, setF] = useState({ email: "", password: "", full_name: "", student_id: "", roll_no: "", school: "" });
  const [msg, setMsg] = useState("");
  const on = (k: keyof typeof f) => (e: React.ChangeEvent<HTMLInputElement>) => setF({ ...f, [k]: e.target.value });

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    const sb = supabaseBrowser();
    if (signup) {
      const { email, password, ...data } = f;
      const { data: r, error } = await sb.auth.signUp({ email, password, options: { data } });
      if (error) return setMsg(error.message);
      if (!r.session) return setMsg("Check your email to confirm your account, then sign in.");
    } else {
      const { error } = await sb.auth.signInWithPassword({ email: f.email, password: f.password });
      if (error) return setMsg(error.message);
    }
    router.push("/dashboard");
    router.refresh();
  }
  return (
    <form className="card" onSubmit={submit}>
      <h1>{signup ? "Create a student account" : "Sign in"}</h1>
      <label htmlFor="email">Email</label><input id="email" type="email" required value={f.email} onChange={on("email")} />
      <label htmlFor="pw">Password (8+ characters)</label><input id="pw" type="password" minLength={8} required value={f.password} onChange={on("password")} />
      {signup && (
        <div className="grid">
          <div><label htmlFor="n">Full name</label><input id="n" required value={f.full_name} onChange={on("full_name")} /></div>
          <div><label htmlFor="s">Student ID from your school</label><input id="s" required value={f.student_id} onChange={on("student_id")} /></div>
          <div><label htmlFor="r">Roll no.</label><input id="r" required value={f.roll_no} onChange={on("roll_no")} /></div>
          <div><label htmlFor="sc">School</label><input id="sc" required value={f.school} onChange={on("school")} /></div>
        </div>
      )}
      <p role="alert" className="bad">{msg}</p>
      <button className="pri" type="submit">{signup ? "Create account" : "Sign in"}</button>{" "}
      <button type="button" onClick={() => { setSignup(!signup); setMsg(""); }}>{signup ? "I have an account" : "Create an account"}</button>
    </form>
  );
}
