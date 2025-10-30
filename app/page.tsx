import Hero from "@/components/landing/hero";
import Pricing from "@/components/landing/pricing";
import Testimonials from "@/components/landing/testimonials";
import Footer from "@/components/landing/footer";
import Navbar from "@/components/landing/navbar";
import Features from "@/components/landing/features";

export default function Home() {
  return (
    <div className="min-h-screen">
      <Navbar />
      <Hero />
      <Features />
      <Pricing />
      <Testimonials />
      <Footer />
    </div>
  );
}
