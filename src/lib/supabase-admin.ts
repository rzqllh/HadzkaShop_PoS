import { createClient } from "@supabase/supabase-js";
import type { AuthAdminGateway } from "@/server/users/service";

function requireServerEnv(name: string) {
  const value = process.env[name];
  if (!value) throw new Error(`${name} belum dikonfigurasi`);
  return value;
}

export function createSupabaseAdminClient() {
  return createClient(
    requireServerEnv("NEXT_PUBLIC_SUPABASE_URL"),
    requireServerEnv("SUPABASE_SERVICE_ROLE_KEY"),
    {
      auth: {
        autoRefreshToken: false,
        persistSession: false,
        detectSessionInUrl: false,
      },
    },
  );
}

export function createAuthAdminGateway(): AuthAdminGateway {
  const admin = createSupabaseAdminClient().auth.admin;

  return {
    async createUser(input) {
      const { data, error } = await admin.createUser({
        email: input.email,
        password: input.password,
        email_confirm: true,
      });
      if (error) throw error;
      return { user: { id: data.user.id } };
    },
    async deleteUser(id) {
      const { error } = await admin.deleteUser(id);
      if (error) throw error;
    },
    async updateUserById(id, attributes) {
      const { error } = await admin.updateUserById(id, {
        email: attributes.email,
        password: attributes.password,
        ban_duration: attributes.banDuration,
      });
      if (error) throw error;
    },
  };
}
