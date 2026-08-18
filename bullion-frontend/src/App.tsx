import { useState } from 'react';
import { BrowserRouter, Navigate, Route, Routes } from 'react-router-dom';
import Providers from '@/components/gemfot/Providers';
import Header from '@/components/gemfot/Header';
import Sidebar from '@/components/gemfot/Sidebar';
import Footer from '@/components/gemfot/Footer';
import Explore from '@/app/Explore';
import LaunchToken from '@/app/LaunchToken';
import TokenDetail from '@/app/TokenDetail';
import Portfolio from '@/app/Portfolio';
import Faucet from '@/app/faucet/page';
import TokenTransfer from '@/app/transfer/page';

export default function App() {
  const [mobileOpen, setMobileOpen] = useState(false);

  return (
    <Providers>
      <BrowserRouter>
        <div className="flex flex-col min-h-screen bg-[#0B0E17] text-white">
          <Header mobileOpen={mobileOpen} setMobileOpen={setMobileOpen} />
          <Sidebar mobileOpen={mobileOpen} onCloseMobile={() => setMobileOpen(false)} />
          <div className="flex-1 md:pl-64 pt-[76px] flex flex-col min-h-screen">
            <main className="flex-1">
              <Routes>
                <Route path="/" element={<Explore />} />
                <Route path="/launch" element={<LaunchToken />} />
                <Route path="/token/:address" element={<TokenDetail />} />
                <Route path="/portfolio" element={<Portfolio />} />
                <Route path="/faucet" element={<Faucet />} />
                <Route path="/transfer" element={<TokenTransfer />} />
                <Route path="*" element={<Navigate to="/" replace />} />
              </Routes>
            </main>
            <Footer />
          </div>
        </div>
      </BrowserRouter>
    </Providers>
  );
}
