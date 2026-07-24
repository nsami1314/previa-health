import { auth } from "@clerk/nextjs/server";

export default async function DashboardPage() {
  const { userId } = await auth();

  if (!userId) {
    return null;
  }

  return (
    <main className="flex flex-1 flex-col items-center justify-center px-6 text-center">
      <h1 className="text-3xl font-semibold tracking-tight text-zinc-900 sm:text-4xl">
        Dashboard
      </h1>
      <p className="mt-4 text-lg text-zinc-600">
        Welcome to your Previa Health dashboard.
      </p>
    </main>
  );
}
