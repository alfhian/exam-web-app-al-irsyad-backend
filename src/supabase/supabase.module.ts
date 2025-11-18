import { Module } from '@nestjs/common';
import { createClient } from '@supabase/supabase-js';

const supabaseProvider = {
  provide: 'SUPABASE',
  useFactory: () => {
    return createClient(
      process.env.SUPABASE_URL,
      process.env.SUPABASE_SERVICE_KEY
    );
  },
};

@Module({
  providers: [supabaseProvider],
  exports: [supabaseProvider],
})
export class SupabaseModule {}
