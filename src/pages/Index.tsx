import { useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { SiteHeader } from "@/components/SiteHeader";
import { SiteFooter } from "@/components/SiteFooter";
import { DonationCampaign } from "@/components/DonationCampaign";
import { DonationNotification } from "@/components/DonationNotification";

import { trackViewContent } from "@/lib/facebookPixel";

const Index = () => {
  const navigate = useNavigate();

  useEffect(() => {
    trackViewContent();
  }, []);

  return (
    <div className="flex min-h-screen flex-col bg-background">
      <SiteHeader />
      <main className="flex-1">
        <DonationCampaign onDonateClick={() => navigate("/checkout")} />
      </main>
      <SiteFooter />
      <DonationNotification />
    </div>
  );
};

export default Index;
