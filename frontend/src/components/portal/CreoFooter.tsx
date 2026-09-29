import { Link } from "react-router";

export function CreoFooter() {
  return (
    <footer className="w-full border-t border-[#E2E8F0] bg-white mt-auto shrink-0">
      <div className="max-w-[1520px] mx-auto px-4 sm:px-6 lg:px-8 py-5 flex flex-col sm:flex-row items-center justify-between text-xs text-[#64748B] gap-3">
        <p>© 2026 Creo Creative Execution Unit. All rights reserved.</p>
        <div className="flex items-center gap-6">
          <Link to="/privacy" className="hover:text-[#0F172A] transition-colors">
            Privacy Policy
          </Link>
          <Link to="/terms" className="hover:text-[#0F172A] transition-colors">
            Terms of Service
          </Link>
          <a href="#" className="hover:text-[#0F172A] transition-colors">
            Security SLA
          </a>
        </div>
      </div>
    </footer>
  );
}
