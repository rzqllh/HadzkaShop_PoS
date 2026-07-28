import { SettingsForm } from "./settings-form";

export default function SettingsPage() {
  return (
    <div className="p-6 h-full flex flex-col min-h-0 max-w-6xl mx-auto w-full">
      <div className="mb-6 flex-shrink-0">
        <h1 className="text-3xl font-semibold tracking-tight">Pengaturan Toko</h1>
        <p className="text-muted-foreground mt-1">Kelola informasi toko dan konfigurasi POS.</p>
      </div>

      <div className="flex-1 overflow-y-auto pr-2 pb-6">
        <SettingsForm />
      </div>
    </div>
  );
}
