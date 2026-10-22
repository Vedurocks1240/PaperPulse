import Link from "next/link";
export default function Home() {
  return (
    <>
      <h1>PaperPulse</h1>
      <p>Keep your certificates in one place. Your school verifies them. Interviewers check them with your student ID, roll number and a code you share.</p>
      <div className="card">
        <pre>{`$ paperpulse verify --student STU1001 --roll 23CS042 --code ******
✔ 2 documents shared by the student
✔ marksheet: verified by school
✔ expires in 59 minutes`}</pre>
      </div>
      <p><Link href="/login">Sign in as student or school</Link> · <Link href="/verify">Verify a student</Link></p>
    </>
  );
}
