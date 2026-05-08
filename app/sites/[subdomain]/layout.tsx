export default function SitesLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="flex min-h-screen w-full bg-black">
      {children}
    </div>
  );
}
