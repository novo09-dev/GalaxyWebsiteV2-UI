import Nav from "../components/galaxy/Nav";
import Footer from "../components/galaxy/Footer";
import Eyebrow from "../components/galaxy/primitives/Eyebrow";
import EditorialHeading from "../components/galaxy/primitives/EditorialHeading";
import Reveal from "../components/galaxy/primitives/Reveal";
import { useEffect, useState } from "react";
import { getBusiness } from "../lib/api";

const Section = ({ title, index, children }) => (
  <Reveal className="mb-14 border-b border-[#17171A] pb-12 last:border-0">
    <div className="flex items-baseline gap-4 mb-4">
      <span className="num-tag">{String(index).padStart(2, "0")}</span>
      <h2 className="font-editorial text-2xl md:text-3xl text-[#F2EDE4]">{title}</h2>
    </div>
    <div className="text-[#B9B5AB] leading-relaxed space-y-3 text-[15px] md:text-base max-w-2xl">{children}</div>
  </Reveal>
);

export default function Privacy() {
  const [b, setB] = useState(null);
  useEffect(() => { getBusiness().then(setB).catch(() => {}); }, []);

  return (
    <>
      <Nav />
      <main className="pt-36 md:pt-44 pb-24 bg-[#08080A]">
        <div className="gx-container max-w-4xl">
          <Reveal>
            <Eyebrow>Privacy Policy</Eyebrow>
            <EditorialHeading as="h1" size="lg" className="mt-6 mb-16">
              How we handle <span className="italic-accent text-[#C21A1A]">your data.</span>
            </EditorialHeading>
          </Reveal>

          <Section title="What we collect" index={1}>
            <p>To confirm your appointment, we collect your name, phone number, and optionally your email and any notes you wish to share. We do not store card details — payments are processed securely by our payment gateway.</p>
          </Section>
          <Section title="How we use it" index={2}>
            <p>Your details are used only to manage your bookings, share appointment confirmations, and — if you opt in — occasional service updates. We never sell or share your data with third parties for marketing.</p>
          </Section>
          <Section title="Your rights" index={3}>
            <p>
              You can request access, correction, or deletion of your data at any time. Reach us at{" "}
              {b?.phone ? (
                <a className="text-[#F2EDE4] underline underline-offset-4 decoration-[#C21A1A]" href={`tel:${b.phone}`}>{b.phone}</a>
              ) : (
                <span className="text-[#F2EDE4]">our salon</span>
              )}
              {b?.email && (<> or email <a className="text-[#F2EDE4] underline underline-offset-4 decoration-[#C21A1A]" href={`mailto:${b.email}`}>{b.email}</a></>)}.
            </p>
          </Section>
        </div>
      </main>
      <Footer business={b} />
    </>
  );
}
