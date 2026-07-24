import { useState, useEffect } from 'react';
import { createClient } from '@/lib/supabase';

export type PeriodicidadeFundo = 'semanal' | 'quinzenal' | 'mensal' | 'anual';

export interface Alert {
  id: string;
  user_id: string;
  nome: string;
  tipo: 'saldo_minimo' | 'erro_conta' | 'fundo_cliente';
  canal: 'meta' | 'google';
  conta_anuncio: string;
  saldo_minimo: number | null;
  recebedor_tipo: 'privado' | 'grupo';
  recebedor_numero: string;
  mensagem_template: string;
  ativo: boolean;
  client_id: string | null;
  periodicidade: PeriodicidadeFundo | null;
  valor_fundo: number | null;
  proximo_vencimento: string | null;
  last_status?: 'ok' | 'triggered' | null;
  created_at: string;
  updated_at: string;
  creator?: { name: string | null; email: string };
  client?: { name: string; meta_ad_account_id: string | null } | null;
}

export type AlertInput = Pick<Alert,
  | 'nome' | 'tipo' | 'canal' | 'conta_anuncio' | 'saldo_minimo'
  | 'recebedor_tipo' | 'recebedor_numero' | 'mensagem_template' | 'ativo'
  | 'client_id' | 'periodicidade' | 'valor_fundo' | 'proximo_vencimento'
>;

const supabase = createClient();

// Avança uma data ISO (YYYY-MM-DD) pela periodicidade escolhida, usado ao
// marcar um fundo como colocado, pra já deixar agendado o próximo lembrete.
function proximoVencimentoPorPeriodicidade(dataBase: string, periodicidade: PeriodicidadeFundo): string {
  const d = new Date(`${dataBase}T00:00:00`);
  switch (periodicidade) {
    case 'semanal': d.setDate(d.getDate() + 7); break;
    case 'quinzenal': d.setDate(d.getDate() + 14); break;
    case 'mensal': d.setMonth(d.getMonth() + 1); break;
    case 'anual': d.setFullYear(d.getFullYear() + 1); break;
  }
  return d.toISOString().split('T')[0];
}

export const useAlertas = () => {
  const [alerts, setAlerts] = useState<Alert[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchAlertas = async () => {
    try {
      setLoading(true);
      const { data, error } = await supabase
        .from('alerts')
        .select('*, creator:profiles!alerts_user_id_profiles_fkey(name, email), client:clients(name, meta_ad_account_id)')
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
      await fetchAlertas();
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
      await fetchAlertas();
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
      setAlerts(alerts.map(a => a.id === id ? { ...a, ...data } : a));
    } catch (err: any) {
      setError(err.message);
      throw err;
    }
  };

  // Confirma que o fundo foi colocado manualmente no Meta: grava o histórico
  // em client_fund_logs e já agenda o próximo vencimento pela periodicidade
  // escolhida (sem isso o alerta ficaria "triggered" pra sempre).
  const marcarFundoColocado = async (alert: Alert) => {
    try {
      setLoading(true);
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('Usuário não autenticado');
      if (!alert.client_id || !alert.valor_fundo) throw new Error('Alerta de fundo incompleto');

      const { error: logError } = await supabase.from('client_fund_logs').insert({
        alert_id: alert.id,
        client_id: alert.client_id,
        user_id: user.id,
        valor: alert.valor_fundo,
      });
      if (logError) throw logError;

      const baseData = alert.proximo_vencimento || new Date().toISOString().split('T')[0];
      const proximo = alert.periodicidade ? proximoVencimentoPorPeriodicidade(baseData, alert.periodicidade) : null;

      const { data, error } = await supabase
        .from('alerts')
        .update({ proximo_vencimento: proximo, last_status: null, last_triggered_at: null })
        .eq('id', alert.id)
        .select()
        .single();

      if (error) throw error;
      await fetchAlertas();
      return data;
    } catch (err: any) {
      setError(err.message);
      throw err;
    } finally {
      setLoading(false);
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
    toggleAtivo,
    marcarFundoColocado,
  };
};
