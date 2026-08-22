export type Cliente = {
  id: string;
  slug: string;
  nombre_local: string;
  redirect_url: string;
  activo: boolean;
  password_hash: string;
  created_at: string;
};

export type Click = {
  id: number;
  cliente_id: string;
  timestamp: string;
  hora: number;
  dia_semana: number;
};

export type ClienteConClicks = Omit<Cliente, "password_hash"> & {
  total_clicks: number;
};
