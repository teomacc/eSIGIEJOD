import React from 'react';
import '@/styles/ExportExpenseModal.css';

interface Despesa {
  id: string;
  requisicaoId?: string;
  churchId: string;
  fundId: string;
  valor: number | string;
  dataPagamento: string;
  executadoPor: string;
  comprovativoUrl?: string;
  observacoes?: string;
  requisicao?: {
    id: string;
    code: string;
    justification?: string;
    fundId?: string;
    category?: string;
  };
}

interface ExportExpenseModalProps {
  despesa: Despesa;
  churchName: string;
  executorName: string;
  onClose: () => void;
}

const CATEGORY_LABELS: Record<string, string> = {
  ALIMENTACAO: 'Alimentação',
  TRANSPORTE: 'Transporte',
  HOSPEDAGEM: 'Hospedagem',
  MATERIAL_ESCRITORIO: 'Material de Escritório',
  MATERIAL_LITURGICO: 'Material Litúrgico',
  EQUIPAMENTOS: 'Equipamentos',
  MANUTENCAO: 'Manutenção',
  APOIO_SOCIAL: 'Apoio Social',
  ORGANIZACAO_EVENTOS: 'Organização de Eventos',
  FORMACAO_SEMINARIOS: 'Formação/Seminários',
  SAUDE_EMERGENCIA: 'Saúde/Emergência',
  PROJECTOS_MISSIONARIOS: 'Projetos Missionários',
  COMUNICACAO: 'Comunicação',
  ENERGIA_AGUA: 'Energia/Água',
  COMBUSTIVEL: 'Combustível',
  OUTROS: 'Outros',
};

export default function ExportExpenseModal({
  despesa,
  churchName,
  executorName,
  onClose,
}: ExportExpenseModalProps) {
  const [format, setFormat] = React.useState<'pdf' | 'csv' | 'json'>('pdf');
  const [exporting, setExporting] = React.useState(false);

  const handleExport = async () => {
    setExporting(true);
    try {
      const categoryLabel = despesa.requisicao?.category
        ? CATEGORY_LABELS[despesa.requisicao.category] || despesa.requisicao.category
        : 'N/A';

      const data = {
        codigo: despesa.requisicao?.code ?? 'N/A',
        descricao: despesa.requisicao?.justification ?? despesa.observacoes ?? 'Sem descrição',
        categoria: categoryLabel,
        valor: Number(despesa.valor),
        dataPagamento: despesa.dataPagamento,
        igreja: churchName,
        executor: executorName,
        origem: despesa.requisicaoId ? 'Requisição' : 'Direto',
        comprovativo: despesa.comprovativoUrl ?? 'N/A',
        observacoes: despesa.observacoes ?? 'N/A',
      };

      if (format === 'json') {
        const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `despesa-${data.codigo}.json`;
        a.click();
        URL.revokeObjectURL(url);
      } else if (format === 'csv') {
        const csvContent = [
          'Campo,Valor',
          `Código,${data.codigo}`,
          `Descrição,"${data.descricao}"`,
          `Categoria,${data.categoria}`,
          `Valor,${data.valor}`,
          `Data de Pagamento,${new Date(data.dataPagamento).toLocaleDateString('pt-MZ')}`,
          `Igreja,${data.igreja}`,
          `Executor,${data.executor}`,
          `Origem,${data.origem}`,
          `Observações,"${data.observacoes}"`,
        ].join('\n');

        const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `despesa-${data.codigo}.csv`;
        a.click();
        URL.revokeObjectURL(url);
      } else if (format === 'pdf') {
        alert(
          'Exportação para PDF será implementada em breve. Por enquanto, use CSV ou JSON.'
        );
      }

      setTimeout(() => {
        onClose();
      }, 500);
    } catch (error) {
      console.error('Erro ao exportar:', error);
      alert('Erro ao exportar despesa');
    } finally {
      setExporting(false);
    }
  };

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-content export-modal" onClick={(e) => e.stopPropagation()}>
        <div className="modal-header">
          <h2>📤 Exportar Despesa</h2>
          <button className="modal-close" onClick={onClose}>
            ✕
          </button>
        </div>

        <div className="modal-body">
          <p className="export-description">
            Escolha o formato de exportação para a despesa{' '}
            <strong>{despesa.requisicao?.code ?? 'sem código'}</strong>:
          </p>

          <div className="export-options">
            <label className={`export-option ${format === 'pdf' ? 'selected' : ''}`}>
              <input
                type="radio"
                name="format"
                value="pdf"
                checked={format === 'pdf'}
                onChange={() => setFormat('pdf')}
              />
              <div className="option-content">
                <span className="option-icon">📄</span>
                <div className="option-info">
                  <div className="option-title">PDF</div>
                  <div className="option-subtitle">Documento formatado para impressão</div>
                </div>
              </div>
            </label>

            <label className={`export-option ${format === 'csv' ? 'selected' : ''}`}>
              <input
                type="radio"
                name="format"
                value="csv"
                checked={format === 'csv'}
                onChange={() => setFormat('csv')}
              />
              <div className="option-content">
                <span className="option-icon">📊</span>
                <div className="option-info">
                  <div className="option-title">CSV</div>
                  <div className="option-subtitle">Compatível com Excel e Google Sheets</div>
                </div>
              </div>
            </label>

            <label className={`export-option ${format === 'json' ? 'selected' : ''}`}>
              <input
                type="radio"
                name="format"
                value="json"
                checked={format === 'json'}
                onChange={() => setFormat('json')}
              />
              <div className="option-content">
                <span className="option-icon">🔧</span>
                <div className="option-info">
                  <div className="option-title">JSON</div>
                  <div className="option-subtitle">Formato estruturado para integração</div>
                </div>
              </div>
            </label>
          </div>
        </div>

        <div className="modal-footer">
          <button className="btn-secondary" onClick={onClose} disabled={exporting}>
            Cancelar
          </button>
          <button className="btn-primary" onClick={handleExport} disabled={exporting}>
            {exporting ? 'Exportando...' : '📥 Exportar'}
          </button>
        </div>
      </div>
    </div>
  );
}
