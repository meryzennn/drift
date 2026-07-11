import NavLinks from "./NavLinks";
import NewPostButton from "./NewPostButton";
import { supabase } from "@/utils/supabase";

export const revalidate = 0; // Disable caching

export default async function LeftSidebar() {
  return (
    <aside className="hidden lg:flex flex-col gap-md py-xl px-md w-64 h-[calc(100vh-4rem)] sticky top-16 border-r border-outline-variant text-primary bg-background overflow-y-auto hide-scrollbar">
      
      {/* Navigation */}
      <NavLinks />

      <NewPostButton />

      {/* Footer */}
      <div className="mt-auto pt-md flex flex-wrap gap-x-3 gap-y-1 px-2 font-body-sm text-outline text-[12px]">
        <a className="hover:underline" href="#">Terms of Service</a>
        <a className="hover:underline" href="#">Privacy Policy</a>
        <a className="hover:underline" href="#">Cookie Policy</a>
        <span>© 2024 Drift</span>
      </div>
    </aside>
  );
}
