import LeftSidebar from "@/components/LeftSidebar";
import RightSidebar from "@/components/RightSidebar";

export default function MainLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <div className="w-full max-w-7xl mx-auto flex justify-center gap-6 pb-2xl md:pb-0 min-h-screen px-4 md:px-8 xl:px-4">
      <LeftSidebar />
      <main className="flex-1 min-w-[300px] w-full max-w-[600px] flex flex-col gap-md mt-lg">
        {children}
      </main>
      <RightSidebar />
    </div>
  );
}
