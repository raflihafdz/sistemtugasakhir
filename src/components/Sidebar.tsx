"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { signOut } from "next-auth/react";

interface SidebarProps {
  user: {
    name: string;
    email: string;
    role: string;
  };
}

const navItems = {
  MAHASISWA: [
    { href: "/dashboard", label: "Dashboard", icon: "🏠" },
    { href: "/mahasiswa/daftar-ta", label: "Daftar Tugas Akhir", icon: "📝" },
    { href: "/mahasiswa/status", label: "Status Pendaftaran", icon: "📊" },
  ],
  DOSEN: [
    { href: "/dashboard", label: "Dashboard", icon: "🏠" },
    { href: "/dosen/bimbingan", label: "Permintaan Bimbingan", icon: "📩" },
    { href: "/dosen/mahasiswa", label: "Daftar Mahasiswa", icon: "👥" },
  ],
  ADMIN: [
    { href: "/dashboard", label: "Dashboard", icon: "🏠" },
    { href: "/admin/pendaftaran", label: "Semua Pendaftaran", icon: "📋" },
    { href: "/admin/mahasiswa", label: "Data Mahasiswa", icon: "👨‍🎓" },
    { href: "/admin/dosen", label: "Data Dosen", icon: "👨‍🏫" },
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
    .split(" ")
    .map((n) => n[0])
    .slice(0, 2)
    .join("")
    .toUpperCase();

  return (
    <aside className="sidebar">
      <div className="sidebar-header">
        <div className="sidebar-logo">
          <div className="sidebar-logo-icon">🎓</div>
          <div className="sidebar-logo-text">
            <h2>Sistem Tugas Akhir</h2>
            <p>Portal Akademik</p>
          </div>
        </div>
      </div>

      <nav className="sidebar-nav">
        <p className="nav-section-title">Menu Utama</p>
        {items.map((item) => (
          <Link
            key={item.href}
            href={item.href}
            className={`nav-item ${pathname === item.href || pathname.startsWith(item.href + "/") ? "active" : ""}`}
          >
            <span style={{ fontSize: "16px" }}>{item.icon}</span>
            <span>{item.label}</span>
          </Link>
        ))}
      </nav>

      <div className="sidebar-footer">
        <div className="user-info" style={{ marginBottom: "8px" }}>
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
          <span>🚪</span> Keluar
        </button>
      </div>
    </aside>
  );
}
