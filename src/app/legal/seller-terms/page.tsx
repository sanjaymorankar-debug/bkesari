import { CURRENT_POLICY_VERSION } from "@/lib/legal-docs";

export const metadata = { title: "Marketplace Seller Terms" };

export default function SellerTermsPage() {
  return (
    <>
      <h1>Marketplace Seller Terms</h1>
      <p>Last updated: {CURRENT_POLICY_VERSION}</p>

      <p>
        These terms apply to every shop listed on the platform. By
        registering a shop you agree to provide accurate information and to
        keep it up to date.
      </p>

      <h2>Information you must provide</h2>
      <ul>
        <li>Legal/business name and registered shop address.</li>
        <li>A customer care contact — phone number and, where available, email.</li>
        <li>
          Applicable business registration details (e.g. GSTIN), where your
          business is required to hold one.
        </li>
        <li>
          For shops selling food products, a valid FSSAI licence or
          registration number for the food-safety category your business
          falls under. Requirements differ by scale and category — this
          platform does not assume every food shop needs the same class of
          licence, and does not itself determine which class applies to you;
          consult FSSAI guidance or a licensed professional.
        </li>
        <li>Accurate product listings — price, availability, and description.</li>
        <li>A return/refund policy for your shop, if it differs from the platform default.</li>
      </ul>

      <h2>Displayed to customers</h2>
      <p>
        Your legal/business name, customer care contact, GSTIN (if on file),
        FSSAI licence number (if your shop type is food-related and it is on
        file), and return policy are shown on your public shop page before a
        customer orders from you. This information is set by the platform
        based on what you provide, and is not directly editable by you inside
        the app — contact the platform to update it.
      </p>

      <h2>Pricing and changes</h2>
      <p>
        Price changes go through the platform&apos;s review workflow before
        going live, so customers are never shown a price the platform has not
        reviewed for accuracy.
      </p>

      <h2>Customer data</h2>
      <p>
        You receive only what is necessary to fulfil an order: the
        customer&apos;s name, delivery address, phone number, and order
        contents. You must not use this information for any purpose beyond
        fulfilling that order, and must not contact customers for unrelated
        marketing.
      </p>

      <h2>Compliance</h2>
      <p>
        You are responsible for complying with all laws applicable to your
        business, including food-safety, weights-and-measures, and tax law.
        The platform may request evidence of required licences and may
        suspend a listing that cannot demonstrate compliance when required.
      </p>
    </>
  );
}
