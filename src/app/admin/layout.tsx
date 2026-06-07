import { auth } from "@/lib/auth";
import { redirect } from "next/navigation";
import Sidebar from "@/components/Sidebar";

export default async function AdminLayout({ children }: { children: React.ReactNode }) {
  const session = await auth();
  if (!session) redirect("/login");
  if (session.user.role !== "ADMIN") redirect("/dashboard");

  return (
    <div className="app-layout">
      <Sidebar user={{ name: session.user.name, email: session.user.email, role: session.user.role }} />
      <main className="main-content">{children}</main>
    </div>
  );
}
