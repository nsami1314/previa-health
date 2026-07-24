export default function HealthProfilePage() {
    return (
      <main className="min-h-screen bg-zinc-50 px-6 py-10">
        <div className="mx-auto max-w-3xl">
          <div className="mb-8">
            <p className="text-sm font-medium text-teal-700">Previa Health</p>
  
            <h1 className="mt-2 text-3xl font-semibold tracking-tight text-zinc-900">
              Health Profile
            </h1>
  
            <p className="mt-3 text-zinc-600">
              Add your basic health information to build your personal health
              record.
            </p>
          </div>
  
          <div className="rounded-2xl border border-zinc-200 bg-white p-6 shadow-sm">
            <div className="grid gap-6 sm:grid-cols-2">
              <div>
                <label className="text-sm font-medium text-zinc-700">
                  Date of Birth
                </label>
                <input
                  type="date"
                  className="mt-2 w-full rounded-lg border border-zinc-300 px-3 py-2"
                />
              </div>
  
              <div>
                <label className="text-sm font-medium text-zinc-700">
                  Biological Sex
                </label>
                <select className="mt-2 w-full rounded-lg border border-zinc-300 px-3 py-2">
                  <option value="">Select</option>
                  <option value="male">Male</option>
                  <option value="female">Female</option>
                </select>
              </div>
  
              <div>
                <label className="text-sm font-medium text-zinc-700">
                  Height (cm)
                </label>
                <input
                  type="number"
                  placeholder="e.g. 172"
                  className="mt-2 w-full rounded-lg border border-zinc-300 px-3 py-2"
                />
              </div>
  
              <div>
                <label className="text-sm font-medium text-zinc-700">
                  Weight (kg)
                </label>
                <input
                  type="number"
                  placeholder="e.g. 70"
                  className="mt-2 w-full rounded-lg border border-zinc-300 px-3 py-2"
                />
              </div>
  
              <div>
                <label className="text-sm font-medium text-zinc-700">
                  Blood Group
                </label>
                <select className="mt-2 w-full rounded-lg border border-zinc-300 px-3 py-2">
                  <option value="">Select</option>
                  <option>A+</option>
                  <option>A-</option>
                  <option>B+</option>
                  <option>B-</option>
                  <option>AB+</option>
                  <option>AB-</option>
                  <option>O+</option>
                  <option>O-</option>
                </select>
              </div>
            </div>
  
            <button
              type="button"
              className="mt-8 rounded-lg bg-teal-700 px-5 py-2.5 text-sm font-medium text-white"
            >
              Save Health Profile
            </button>
          </div>
        </div>
      </main>
    );
  }