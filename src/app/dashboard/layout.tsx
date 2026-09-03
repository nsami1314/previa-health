import Link from "next/link";
import { UserButton } from "@clerk/nextjs";
import { currentUser } from "@clerk/nextjs/server";

const navigation = [
  { name: "Dashboard", href: "/dashboard", icon: "⌂" },
  { name: "Health Profile", href: "/dashboard/health-profile", icon: "♙" },
  { name: "Medical Reports", href: "/dashboard/medical-reports", icon: "▣" },
  { name: "Medications", href: "/dashboard/medications", icon: "✚" },
  { name: "Health Conditions", href: "/dashboard/health-conditions", icon: "♡" },
  { name: "Health Goals", href: "/dashboard/health-goals", icon: "◎" },
  { name: "Health Insights", href: "/dashboard/health-insights", icon: "✦" },
  { name: "Health Timeline", href: "/dashboard/health-timeline", icon: "◷" },
];

const secondaryNavigation = [
  { name: "Family Profiles", href: "/dashboard/family-profiles", icon: "♙" },
  { name: "Reminders", href: "/dashboard/reminders", icon: "🔔" },
  { name: "Settings", href: "/dashboard/settings", icon: "⚙" },
  { name: "Help & Support", href: "/dashboard/help", icon: "?" },
];

export default async function DashboardLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  const user = await currentUser();

  const displayName =
    user?.fullName ||
    [user?.firstName, user?.lastName].filter(Boolean).join(" ") ||
    "User";

  return (
    <div className="min-h-screen bg-gray-50">
      <aside className="fixed left-0 top-0 z-40 flex h-screen w-64 flex-col border-r border-gray-200 bg-white">
        <div className="border-b border-gray-200 px-6 py-5">
          <Link
            href="/"
            className="text-xl font-bold text-gray-900"
          >
            Previa Health
          </Link>
        </div>

        <nav className="flex-1 overflow-y-auto px-3 py-4">
          <div className="space-y-1">
            {navigation.map((item) => (
              <Link
                key={item.name}
                href={item.href}
                className="flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium text-gray-700 transition hover:bg-gray-100 hover:text-gray-900"
              >
                <span className="flex w-6 justify-center text-base">
                  {item.icon}
                </span>
                <span>{item.name}</span>
              </Link>
            ))}
          </div>

          <div className="my-5 border-t border-gray-200" />

          <div className="space-y-1">
            {secondaryNavigation.map((item) => (
              <Link
                key={item.name}
                href={item.href}
                className="flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium text-gray-700 transition hover:bg-gray-100 hover:text-gray-900"
              >
                <span className="flex w-6 justify-center text-base">
                  {item.icon}
                </span>
                <span>{item.name}</span>
              </Link>
            ))}
          </div>
        </nav>

        <div className="border-t border-gray-200 px-4 py-4">
          <div className="flex items-center gap-3 rounded-lg bg-gray-50 px-3 py-3">
            <UserButton />

            <div className="min-w-0">
              <p className="truncate text-sm font-semibold text-gray-900">
                {displayName}
              </p>
            </div>
          </div>
        </div>
      </aside>

      <main className="min-h-screen pl-64">
        {children}
      </main>
    </div>
  );
}