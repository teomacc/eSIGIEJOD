/**
 * SERVIÇO DE AUDITORIA - Frontend
 * 
 * Responsabilidade: Rastrear ações significativas do utilizador
 * 
 * Eventos auditados (apenas ações relevantes para admin/líder):
 * - Login/Logout (autenticação)
 * - Navegação entre páginas
 * - Cliques em botões de ação (Criar, Editar, Aprovar, Rejeitar, etc)
 * - Submissão de formulários
 * - Erros de aplicação
 * 
 * NÃO rastreamos:
 * - Movimento de mouse (muito granular)
 * - Hover events (não são ações)
 * - Scroll (não é ação significativa)
 * - Cada keystroke (apenas form submission)
 */

import { apiClient } from "../api/client";

interface AuditEvent {
  action: string;
  description: string;
  entityType?: string;
  entityId?: string;
  changes?: any;
  metadata?: {
    url?: string;
    timestamp?: string;
    pageTitle?: string;
  };
}

class AuditService {
  private queue: AuditEvent[] = [];
  private batchSize = 10;
  private flushInterval = 5000; // 5 segundos
  private sessionStartTime = new Date();
  private currentUserName = '';

  constructor() {
    this.initializeGlobalListeners();
    this.startBatchFlush();
  }

  /**
   * Definir nome do utilizador (chamado após login)
   */
  setCurrentUser(userName: string) {
    this.currentUserName = userName;
  }

  /**
   * Inicializar listeners globais
   */
  private initializeGlobalListeners() {
    // Click listener apenas para botões e elementos de ação
    document.addEventListener('click', (e) => this.handleGlobalClick(e));

    // Form listeners
    document.addEventListener('submit', (e) => this.handleFormSubmit(e));

    // Window listeners
    window.addEventListener('error', (e) => this.handleError(e));
    window.addEventListener('visibilitychange', () => this.handleVisibilityChange());
    window.addEventListener('popstate', () => this.handleNavigation());
  }

  /**
   * Handle click - apenas registar cliques em botões/elementos de ação
   */
  private handleGlobalClick(event: MouseEvent) {
    // Ignorar auditoria na página de login
    if (window.location.pathname === '/login') {
      return;
    }

    const target = event.target as HTMLElement;
    
    // Ignorar cliques em elementos não-interactivos
    if (!this.isActionableElement(target)) {
      return;
    }

    const buttonText = target.textContent?.trim() || target.getAttribute('title') || 'Botão';
    const buttonClass = target.className || '';

    // Ignorar hover e outros eventos de cursor
    if (buttonClass.includes('hover') || buttonClass.includes('focus')) {
      return;
    }

    this.logEvent({
      action: 'BUTTON_CLICKED',
      description: `Clique em: ${buttonText}`,
      metadata: {
        url: window.location.href,
        timestamp: new Date().toISOString(),
        pageTitle: document.title,
      }
    });
  }

  /**
   * Verificar se elemento é de ação (botão, link, etc)
   */
  private isActionableElement(element: HTMLElement): boolean {
    const actionableTags = ['BUTTON', 'A', 'INPUT', 'SELECT'];
    if (actionableTags.includes(element.tagName)) {
      return true;
    }

    // Verificar se tem classes de ação
    const actionClasses = ['btn', 'button', 'link', 'action', 'submit'];
    const className = element.className.toLowerCase();
    return actionClasses.some(cls => className.includes(cls));
  }

  /**
   * Handle form submission
   */
  private handleFormSubmit(event: Event) {
    // Ignorar auditoria na página de login
    if (window.location.pathname === '/login') {
      return;
    }

    const form = event.target as HTMLFormElement;
    const formName = form.name || form.id || 'Formulário sem nome';
    
    this.logEvent({
      action: 'FORM_SUBMITTED',
      description: `Formulário submetido: ${formName}`,
      metadata: {
        url: window.location.href,
        timestamp: new Date().toISOString(),
        pageTitle: document.title,
      }
    });
  }

  /**
   * Handle error
   */
  private handleError(event: ErrorEvent) {
    this.logEvent({
      action: 'ERROR_OCCURRED',
      description: `Erro: ${event.message}`,
      metadata: {
        url: window.location.href,
        timestamp: new Date().toISOString(),
        pageTitle: document.title,
      }
    });
  }

  /**
   * Handle page visibility change
   */
  private handleVisibilityChange() {
    const isHidden = document.hidden;
    this.logEvent({
      action: isHidden ? 'PAGE_HIDDEN' : 'PAGE_VISIBLE',
      description: isHidden ? 'Utilizador deixou de ver a página' : 'Utilizador voltou à página',
      metadata: {
        url: window.location.href,
        timestamp: new Date().toISOString(),
        pageTitle: document.title,
      }
    });
  }

  /**
   * Handle navigation
   */
  private handleNavigation() {
    this.logEvent({
      action: 'PAGE_NAVIGATION',
      description: `Navegação para: ${window.location.pathname}`,
      metadata: {
        url: window.location.href,
        timestamp: new Date().toISOString(),
        pageTitle: document.title,
      }
    });
  }

  /**
   * Logar evento
   */
  private logEvent(event: AuditEvent) {
    // Adicionar timestamp se não existir
    if (!event.metadata?.timestamp) {
      event.metadata = event.metadata || {};
      event.metadata.timestamp = new Date().toISOString();
    }

    this.queue.push(event);

    // Flush se atingiu tamanho máximo
    if (this.queue.length >= this.batchSize) {
      this.flush();
    }
  }

  /**
   * Logar login
   */
  logLogin(userEmail: string) {
    this.setCurrentUser(userEmail);
    this.logEvent({
      action: 'USER_LOGIN',
      description: `Utilizador fez login: ${userEmail}`,
      metadata: {
        url: window.location.href,
        timestamp: new Date().toISOString(),
        pageTitle: document.title,
      }
    });
    this.sessionStartTime = new Date();
  }

  /**
   * Logar logout
   */
  logLogout() {
    const sessionDuration = Math.round((new Date().getTime() - this.sessionStartTime.getTime()) / 1000);
    this.logEvent({
      action: 'USER_LOGOUT',
      description: `Utilizador fez logout (sessão: ${sessionDuration}s)`,
      metadata: {
        url: window.location.href,
        timestamp: new Date().toISOString(),
        pageTitle: document.title,
      }
    });
    this.currentUserName = '';
  }

  /**
   * Logar ação de negócio manualmente
   */
  logBusinessAction(data: {
    action: string;
    description: string;
    entityType?: string;
    entityId?: string;
    changes?: any;
  }) {
    this.logEvent({
      action: data.action,
      description: data.description,
      entityType: data.entityType,
      entityId: data.entityId,
      changes: data.changes,
      metadata: {
        url: window.location.href,
        timestamp: new Date().toISOString(),
        pageTitle: document.title,
      }
    });
  }

  /**
   * Enviar batch de eventos para o servidor
   */
  private async flush() {
    if (this.queue.length === 0) {
      return;
    }

    const eventsToSend = [...this.queue];
    this.queue = []; // Limpar fila

    try {
      await apiClient.post('/audit/batch-log', {
        events: eventsToSend
      });
    } catch (error) {
      // Re-adicionar à fila se falhar
      this.queue.unshift(...eventsToSend);
      console.error('Erro ao enviar audit logs:', error);
    }
  }

  /**
   * Iniciar auto-flush a cada 5 segundos
   */
  private startBatchFlush() {
    setInterval(() => {
      if (this.queue.length > 0) {
        this.flush();
      }
    }, this.flushInterval);
  }
}

// Criar instância global singleton
export const auditService = new AuditService();

export default auditService;
