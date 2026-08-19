import { redirect } from "next/navigation";

/**
 * Operators and admins share one console; capability checks inside it decide
 * what renders. This route exists so the header can link each role somewhere
 * that reads naturally.
 */
export default function OperatorPage() {
  redirect("/admin");
}
