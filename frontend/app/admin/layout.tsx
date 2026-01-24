import type { Metadata } from "next";
import "./admin.css";
import AdminFooter from "./components/AdminFooter";
import AdminHeader from "./components/AdminHeader";
import AdminMain from "./components/AdminMain";

export const metadata: Metadata = {
  title: "관리자 페이지 - 카드 생성기",
  description: "카드 관리자 페이지",
};

export default function AdminLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <div className="admin-layout min-h-screen bg-gray-50 dark:bg-gray-900">
      <AdminHeader />
      <AdminMain>{children}</AdminMain>
      <AdminFooter />
    </div>
  );
}
