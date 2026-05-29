import { useLocation, useNavigate } from "react-router-dom";
import { useEffect } from "react";
import { Heart, ArrowLeft } from "lucide-react";

const NotFound = () => {
  const location = useLocation();
  const navigate  = useNavigate();

  useEffect(() => {
    console.error("404: Rota não encontrada →", location.pathname);
  }, [location.pathname]);

  return (
    <div className="flex min-h-screen flex-col items-center justify-center section-soft px-4 text-center">
      <div className="animate-fade-in-up rounded-2xl bg-white p-10 shadow-elevated max-w-sm w-full">
        <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-full bg-primary/10">
          <Heart className="h-8 w-8 text-primary" />
        </div>

        <h1 className="mt-4 font-display text-5xl font-bold text-foreground">404</h1>
        <p className="mt-2 text-lg font-semibold text-foreground">Página não encontrada</p>
        <p className="mt-1 text-sm text-muted-foreground">
          Mas a Duda ainda precisa do seu apoio. Volte à campanha!
        </p>

        <button
          onClick={() => navigate("/")}
          className="btn-primary mt-6 w-full"
          id="notfound-home-btn"
        >
          <ArrowLeft className="h-4 w-4" />
          Voltar à campanha
        </button>
      </div>
    </div>
  );
};

export default NotFound;
