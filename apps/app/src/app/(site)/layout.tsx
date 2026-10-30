import { Sidebar } from "@/components/nav/Sidebar";
import { MobileNav } from "@/components/nav/MobileNav";
import { Footer } from "@/components/nav/Footer";
import { WinAlert } from "@/components/WinAlert";
import { GlobalSearch } from "@/components/search/GlobalSearch";

/**
 * The app's chrome — rail, phone tab bar, search and footer — around every
 * page except the landing page, which stands on its own.
 */
export default function SiteLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <>
      <Sidebar />
      <MobileNav />
      <main className="min-w-0 lg:pl-[var(--sidebar-width)] max-lg:pt-[var(--mobile-header-offset)] max-lg:pb-[var(--mobile-nav-offset)]">
        <GlobalSearch />
        <div className="min-w-0 w-full mx-auto max-w-[1560px] lg:px-8 lg:py-8 max-lg:px-4 max-lg:py-4 max-lg:pb-10">
          <WinAlert />
          {children}
          <Footer />
        </div>
      </main>
    </>
  );
}
