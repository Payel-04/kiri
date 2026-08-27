import { useState } from 'react';
import { AuthProvider } from '@/context/AuthContext';
import ErrorBoundary from '@/components/ErrorBoundary';
import Navbar from '@/components/Navbar';
import AuthModal from '@/components/AuthModal';
import Hero from '@/components/Hero';
import About from '@/components/About';
import Translate from '@/components/Translate';
import Dictionary from '@/components/Dictionary';
import Community from '@/components/Community';
import Learn from '@/components/Learn';
import Footer from '@/components/Footer';

function AppContent() {
  const [authOpen, setAuthOpen] = useState(false);

  return (
    <div className="min-h-screen overflow-x-hidden bg-white text-slate-900">
      <Navbar onAuthClick={() => setAuthOpen(true)} />
      <main>
        <Hero onAuthClick={() => setAuthOpen(true)} />
        <About />
        <Translate onAuthClick={() => setAuthOpen(true)} />
        <Dictionary />
        <Community onAuthClick={() => setAuthOpen(true)} />
        <Learn />
      </main>
      <Footer />
      {authOpen && <AuthModal onClose={() => setAuthOpen(false)} />}
    </div>
  );
}

function App() {
  return (
    <ErrorBoundary>
      <AuthProvider>
        <AppContent />
      </AuthProvider>
    </ErrorBoundary>
  );
}

export default App;
