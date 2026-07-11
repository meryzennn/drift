import NavLinks from "./NavLinks";
import NewPostButton from "./NewPostButton";
import LeftSidebarProfile from "./LeftSidebarProfile";

export const revalidate = 0; // Disable caching

export default async function LeftSidebar() {
  return (
    <aside className="hidden lg:flex flex-col gap-md py-xl px-md w-64 h-[calc(100vh-64px)] sticky top-[64px] border-r border-outline-variant text-primary bg-background overflow-y-auto hide-scrollbar">
      
      {/* Navigation */}
      <NavLinks />

      <NewPostButton />

      <LeftSidebarProfile />

    </aside>
  );
}
