export default function AuthFlowLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="flex min-h-screen items-center justify-center bg-surface-foreground-01 px-6 py-12">
      <div className="w-full max-w-sm">{children}</div>
    </div>
  );
}
