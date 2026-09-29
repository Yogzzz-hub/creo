import { Link } from "react-router";
import { Github, Linkedin, Twitter, Youtube } from "lucide-react";

export function Footer() {
  return (
    <footer data-footer className="w-full bg-deep-surface border-t border-hairline py-12">
      <div className="mx-auto max-w-[1240px] px-6">
        
        {/* Pre-Footer Conversion Bento Banner */}
        <div className="bg-[#121926] border border-[#222F44] rounded-3xl p-10 text-center mb-16 shadow-sm">
          <h2 className="text-3xl sm:text-4xl font-black text-[#F8FAFC] tracking-tight">
            Stop managing the chaos. Start operating the momentum.
          </h2>
          <p className="text-xs text-[#97A0B3] mt-2 mb-6 font-medium tracking-wide">
            Join 50+ modern creative agencies running on CREO OS.
          </p>
          <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
            <Link 
              to="/pricing" 
              className="w-full sm:w-auto bg-[#BCCCE6] text-[#050810] font-bold text-xs px-6 py-3 rounded-full hover:bg-white transition-colors"
            >
              Deploy CREO in Your Agency &rarr;
            </Link>
            <Link 
              to="/faq" 
              className="w-full sm:w-auto bg-transparent border border-[#222F44] text-[#F8FAFC] text-xs px-6 py-3 rounded-full hover:bg-[#121926] transition-colors"
            >
              Schedule Live Demo
            </Link>
          </div>
        </div>

        {/* Base Footer */}
        <div className="flex flex-col md:flex-row items-center justify-between gap-6 border-t border-hairline pt-8">
          <div className="flex items-center gap-4">
            <Link to="/" className="text-xl font-black tracking-tight text-off-white flex items-baseline">
              creo<span className="text-glow-blue text-2xl leading-none">.</span>
            </Link>
            <span className="text-slate-mist text-xs">
              &copy; 2026 CREO Technologies Inc. All rights reserved.
            </span>
          </div>

          <ul className="flex flex-wrap items-center justify-center gap-6 text-sm text-slate-mist">
            <li><Link to="/" className="hover:text-off-white transition-colors">Home</Link></li>
            <li><Link to="/portfolio" className="hover:text-off-white transition-colors">Work</Link></li>
            <li><Link to="/about" className="hover:text-off-white transition-colors">About</Link></li>
            <li><Link to="/process" className="hover:text-off-white transition-colors">Process</Link></li>
            <li><Link to="/contact" className="hover:text-off-white transition-colors">Contact</Link></li>
          </ul>

          <div className="flex items-center gap-4 text-slate-mist">
            <a href="https://github.com" target="_blank" rel="noopener noreferrer" className="hover:text-off-white transition-colors">
              <Github className="size-5" />
            </a>
            <a href="https://linkedin.com" target="_blank" rel="noopener noreferrer" className="hover:text-off-white transition-colors">
              <Linkedin className="size-5" />
            </a>
            <a href="https://twitter.com" target="_blank" rel="noopener noreferrer" className="hover:text-off-white transition-colors">
              <Twitter className="size-5" />
            </a>
            <a href="https://youtube.com" target="_blank" rel="noopener noreferrer" className="hover:text-off-white transition-colors">
              <Youtube className="size-5" />
            </a>
          </div>
        </div>

      </div>
    </footer>
  );
}
