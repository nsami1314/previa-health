import { auth } from "@clerk/nextjs/server";

export default async function DashboardPage() {
  const { userId } = await auth();

  if (!userId) {
    return null;
  }

  const sections = [
    {
      title: "Health Profile",
      description: "Your basic health information and personal health history.",
    },
    {
      title: "Medical Reports",
      description: "Upload and organize your medical reports in one place.",
    },
    {
      title: "Medications",
      description: "Keep track of your current and past medications.",
    },
    {
      title: "Health Conditions",
      description: "Maintain a structured record of your health conditions.",
    },
    {
      title: "Health Goals",
      description: "Set and track your preventive health and wellness goals.",
    },
    {
      title: "Health Insights",
      description: "Understand your health information with Previa insights.",
    },
  ];

  return (
    <main className="min-h-screen bg-zinc-50 px-6 py-10">
      <div className="mx-auto max-w-6xl">
        <div className="mb-10">
          <p className="text-sm font-medium text-teal-700">Previa Health</p>

          <h1 className="mt-2 text-3xl font-semibold tracking-tight text-zinc-900 sm:text-4xl">
            Your Health Dashboard
          </h1>

          <p className="mt-3 max-w-2xl text-zinc-600">
            Build and organize your lifelong health record in one secure place.
          </p>
        </div>

        <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
          {sections.map((section) => (
            <div
              key={section.title}
              className="rounded-2xl border border-zinc-200 bg-white p-6 shadow-sm"
            >
              <h2 className="text-lg font-semibold text-zinc-900">
                {section.title}
              </h2>

              <p className="mt-2 text-sm leading-6 text-zinc-600">
                {section.description}
              </p>

              <button
                type="button"
                className="mt-5 text-sm font-medium text-teal-700"
              >
                Open →
              </button>
            </div>
          ))}
        </div>
      </div>
    </main>
  );
}