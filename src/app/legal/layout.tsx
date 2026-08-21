import Link from "next/link";

import { Alert } from "@/components/ui";
import { LEGAL_DOCS } from "@/lib/legal-docs";

export default function LegalLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="grid gap-6 lg:grid-cols-[220px_1fr]">
      <nav className="lg:sticky lg:top-4 lg:self-start">
        <ul className="flex flex-wrap gap-2 lg:flex-col lg:gap-1">
          {LEGAL_DOCS.map((doc) => (
            <li key={doc.slug}>
              <Link
                href={`/legal/${doc.slug}`}
                className="block rounded-lg px-3 py-2 text-sm text-ink-600 hover:bg-cream-100 hover:text-ink-900"
              >
                {doc.shortLabel}
              </Link>
            </li>
          ))}
        </ul>
      </nav>
      <div className="min-w-0">
        <div className="mb-6">
          <Alert tone="info">
            These documents describe how this platform currently operates.
            They are provided for transparency and are not a substitute for
            review by a qualified Indian lawyer or compliance professional
            before this site is used to transact with real customers.
          </Alert>
        </div>
        <article className="legal-doc max-w-none text-sm leading-relaxed text-ink-700">
          {children}
        </article>
      </div>
    </div>
  );
}
