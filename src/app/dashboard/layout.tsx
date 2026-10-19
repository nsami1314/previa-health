"use client";

import Link from "next/link";
import { UserButton } from "@clerk/nextjs";
import { usePathname } from "next/navigation";

const primaryNavigation = [
  {
    name: "Dashboard",
    href: "/dashboard",
    icon: "dashboard",
  },
  {
    name: "Medical Reports",
    href: "/dashboard/medical-reports",
    icon: "reports",
  },
  {
    name: "Health Trends",
    href: "/dashboard/health-trends",
    icon: "trends",
  },
  {
    name: "Medications",
    href: "/dashboard/medications",
    icon: "medications",
  },
  {
    name: "Conditions",
    href: "/dashboard/health-conditions",
    icon: "conditions",
  },
  {
    name: "Nutrition",
    href: "/dashboard/nutrition",
    icon: "nutrition",
  },
  {
    name: "Health Insights",
    href: "/dashboard/health-insights",
    icon: "insights",
  },
];

const planningNavigation = [
  {
    name: "Health Goals",
    href: "/dashboard/health-goals",
    icon: "goals",
  },
  {
    name: "Vitals",
    href: "/dashboard/vitals",
    icon: "vitals",
  },
  {
    name: "Appointments",
    href: "/dashboard/appointments",
    icon: "appointments",
  },
];

const accountNavigation = [
  {
    name: "Health Profile",
    href: "/dashboard/health-profile",
    icon: "profile",
  },
  {
    name: "Family",
    href: "/dashboard/family",
    icon: "family",
  },
  {
    name: "Share My Records",
    href: "/dashboard/share",
    icon: "share",
  },
];

function NavIcon({ name }: { name: string }) {
  const common = {
    width: 18,
    height: 18,
    viewBox: "0 0 24 24",
    fill: "none",
    stroke: "currentColor",
    strokeWidth: 1.7,
    strokeLinecap: "round" as const,
    strokeLinejoin: "round" as const,
    "aria-hidden": true,
  };

  switch (name) {
    case "dashboard":
      return (
        <svg {...common}>
          <rect x="4" y="4" width="6" height="6" rx="1" />
          <rect x="14" y="4" width="6" height="6" rx="1" />
          <rect x="4" y="14" width="6" height="6" rx="1" />
          <rect x="14" y="14" width="6" height="6" rx="1" />
        </svg>
      );

    case "reports":
      return (
        <svg {...common}>
          <path d="M7 3.5h7l4 4V20a1 1 0 0 1-1 1H7a1 1 0 0 1-1-1V4.5a1 1 0 0 1 1-1Z" />
          <path d="M14 3.5V8h4" />
          <path d="M9 12h6M9 15h6" />
        </svg>
      );

    case "trends":
      return (
        <svg {...common}>
          <path d="M4 17 9 12l3 3 7-8" />
          <path d="M15 7h4v4" />
          <path d="M4 20h16" />
        </svg>
      );

    case "vitals":
      return (
        <svg {...common}>
          <path d="M3.5 12h4l2-5 4.5 10 2-5h4.5" />
        </svg>
      );

    case "medications":
      return (
        <svg {...common}>
          <path d="M8.2 4.8a4 4 0 0 1 5.7 0l5.3 5.3a4 4 0 0 1-5.7 5.7l-5.3-5.3a4 4 0 0 1 0-5.7Z" />
          <path d="m10 7 7 7" />
          <path d="M5 17.5 8.5 21" />
        </svg>
      );

    case "conditions":
      return (
        <svg {...common}>
          <circle cx="12" cy="12" r="8.5" />
          <path d="M8 12h8M12 8v8" />
        </svg>
      );

    case "nutrition":
      return (
        <svg {...common}>
          <path d="M12 20c-4.5-3-6.5-6.5-6.5-10.5C5.5 6.5 8.5 4 12 6c3.5-2 6.5.5 6.5 3.5C18.5 13.5 16.5 17 12 20Z" />
          <path d="M12 6v11" />
        </svg>
      );

    case "insights":
      return (
        <svg {...common}>
          <path d="M12 3v3M12 18v3M4.9 4.9l2.1 2.1M17 17l2.1 2.1M3 12h3M18 12h3M4.9 19.1 7 17M17 7l2.1-2.1" />
          <circle cx="12" cy="12" r="3.5" />
        </svg>
      );

    case "goals":
      return (
        <svg {...common}>
          <circle cx="12" cy="12" r="8.5" />
          <circle cx="12" cy="12" r="5" />
          <circle cx="12" cy="12" r="1.5" />
        </svg>
      );

    case "appointments":
      return (
        <svg {...common}>
          <rect x="4" y="5.5" width="16" height="14" rx="2" />
          <path d="M8 3v5M16 3v5M4 10h16" />
        </svg>
      );

    case "profile":
      return (
        <svg {...common}>
          <circle cx="12" cy="8" r="3.2" />
          <path d="M5.5 20c.8-3.3 3-5 6.5-5s5.7 1.7 6.5 5" />
        </svg>
      );

    case "family":
      return (
        <svg {...common}>
          <circle cx="9" cy="8" r="2.5" />
          <circle cx="16.5" cy="9" r="2" />
          <path d="M4.5 19c.5-3.1 2.2-4.8 4.5-4.8s4 1.7 4.5 4.8" />
          <path d="M14 14.5c2.8-.2 4.6 1.3 5 4.5" />
        </svg>
      );

    case "share":
      return (
        <svg {...common}>
          <circle cx="18" cy="5" r="2.5" />
          <circle cx="6" cy="12" r="2.5" />
          <circle cx="18" cy="19" r="2.5" />
          <path d="m8.2 10.8 7.5-4.5M8.2 13.2l7.5 4.5" />
        </svg>
      );

    case "settings":
      return (
        <svg {...common}>
          <circle cx="12" cy="12" r="3" />
          <path d="M19.4 15a1.7 1.7 0 0 0 .3 1.9l.1.1-1.8 1.8-.1-.1a1.7 1.7 0 0 0-1.9-.3 1.7 1.7 0 0 0-1 1.6V22h-2.6v-.1a1.7 1.7 0 0 0-1-1.6 1.7 1.7 0 0 0-1.9.3l-.1.1-1.8-1.8.1-.1a1.7 1.7 0 0 0 .3-1.9 1.7 1.7 0 0 0-1.6-1H4v-2.6h.1a1.7 1.7 0 0 0 1.6-1 1.7 1.7 0 0 0-.3-1.9l-.1-.1 1.8-1.8.1.1a1.7 1.7 0 0 0 1.9.3 1.7 1.7 0 0 0 1-1.6V5h2.6v.1a1.7 1.7 0 0 0 1 1.6 1.7 1.7 0 0 0 1.9-.3l.1-.1 1.8 1.8-.1.1a1.7 1.7 0 0 0-.3 1.9 1.7 1.7 0 0 0 1.6 1h.1v2.6h-.1a1.7 1.7 0 0 0-1.6 1Z" />
        </svg>
      );

    case "help":
      return (
        <svg {...common}>
          <circle cx="12" cy="12" r="8.5" />
          <path d="M9.7 9.2a2.5 2.5 0 1 1 4.4 1.6c-.9 1-2.1 1.3-2.1 3" />
          <path d="M12 17h.01" />
        </svg>
      );

    default:
      return (
        <svg {...common}>
          <circle cx="12" cy="12" r="8" />
        </svg>
      );
  }
}

function isNavigationActive(pathname: string, href: string) {
  if (href === "/dashboard") {
    return pathname === "/dashboard";
  }

  return pathname === href || pathname.startsWith(`${href}/`);
}

function NavigationItem({
  name,
  href,
  icon,
  pathname,
  mobile = false,
}: {
  name: string;
  href: string;
  icon: string;
  pathname: string;
  mobile?: boolean;
}) {
  const active = isNavigationActive(pathname, href);

  return (
    <Link
      href={href}
      className={[
        "group flex items-center transition-all duration-150",
        mobile
          ? "min-w-[68px] flex-col justify-center gap-1.5 rounded-[10px] px-2 py-1.5"
          : "min-h-10 gap-3 rounded-[10px] px-3 text-[13px]",
        active
          ? "bg-[var(--primary-soft)] font-semibold text-[var(--primary)]"
          : "font-medium text-[var(--foreground-secondary)] hover:bg-[var(--surface-muted)] hover:text-[var(--foreground)]",
      ].join(" ")}
      aria-current={active ? "page" : undefined}
    >
      <span
        className={[
          "flex shrink-0 items-center justify-center",
          "h-5 w-5",
          active
            ? "text-[var(--primary)]"
            : "text-[var(--foreground-muted)] group-hover:text-[var(--primary)]",
        ].join(" ")}
      >
        <NavIcon name={icon} />
      </span>

      <span
        className={
          mobile
            ? "max-w-[68px] truncate text-[10px] font-medium"
            : "truncate"
        }
      >
        {name}
      </span>
    </Link>
  );
}

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const pathname = usePathname();

  return (
    <div className="min-h-screen bg-[var(--background)] text-[var(--foreground)]">
      {/* =====================================================
          DESKTOP SIDEBAR
          ===================================================== */}

      <aside className="fixed inset-y-0 left-0 z-40 hidden w-[248px] flex-col border-r border-[var(--border)] bg-white lg:flex">
        <div className="flex h-[72px] items-center border-b border-[var(--border)] px-6">
          <Link
            href="/dashboard"
            className="flex items-center gap-2.5"
            aria-label="Previa home"
          >
            <span className="flex h-8 w-8 items-center justify-center rounded-[10px] bg-[var(--primary)] text-sm font-semibold text-white shadow-sm">
              P
            </span>

            <div>
              <span className="block text-[17px] font-semibold tracking-[-0.025em] text-[var(--foreground)]">
                Previa
              </span>
            </div>
          </Link>
        </div>

        <nav
          aria-label="Primary navigation"
          className="flex-1 overflow-y-auto px-3 py-5"
        >
          <p className="mb-2 px-3 text-[10px] font-semibold uppercase tracking-[0.11em] text-[var(--foreground-subtle)]">
            Your health
          </p>

          <div className="space-y-0.5">
            {primaryNavigation.map((item) => (
              <NavigationItem
                key={item.href}
                {...item}
                pathname={pathname}
              />
            ))}
          </div>

          <div className="my-5 px-3">
            <div className="h-px bg-[var(--border)]" />
          </div>

          <p className="mb-2 px-3 text-[10px] font-semibold uppercase tracking-[0.11em] text-[var(--foreground-subtle)]">
            Plan & manage
          </p>

          <div className="space-y-0.5">
            {planningNavigation.map((item) => (
              <NavigationItem
                key={item.href}
                {...item}
                pathname={pathname}
              />
            ))}
          </div>

          <div className="my-5 px-3">
            <div className="h-px bg-[var(--border)]" />
          </div>

          <p className="mb-2 px-3 text-[10px] font-semibold uppercase tracking-[0.11em] text-[var(--foreground-subtle)]">
            Account
          </p>

          <div className="space-y-0.5">
            {accountNavigation.map((item) => (
              <NavigationItem
                key={item.href}
                {...item}
                pathname={pathname}
              />
            ))}

            <NavigationItem
              name="Settings"
              href="/dashboard/settings"
              icon="settings"
              pathname={pathname}
            />

            <NavigationItem
              name="Help & Support"
              href="/dashboard/help"
              icon="help"
              pathname={pathname}
            />
          </div>
        </nav>

        <div className="border-t border-[var(--border)] p-3">
          <div className="flex items-center gap-3 rounded-[11px] px-2 py-2">
            <UserButton />

            <div className="min-w-0">
              <p className="text-[12px] font-medium text-[var(--foreground-secondary)]">
                Your account
              </p>

              <p className="mt-0.5 text-[10px] text-[var(--foreground-muted)]">
                Personal health
              </p>
            </div>
          </div>
        </div>
      </aside>

      {/* =====================================================
          MOBILE HEADER
          ===================================================== */}

      <header className="sticky top-0 z-40 flex h-[62px] items-center justify-between border-b border-[var(--border)] bg-white/95 px-4 backdrop-blur lg:hidden">
        <Link
          href="/dashboard"
          className="flex items-center gap-2.5"
          aria-label="Previa home"
        >
          <span className="flex h-8 w-8 items-center justify-center rounded-[10px] bg-[var(--primary)] text-sm font-semibold text-white">
            P
          </span>

          <span className="text-[17px] font-semibold tracking-[-0.025em]">
            Previa
          </span>
        </Link>

        <div className="flex items-center gap-2">
          <button
            type="button"
            aria-label="Notifications"
            className="flex h-9 w-9 items-center justify-center rounded-[9px] text-[var(--foreground-muted)] hover:bg-[var(--surface-muted)] hover:text-[var(--foreground)]"
          >
            <svg
              width="18"
              height="18"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="1.7"
              aria-hidden="true"
            >
              <path d="M18 9a6 6 0 0 0-12 0c0 7-3 7-3 9h18c0-2-3-2-3-9" />
              <path d="M10 21h4" />
            </svg>
          </button>

          <UserButton />
        </div>
      </header>

      {/* =====================================================
          MAIN
          ===================================================== */}

      <main className="min-h-screen pb-[82px] lg:pb-0 lg:pl-[248px]">
        {/* Desktop topbar */}
        <div className="hidden h-[72px] items-center justify-between border-b border-[var(--border)] bg-white px-8 lg:flex">
          <button
            type="button"
            className="flex w-[360px] items-center gap-3 rounded-[10px] border border-[var(--border)] bg-[var(--surface-subtle)] px-3 py-2 text-left transition hover:border-[var(--border-strong)]"
          >
            <svg
              width="17"
              height="17"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="1.7"
              aria-hidden="true"
            >
              <circle cx="11" cy="11" r="6.5" />
              <path d="m16 16 4 4" />
            </svg>

            <span className="flex-1 text-[12px] text-[var(--foreground-muted)]">
              Search reports, conditions, medications...
            </span>

            <span className="rounded-[6px] border border-[var(--border)] bg-white px-1.5 py-0.5 text-[10px] text-[var(--foreground-subtle)]">
              ⌘ K
            </span>
          </button>

          <div className="flex items-center gap-2">
            <button
              type="button"
              aria-label="Notifications"
              className="flex h-9 w-9 items-center justify-center rounded-[9px] text-[var(--foreground-muted)] transition hover:bg-[var(--surface-muted)] hover:text-[var(--foreground)]"
            >
              <svg
                width="18"
                height="18"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="1.7"
                aria-hidden="true"
              >
                <path d="M18 9a6 6 0 0 0-12 0c0 7-3 7-3 9h18c0-2-3-2-3-9" />
                <path d="M10 21h4" />
              </svg>
            </button>

            <div className="mx-2 h-5 w-px bg-[var(--border)]" />

            <UserButton />
          </div>
        </div>

        {children}
      </main>

      {/* =====================================================
          MOBILE BOTTOM NAV
          ===================================================== */}

      <nav
        aria-label="Mobile navigation"
        className="fixed inset-x-0 bottom-0 z-50 border-t border-[var(--border)] bg-white/97 px-2 pb-[max(8px,env(safe-area-inset-bottom))] pt-2 backdrop-blur lg:hidden"
      >
        <div className="mx-auto flex max-w-[520px] items-center justify-around">
          <NavigationItem
            name="Home"
            href="/dashboard"
            icon="dashboard"
            pathname={pathname}
            mobile
          />

          <NavigationItem
            name="Reports"
            href="/dashboard/medical-reports"
            icon="reports"
            pathname={pathname}
            mobile
          />

          <NavigationItem
            name="Trends"
            href="/dashboard/health-trends"
            icon="trends"
            pathname={pathname}
            mobile
          />

          <NavigationItem
            name="Insights"
            href="/dashboard/health-insights"
            icon="insights"
            pathname={pathname}
            mobile
          />
        </div>
      </nav>
    </div>
  );
}