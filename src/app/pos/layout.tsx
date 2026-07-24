export default function POSLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="flex h-screen w-full overflow-hidden bg-background">
      {/* Left side: Product Grid (occupies remaining space) */}
      <main className="flex-1 flex flex-col min-w-0 border-r border-border bg-muted/20">
        {children}
      </main>

      {/* Right side: Cart / Checkout (fixed width) */}
      
    </div>
  );
}
