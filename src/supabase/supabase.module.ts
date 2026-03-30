// src/supabase/supabase.module.ts
import { Module, Global } from '@nestjs/common';
import { createClient, SupabaseClient } from '@supabase/supabase-js';

@Global()
@Module({
  providers: [
    {
      provide: SupabaseClient,
      useFactory: () => {
        const url = process.env.SUPABASE_URL;
        const key = process.env.SUPABASE_KEY;

        if (!url || !key) {
          throw new Error(
            'SUPABASE_URL dan SUPABASE_KEY wajib diisi. Jika pakai PM2, jalankan dari folder backend atau set env di ecosystem.config.',
          );
        }

        return createClient(url, key);
      },
    },
  ],
  exports: [SupabaseClient],
})
export class SupabaseModule {}
