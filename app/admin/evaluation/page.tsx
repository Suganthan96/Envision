import { redirect } from "next/navigation"

/** Moved into the Judging hub. */
export default function AdminEvaluationPage() {
  redirect("/admin/judging/rounds")
}
