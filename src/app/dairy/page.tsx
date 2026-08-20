import { redirect } from "next/navigation";

/** Superseded by the generic /category/[type] route; kept so old links still resolve. */
export default function DairyPage() {
  redirect("/category/DAIRY");
}
