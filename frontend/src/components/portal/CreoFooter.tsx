import { Link } from "react-router";

export function CreoFooter() {
  return (
    <footer className="hidden md:block w-full border-t border-[#2A3446] bg-[#050810] mt-auto shrink-0">
      <div className="max-w-[1520px] mx-auto px-4 sm:px-6 lg:px-8 py-5 flex flex-col sm:flex-row items-center justify-between text-xs text-[#97A0B3] gap-3">
        <p>© 2026 Creo Creative Execution Unit. All rights reserved.</p>
        <div className="flex items-center gap-6">
          <Link to="/privacy" className="hover:text-white transition-colors">
            Privacy Policy
          </Link>
          <Link to="/terms" className="hover:text-white transition-colors">
            Terms of Service
          </Link>
          <a href="#" className="hover:text-white transition-colors">
            Security SLA
          </a>
        </div>
      </div>
    </footer>
  );
}
