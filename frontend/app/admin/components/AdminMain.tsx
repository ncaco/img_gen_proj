export default function AdminMain({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return <main className="container mx-auto px-3 py-4">{children}</main>;
}
