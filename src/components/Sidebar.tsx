"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { signOut } from "next-auth/react";
import {
  LayoutDashboard,
  FilePlus,
  ClipboardList,
  Inbox,
  Users,
  Settings,
  FileText,
  GraduationCap,
  BookOpen,
  LogOut,
  GalleryVerticalEnd,
} from "lucide-react";

interface SidebarProps {
  user: { name: string; email: string; role: string };
}

const navItems = {
  MAHASISWA: [
    { href: "/dashboard", label: "Dashboard", icon: LayoutDashboard },
    { href: "/mahasiswa/daftar-ta", label: "Daftar Tugas Akhir", icon: FilePlus },
    { href: "/mahasiswa/status", label: "Status Pendaftaran", icon: ClipboardList },
  ],
  DOSEN: [
    { href: "/dashboard", label: "Dashboard", icon: LayoutDashboard },
    { href: "/dosen/bimbingan", label: "Permintaan Bimbingan", icon: Inbox },
    { href: "/dosen/mahasiswa", label: "Daftar Mahasiswa", icon: Users },
    { href: "/dosen/slot", label: "Pengaturan Slot", icon: Settings },
  ],
  ADMIN: [
    { href: "/dashboard", label: "Dashboard", icon: LayoutDashboard },
    { href: "/admin/pendaftaran", label: "Semua Pendaftaran", icon: FileText },
    { href: "/admin/mahasiswa", label: "Data Mahasiswa", icon: GraduationCap },
    { href: "/admin/dosen", label: "Data Dosen", icon: BookOpen },
  ],
};

const roleBadge: Record<string, string> = {
  MAHASISWA: "Mahasiswa",
  DOSEN: "Dosen",
  ADMIN: "Administrator",
};

export default function Sidebar({ user }: SidebarProps) {
  const pathname = usePathname();
  const items = navItems[user.role as keyof typeof navItems] || navItems.MAHASISWA;
  const initials = user.name
    .split(" ").map((n) => n[0]).slice(0, 2).join("").toUpperCase();

  return (
    <aside className="sidebar">
      <div className="sidebar-header">
        <div className="sidebar-logo">
          <div className="sidebar-logo-icon">
            <GalleryVerticalEnd size={20} />
          </div>
          <div className="sidebar-logo-text">
            <h2>Sistem Tugas Akhir</h2>
            <p>Portal Akademik</p>
          </div>
        </div>
      </div>

      <nav className="sidebar-nav">
        <p className="nav-section-title">Menu Utama</p>
        {items.map((item) => {
          const Icon = item.icon;
          const isActive =
            pathname === item.href ||
            (item.href !== "/dashboard" && pathname.startsWith(item.href));
          return (
            <Link
              key={item.href}
              href={item.href}
              className={`nav-item ${isActive ? "active" : ""}`}
            >
              <Icon size={17} />
              <span>{item.label}</span>
            </Link>
          );
        })}
      </nav>

      <div className="sidebar-footer">
        <div className="user-info">
          <div className="user-avatar">{initials}</div>
          <div className="user-details">
            <p className="user-name">{user.name}</p>
            <p className="user-role">{roleBadge[user.role] || user.role}</p>
          </div>
        </div>
        <button
          onClick={() => signOut({ callbackUrl: "/login" })}
          className="btn btn-secondary btn-full btn-sm"
        >
          <LogOut size={14} />
          Keluar
        </button>
      </div>
    </aside>
  );
}
