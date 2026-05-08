import { Navbar } from "@/components/navbar";
import { Hero } from "@/components/hero";
import { Frameworks } from "@/components/landing/frameworks";
import { HowItWorks } from "@/components/landing/how-it-works";
import { Showcase } from "@/components/landing/showcase";
import { Faq } from "@/components/landing/faq";
import { CtaFooter } from "@/components/landing/cta-footer";
import { Footer } from "@/components/footer";

export default function Home() {
  return (
    <>
      <Navbar />
      <main className="flex flex-1 flex-col" id="hero">
        <Hero />
        <Frameworks />
        <HowItWorks />
        <Showcase />
        <Faq />
        <CtaFooter />
      </main>
      <Footer />
    </>
  );
}
