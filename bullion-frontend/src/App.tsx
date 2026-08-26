import { BrowserRouter, Navigate, Route, Routes } from 'react-router-dom';
import Providers from '@/components/gemfot/Providers';
import Header from '@/components/gemfot/Header';
import Footer from '@/components/gemfot/Footer';
import Explore from '@/app/Explore';
import LaunchToken from '@/app/LaunchToken';
import TokenDetail from '@/app/TokenDetail';
import Portfolio from '@/app/Portfolio';
import Faucet from '@/app/faucet/page';
import TokenTransfer from '@/app/transfer/page';
import Cover from '@/app/Cover';

export default function App() {
  return (
    <Providers>
      <BrowserRouter>
        <div className="flex flex-col min-h-screen bg-[#070910] text-white">
          <Header />
          <div className="flex-1 pt-[64px] flex flex-col min-h-screen">
            <main className="flex-1">
              <Routes>
                <Route path="/" element={<Explore />} />
                <Route path="/launch" element={<LaunchToken />} />
                <Route path="/token/:address" element={<TokenDetail />} />
                <Route path="/portfolio" element={<Portfolio />} />
                <Route path="/faucet" element={<Faucet />} />
                <Route path="/transfer" element={<TokenTransfer />} />
                <Route path="/cover" element={<Cover />} />
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
