import Nav from "../components/galaxy/Nav";
import Footer from "../components/galaxy/Footer";
import { useEffect, useState } from "react";
import { getBusiness } from "../lib/api";

const Section = ({ title, children }) => (
  <div className="mb-10">
    <h2 className="font-display text-2xl mb-3 text-white">{title}</h2>
    <div className="text-[#B9B9B9] leading-relaxed space-y-3 text-sm">{children}</div>
  </div>
);

export default function Privacy() {
  const [b, setB] = useState(null);
  useEffect(() => { getBusiness().then(setB).catch(()=>{}); }, []);
  return (
    <>
      <Nav />
      <main className="pt-32 pb-24">
        <div className="gx-container max-w-3xl">
          <p className="eyebrow mb-3">Privacy Policy</p>
          <h1 className="font-editorial text-4xl md:text-5xl mb-10">How we handle your data.</h1>
          <Section title="What we collect">
            <p>To confirm your appointment, we collect your name, phone number, and optionally your email and notes. We do not store card details — payments are processed securely by our payment gateway.</p>
          </Section>
          <Section title="How we use it">
            <p>Your details are used only to manage your bookings, share appointment confirmations and, if you opt in, occasional service updates. We never sell or share your data with third parties for marketing.</p>
          </Section>
          <Section title="Your rights">
            <p>You can request access, correction or deletion of your data any time. Reach us at <a className="text-white" href={`tel:${b?.phone}`}>{b?.phone}</a>.</p>
          </Section>
        </div>
      </main>
      <Footer business={b} />
    </>
  );
}
