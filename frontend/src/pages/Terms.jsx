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

export default function Terms() {
  const [b, setB] = useState(null);
  useEffect(() => { getBusiness().then(setB).catch(() => {}); }, []);

  return (
    <>
      <Nav />
      <main className="pt-36 md:pt-44 pb-24 bg-[#08080A]">
        <div className="gx-container max-w-4xl">
          <Reveal>
            <Eyebrow>Terms & Conditions</Eyebrow>
            <EditorialHeading as="h1" size="lg" className="mt-6 mb-16">
              Fair, simple, <span className="italic-accent text-[#C21A1A]">transparent.</span>
            </EditorialHeading>
          </Reveal>

          <Section title="Booking deposit" index={1}>
            <p>A small deposit (approximately 25–30% of the service price) is charged to confirm your slot. This amount is adjusted against your final bill at the salon.</p>
          </Section>
          <Section title="Rescheduling & cancellation" index={2}>
            <p>You may reschedule free of charge up to 4 hours before your appointment. Cancellations within 4 hours may forfeit the deposit.</p>
          </Section>
          <Section title="No-shows" index={3}>
            <p>If you miss an appointment without notice, the deposit is not refundable.</p>
          </Section>
          <Section title="Service outcomes" index={4}>
            <p>Our stylists provide professional guidance suited to your hair and skin. Results can vary based on individual condition and care after the appointment.</p>
          </Section>
        </div>
      </main>
      <Footer business={b} />
    </>
  );
}
