import { ReactNode } from "react";
import { useNavigate } from "react-router-dom";

interface LayoutProps {
  children: ReactNode;
}

const Layout = ({ children }: LayoutProps) => {
  const navigate = useNavigate();

  return (
    <div className="min-h-screen bg-black text-white">
      {/* Cabeçalho com logo */}
      <header className="p-4 md:p-6 border-b border-zinc-800">
        <div className="max-w-6xl mx-auto flex justify-center md:justify-start items-center">
          <div 
            className="cursor-pointer flex items-center"
            onClick={() => navigate("/")}
          >
            <img
              src="/logo-blackout.png"
              alt="Blackout Logo"
              className="h-12 md:h-16 object-contain"
            />
          </div>
        </div>
      </header>
      
      {/* Conteúdo principal */}
      <main>
        {children}
      </main>
    </div>
  );
};

export default Layout; 