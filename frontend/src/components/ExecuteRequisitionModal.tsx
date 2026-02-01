import React, { useState } from 'react';
import { api } from '@/api/client';
import '@/styles/ExecuteRequisitionModal.css';

interface ExecuteRequisitionModalProps {
  requisitionId: string;
  onClose: () => void;
  onSuccess: () => void;
}

export default function ExecuteRequisitionModal({
  requisitionId,
  onClose,
  onSuccess,
}: ExecuteRequisitionModalProps) {
  const [dataPagamento, setDataPagamento] = useState(
    new Date().toISOString().split('T')[0]
  );
  const [comprovativoUrl, setComprovativoUrl] = useState('');
  const [observacoes, setObservacoes] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!dataPagamento) {
      alert('Por favor, selecione uma data de pagamento');
      return;
    }

    setLoading(true);
    try {
      await api.requisitions.execute(requisitionId, {
        dataPagamento,
        comprovativoUrl: comprovativoUrl.trim() || undefined,
        observacoes: observacoes.trim() || undefined,
      });

      onSuccess();
      onClose();
    } catch (error: any) {
      console.error('Erro ao executar:', error);
      const errorMsg = error?.response?.data?.message || 'Erro ao executar requisição';
      
      // Melhorar mensagem para saldo insuficiente
      if (errorMsg.includes('Saldo insuficiente')) {
        alert(
          `❌ ${errorMsg}\n\n` +
          `💡 Sugestões:\n` +
          `• Verifique se o fundo correto foi selecionado ao aprovar\n` +
          `• Registre uma receita para adicionar saldo ao fundo\n` +
          `• Consulte os detalhes da requisição para confirmar o fundo usado`
        );
      } else {
        alert(`❌ ${errorMsg}`);
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-content" onClick={(e) => e.stopPropagation()}>
        <div className="modal-header">
          <h2>Executar Requisição</h2>
          <button className="modal-close" onClick={onClose}>
            ×
          </button>
        </div>

        <form onSubmit={handleSubmit} className="modal-body">
          <div className="form-section">
            <div className="form-group">
              <label htmlFor="dataPagamento">
                Data de Pagamento <span className="required">*</span>
              </label>
              <input
                id="dataPagamento"
                type="date"
                value={dataPagamento}
                onChange={(e) => setDataPagamento(e.target.value)}
                required
              />
              <small className="form-hint">
                Selecione a data em que o pagamento foi realizado
              </small>
            </div>

            <div className="form-group">
              <label htmlFor="comprovativoUrl">Comprovativo (URL ou referência)</label>
              <input
                id="comprovativoUrl"
                type="text"
                value={comprovativoUrl}
                onChange={(e) => setComprovativoUrl(e.target.value)}
                placeholder="Ex: https://banco.com/comprovativo/123 ou Recibo #ABC123"
              />
              <small className="form-hint">
                Referência ou URL do comprovativo de pagamento (opcional)
              </small>
            </div>

            <div className="form-group">
              <label htmlFor="observacoes">Observações</label>
              <textarea
                id="observacoes"
                value={observacoes}
                onChange={(e) => setObservacoes(e.target.value)}
                placeholder="Adicione informações sobre o pagamento (opcional)"
                rows={3}
              />
              <small className="form-hint">
                Ex: "Transferência bancária ref: ABC123" ou "Pagamento em espécie"
              </small>
            </div>
          </div>

          <div className="modal-footer">
            <button type="button" className="btn-secondary" onClick={onClose} disabled={loading}>
              Cancelar
            </button>
            <button type="submit" className="btn-primary" disabled={loading}>
              {loading ? 'Executando...' : 'Executar'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
