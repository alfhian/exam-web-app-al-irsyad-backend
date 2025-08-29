export class User {
  id: string; // UUID
  name: string;
  userid: string; // NIS/NIK
  password?: string;
  role: string;
  is_active: boolean;
  created_at: Date;
  created_by: string;
  updated_at: Date;
  updated_by: string;
}
