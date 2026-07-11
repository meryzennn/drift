import LeftSidebar from "@/components/LeftSidebar";
import RightSidebar from "@/components/RightSidebar";

export default function MainLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <div className="w-full flex justify-start gap-lg xl:gap-xl mt-lg pb-2xl md:pb-0 min-h-screen px-4 md:px-8 xl:px-16">
      <LeftSidebar />
      <main className="w-full max-w-[42rem] flex-1 flex flex-col gap-md">
        {children}
      </main>
      <RightSidebar />
    </div>
  );
}
