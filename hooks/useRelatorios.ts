import { useState, useEffect } from 'react';
import { createClient } from '@/lib/supabase';
import { calcularProximoEnvio } from '@/lib/reportSchedule';

export interface Report {
  id: string;
  user_id: string;
  nome: string;
  canal: 'meta' | 'google';
  frequencia: 'diario' | 'semanal' | 'mensal' | 'manual';
  periodo: 'dia_anterior' | 'ontem' | 'ultima_semana' | 'ultimo_mes' | 'ultimos_3_dias' | 'ultimos_7_dias' | 'ultimos_30_dias' | 'personalizado';
  recebedor_tipo: 'privado' | 'grupo';
  recebedor_numero: string;
  enviar_via_agencia: boolean;
  mensagem_template: string;
  horario_envio: string;
  dias_semana: string[] | null;
  ativo: boolean;
  proximo_envio: string | null;
  client_id: string | null;
  data_inicio?: string | null;
  data_fim?: string | null;
  dia_semana_envio?: number | null;
  created_at: string;
  updated_at: string;
}

export interface ReportHistory {
  id: string;
  report_id: string;
  enviado_em: string;
  mensagem_enviada: string;
  status: 'enviado' | 'erro';
  erro_detalhe: string | null;
}

export type ReportInput = Omit<Report, 'id' | 'user_id' | 'created_at' | 'updated_at'>;

const supabase = createClient();

export const useRelatorios = () => {
  const [reports, setReports] = useState<Report[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchRelatorios = async () => {
    try {
      setLoading(true);
      const { data, error } = await supabase
        .from('reports')
        .select('*')
        .order('created_at', { ascending: false });

      if (error) throw error;
      setReports(data || []);
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const createRelatorio = async (input: ReportInput) => {
    try {
      setLoading(true);
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('Usuário não autenticado');

      const proximo_envio = calcularProximoEnvio(input.frequencia, input.horario_envio, input.dias_semana);
      
      const { data, error } = await supabase
        .from('reports')
        .insert([{ 
          ...input, 
          user_id: user.id, 
          proximo_envio,
          data_inicio: input.data_inicio || null,
          data_fim: input.data_fim || null,
          dia_semana_envio: input.dia_semana_envio || null
        }])
        .select()
        .single();

      if (error) throw error;
      setReports([data, ...reports]);
      return data;
    } catch (err: any) {
      setError(err.message);
      throw err;
    } finally {
      setLoading(false);
    }
  };

  const updateRelatorio = async (id: string, input: Partial<ReportInput>) => {
    try {
      setLoading(true);
      
      let updateData = { 
        ...input,
        data_inicio: input.data_inicio === undefined ? undefined : (input.data_inicio || null),
        data_fim: input.data_fim === undefined ? undefined : (input.data_fim || null),
        dia_semana_envio: input.dia_semana_envio === undefined ? undefined : (input.dia_semana_envio || null)
      };
      
      if (input.frequencia || input.horario_envio || input.dias_semana) {
        const current = reports.find(r => r.id === id);
        const freq = input.frequencia || current?.frequencia || 'diario';
        const hora = input.horario_envio || current?.horario_envio || '08:00';
        const dias = input.dias_semana !== undefined ? input.dias_semana : current?.dias_semana;
        (updateData as any).proximo_envio = calcularProximoEnvio(freq, hora, dias);
      }

      const { data, error } = await supabase
        .from('reports')
        .update(updateData)
        .eq('id', id)
        .select()
        .single();

      if (error) throw error;
      setReports(reports.map(r => r.id === id ? data : r));
      return data;
    } catch (err: any) {
      setError(err.message);
      throw err;
    } finally {
      setLoading(false);
    }
  };

  const deleteRelatorio = async (id: string) => {
    try {
      setLoading(true);
      const { error } = await supabase
        .from('reports')
        .delete()
        .eq('id', id);

      if (error) throw error;
      setReports(reports.filter(r => r.id !== id));
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
        .from('reports')
        .update({ ativo })
        .eq('id', id)
        .select()
        .single();

      if (error) throw error;
      setReports(reports.map(r => r.id === id ? data : r));
    } catch (err: any) {
      setError(err.message);
      throw err;
    }
  };

  const fetchHistorico = async (reportId: string) => {
    try {
      const { data, error } = await supabase
        .from('report_history')
        .select('*')
        .eq('report_id', reportId)
        .order('enviado_em', { ascending: false });

      if (error) throw error;
      return data as ReportHistory[];
    } catch (err: any) {
      setError(err.message);
      throw err;
    }
  };

  useEffect(() => {
    fetchRelatorios();
  }, []);

  return {
    reports,
    loading,
    error,
    fetchRelatorios,
    createRelatorio,
    updateRelatorio,
    deleteRelatorio,
    toggleAtivo,
    fetchHistorico,
    calcularProximoEnvio
  };
};
