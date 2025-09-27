import React from 'react';
import { Link } from 'react-router-dom';
import { Cpu, LayoutGrid, HeartPulse, Route } from 'lucide-react'; 

// Component for Feature Card (reused from previous design)
const FeatureCard = ({ icon: Icon, title, description }) => (
  <div className="p-6 bg-white rounded-lg shadow-xl hover:shadow-2xl transition duration-500 transform hover:-translate-y-1 border-t-4 border-red-500">
    <Icon className="w-10 h-10 text-red-600 mb-4" />
    <h3 className="text-xl font-bold mb-3 text-gray-900">{title}</h3>
    <p className="text-gray-600">{description}</p>
  </div>
);

// Main Landing Page Component (Cleaned)
const LandingPage = () => {
  return (
    // The main tag serves as the container for the page content, 
    // assuming the global layout handles the full height and flex-grow.
    <main className="flex-grow"> 
      
      {/* === 1. Hero Section === */}
      <section className="py-20 md:py-32 bg-gray-50 text-center">
        <img
          src="/organDonation.jpg"
          alt="Organ Donation"
          className="absolute inset-0 w-full h-full object-cover opacity-20 pointer-events-none"
          style={{ zIndex: 0 }}
        />
        <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8">
          <h1 className="text-5xl md:text-6xl font-extrabold text-gray-900 leading-tight mb-4">
            Saving Lives, <span className="text-red-600">Instantly.</span>
          </h1>
          <p className="text-xl text-gray-600 max-w-3xl mx-auto mb-8">
            A unified platform where **Agentic AI** connects the right donor with the right recipient based on compatibility, location, and critical urgency—eliminating life-threatening delays.
          </p>
          <div className="flex justify-center space-x-4">
            <Link
              to="/signup"
              className="py-3 px-8 bg-red-600 text-white text-lg font-semibold rounded-lg shadow-xl hover:bg-red-700 transition duration-300 transform hover:scale-[1.05]"
            >
              Become a Life-Saver
            </Link>
            <a
              href="#features"
              className="py-3 px-8 text-red-600 bg-white border-2 border-red-600 text-lg font-semibold rounded-lg hover:bg-red-50 transition duration-300"
            >
              Learn About Our AI
            </a>
          </div>
        </div>
      </section>

      {/* --- */}

      {/* === 2. Features Section (Value Proposition) === */}
      <section id="features" className="py-16 md:py-24 bg-white/">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-12">
            <span className="text-red-600 uppercase tracking-widest font-semibold text-sm">Technology for Humanity</span>
            <h2 className="text-4xl font-bold text-gray-900 mt-2">The Power of Agentic AI</h2>
            <p className="text-lg text-gray-500 mt-4">
              Our platform uses advanced AI to automate and optimize the entire donation logistics chain.
            </p>
          </div>
          
          <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-8">
            <FeatureCard 
              icon={Cpu}
              title="AI-Based Matching"
              description="Autonomously matches donors and recipients based on real-time compatibility, location, and urgency."
            />
            <FeatureCard 
              icon={LayoutGrid}
              title="Live Inventory Dashboard"
              description="Hospitals and blood banks dynamically update availability for complete, real-time transparency."
            />
            <FeatureCard 
              icon={HeartPulse}
              title="Emergency SOS System"
              description="Instant alerts to nearby, compatible donors during critical shortages with automated routing."
            />
            <FeatureCard 
              icon={Route}
              title="Logistics Optimization"
              description="AI agents proactively identify shortages, initiate outreach, and optimize transport routes."
            />
          </div>
        </div>
      </section>

      {/* --- */}

      {/* === 3. Call to Action (Secondary) === */}
      <section className="bg-red-600 py-16">
        <div className="max-w-4xl mx-auto text-center px-4">
          <h2 className="text-3xl font-bold text-white mb-4">
            Ready to Join the Network?
          </h2>
          <p className="text-xl text-red-100 mb-8">
            Whether you are a hospital, a blood bank, or a willing donor, your connection saves lives.
          </p>
          <Link
            to="/signup"
            className="py-3 px-10 bg-white text-red-600 text-lg font-bold rounded-lg shadow-2xl hover:bg-gray-100 transition duration-300"
          >
            Get Started Today
          </Link>
        </div>
      </section>
    </main>
  );
};

export default LandingPage;