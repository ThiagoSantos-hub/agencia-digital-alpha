import { useState, useEffect } from 'react';
import { createClient } from '@/lib/supabase';

export interface Alert {
  id: string;
  user_id: string;
  nome: string;
  tipo: 'saldo_minimo' | 'erro_conta';
  canal: 'meta' | 'google';
  conta_anuncio: string;
  saldo_minimo: number | null;
  recebedor_tipo: 'privado' | 'grupo';
  recebedor_numero: string;
  mensagem_template: string;
  ativo: boolean;
  created_at: string;
  updated_at: string;
}

export type AlertInput = Omit<Alert, 'id' | 'user_id' | 'created_at' | 'updated_at'>;

const supabase = createClient();

export const useAlertas = () => {
  const [alerts, setAlerts] = useState<Alert[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchAlertas = async () => {
    try {
      setLoading(true);
      const { data, error } = await supabase
        .from('alerts')
        .select('*')
        .order('created_at', { ascending: false });

      if (error) throw error;
      setAlerts(data || []);
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const createAlerta = async (input: AlertInput) => {
    try {
      setLoading(true);
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('Usuário não autenticado');

      const { data, error } = await supabase
        .from('alerts')
        .insert([{ ...input, user_id: user.id }])
        .select()
        .single();

      if (error) throw error;
      setAlerts([data, ...alerts]);
      return data;
    } catch (err: any) {
      setError(err.message);
      throw err;
    } finally {
      setLoading(false);
    }
  };

  const updateAlerta = async (id: string, input: Partial<AlertInput>) => {
    try {
      setLoading(true);
      const { data, error } = await supabase
        .from('alerts')
        .update(input)
        .eq('id', id)
        .select()
        .single();

      if (error) throw error;
      setAlerts(alerts.map(a => a.id === id ? data : a));
      return data;
    } catch (err: any) {
      setError(err.message);
      throw err;
    } finally {
      setLoading(false);
    }
  };

  const deleteAlerta = async (id: string) => {
    try {
      setLoading(true);
      const { error } = await supabase
        .from('alerts')
        .delete()
        .eq('id', id);

      if (error) throw error;
      setAlerts(alerts.filter(a => a.id !== id));
    } catch (err: any) {
      setError(err.message);
      throw err;
    } finally {
      setLoading(false);
    }
  };

  const toggleAtivo = async (id: string, ativo: boolean) => {
    try {
      const { data, error } = await supabase
        .from('alerts')
        .update({ ativo })
        .eq('id', id)
        .select()
        .single();

      if (error) throw error;
      setAlerts(alerts.map(a => a.id === id ? data : a));
    } catch (err: any) {
      setError(err.message);
      throw err;
    }
  };

  useEffect(() => {
    fetchAlertas();
  }, []);

  return {
    alerts,
    loading,
    error,
    fetchAlertas,
    createAlerta,
    updateAlerta,
    deleteAlerta,
    toggleAtivo
  };
};
