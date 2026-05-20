import { useLocation, useNavigate } from "react-router-dom";
import { useEffect } from "react";
import { Search, Home, ArrowLeft } from "lucide-react";
import { Button } from "@/components/ui/button";

const NotFound = () => {
  const location = useLocation();
  const navigate = useNavigate();

  useEffect(() => {
    console.error("404 Error: User attempted to access non-existent route:", location.pathname);
  }, [location.pathname]);

  return (
    <div className="min-h-screen bg-slate-50 flex items-center justify-center p-4">
      <div className="max-w-md w-full bg-white rounded-3xl shadow-2xl border border-orange-100 overflow-hidden">
        <div className="bg-slate-900 p-8 flex justify-center relative overflow-hidden">
          {/* Decorative background elements */}
          <div className="absolute top-0 right-0 w-24 h-24 bg-orange-600/20 rounded-full blur-2xl -mr-12 -mt-12" />
          <div className="absolute bottom-0 left-0 w-24 h-24 bg-blue-600/20 rounded-full blur-2xl -ml-12 -mb-12" />
          
          <div className="w-20 h-20 bg-white/10 rounded-full flex items-center justify-center border border-white/20 relative z-10">
            <Search className="w-10 h-10 text-orange-500" />
          </div>
        </div>
        
        <div className="p-8 text-center">
          <div className="inline-block px-3 py-1 bg-orange-50 text-orange-600 text-[10px] font-black uppercase tracking-[0.2em] rounded-full mb-4">
            Error 404
          </div>
          <h1 className="text-2xl font-black text-slate-900 uppercase tracking-tight mb-2">
            Page Not Found
          </h1>
          <p className="text-slate-500 text-sm mb-8 leading-relaxed">
            The resource you are looking for might have been removed, had its name changed, or is temporarily unavailable.
          </p>
          
          <div className="flex flex-col gap-3">
            <Button 
              onClick={() => navigate("/")}
              className="w-full h-12 bg-orange-600 hover:bg-black text-white font-black uppercase tracking-widest rounded-xl transition-all shadow-lg shadow-orange-200"
            >
              <Home className="w-4 h-4 mr-2" /> Go to Home
            </Button>
            
            <Button 
              onClick={() => navigate(-1)}
              variant="outline"
              className="w-full h-12 border-2 border-slate-200 hover:bg-slate-50 text-slate-600 font-black uppercase tracking-widest rounded-xl transition-all"
            >
              <ArrowLeft className="w-4 h-4 mr-2" /> Previous Page
            </Button>
          </div>
        </div>
        
        <div className="px-8 py-4 bg-slate-50 border-t border-slate-100 text-center">
          <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">
            VisionPulse Clinical Suite • v1.0
          </p>
        </div>
      </div>
    </div>
  );
};

export default NotFound;

