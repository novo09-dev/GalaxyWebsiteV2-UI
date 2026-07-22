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

export default function Terms() {
  const [b, setB] = useState(null);
  useEffect(() => { getBusiness().then(setB).catch(()=>{}); }, []);
  return (
    <>
      <Nav />
      <main className="pt-32 pb-24">
        <div className="gx-container max-w-3xl">
          <p className="eyebrow mb-3">Terms & Conditions</p>
          <h1 className="font-editorial text-4xl md:text-5xl mb-10">Fair, simple, transparent.</h1>
          <Section title="Booking deposit">
            <p>A small deposit (approximately 25–30% of the service price) is charged to confirm your slot. This amount is adjusted against your final bill.</p>
          </Section>
          <Section title="Rescheduling & cancellation">
            <p>You may reschedule free of charge up to 4 hours before your appointment. Cancellations within 4 hours may forfeit the deposit.</p>
          </Section>
          <Section title="No-shows">
            <p>If you miss an appointment without notice, the deposit is not refundable.</p>
          </Section>
          <Section title="Service outcomes">
            <p>Our stylists provide professional guidance suited to your hair and skin. Results can vary based on individual condition and care after the appointment.</p>
          </Section>
        </div>
      </main>
      <Footer business={b} />
    </>
  );
}
