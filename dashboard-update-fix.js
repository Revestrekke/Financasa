/**
 * Dashboard Update Fix - Sistema de Reatividade para Atualização Automática
 * Este arquivo deve ser incluído APÓS o dashboard-layout.js no index.html
 * 
 * Soluciona o problema: "Os cards do dashboard não estão atualizando conforme 
 * faço novos cadastros de contas bancárias, orçamentos, etc."
 */

(function() {
  'use strict';

  // Intervalo de polling em ms (cada 2 segundos)
  const POLLING_INTERVAL = 2000;
  let lastUpdateTime = 0;

  /**
   * Função principal que dispara atualização do dashboard
   * @param {string} type - Tipo de atualização: 'account', 'budget', 'goal', 'transaction'
   */
  function triggerDashboardUpdate(type) {
    console.log(`[Dashboard] Triggering update for: ${type}`);
    
    // Dispara evento customizado
    const event = new CustomEvent('dashboardDataChanged', {
      detail: { 
        type,
        timestamp: Date.now()
      }
    });
    window.dispatchEvent(event);

    // Atualiza localStorage com timestamp
    localStorage.setItem('financasa_lastUpdate', Date.now());
    
    // Aguarda um pouco para o banco de dados sincronizar
    setTimeout(() => {
      refreshDashboardCards(type);
    }, 300);
  }

  /**
   * Recarrega os dados do dashboard baseado no tipo de atualização
   * @param {string} type - Tipo de dados a recarregar
   */
  function refreshDashboardCards(type) {
    try {
      // Recarrega dados baseado no tipo
      switch(type) {
        case 'account':
        case 'transaction':
          if (typeof renderContas === 'function') renderContas();
          if (typeof renderDashboardCards === 'function') renderDashboardCards();
          if (typeof updateDashboard === 'function') updateDashboard();
          break;
        
        case 'budget':
          if (typeof salvarOrcamento === 'function') renderDashboardCards();
          if (typeof updateDashboard === 'function') updateDashboard();
          break;
        
        case 'goal':
        case 'meta':
          if (typeof renderMetas === 'function') renderMetas();
          if (typeof renderDashboardCards === 'function') renderDashboardCards();
          break;
        
        default:
          if (typeof renderDashboardCards === 'function') renderDashboardCards();
          if (typeof updateDashboard === 'function') updateDashboard();
      }
      
      console.log(`[Dashboard] Updated: ${type}`);
    } catch (error) {
      console.error(`[Dashboard] Error updating ${type}:`, error);
    }
  }

  /**
   * Pollingwatch para detectar mudanças via localStorage
   */
  function setupPollingWatch() {
    setInterval(() => {
      const currentUpdate = localStorage.getItem('financasa_lastUpdate');
      if (currentUpdate && parseInt(currentUpdate) > lastUpdateTime) {
        lastUpdateTime = parseInt(currentUpdate);
        console.log('[Dashboard] Change detected via polling');
        refreshDashboardCards('all');
      }
    }, POLLING_INTERVAL);
  }

  /**
   * Listener para detectar mudanças via storage entre abas
   */
  function setupStorageListener() {
    window.addEventListener('storage', (e) => {
      if (e.key === 'financasa_lastUpdate') {
        console.log('[Dashboard] Change detected from another tab');
        refreshDashboardCards('all');
      }
    });
  }

  /**
   * Override da função salvarConta para triggar atualização
   */
  function patchSalvarConta() {
    if (typeof window.salvarConta !== 'function') return;
    
    const originalSalvarConta = window.salvarConta;
    window.salvarConta = async function() {
      const result = await originalSalvarConta.apply(this, arguments);
      triggerDashboardUpdate('account');
      return result;
    };
  }

  /**
   * Override da função salvarOrcamento para triggar atualização
   */
  function patchSalvarOrcamento() {
    if (typeof window.salvarOrcamento !== 'function') return;
    
    const originalSalvarOrcamento = window.salvarOrcamento;
    window.salvarOrcamento = async function() {
      const result = await originalSalvarOrcamento.apply(this, arguments);
      triggerDashboardUpdate('budget');
      return result;
    };
  }

  /**
   * Override da função salvarMeta para triggar atualização
   */
  function patchSalvarMeta() {
    if (typeof window.salvarMeta !== 'function') return;
    
    const originalSalvarMeta = window.salvarMeta;
    window.salvarMeta = async function() {
      const result = await originalSalvarMeta.apply(this, arguments);
      triggerDashboardUpdate('goal');
      return result;
    };
  }

  /**
   * Override da função salvar (para lançamentos/transações) para triggar atualização
   */
  function patchSalvar() {
    if (typeof window.salvar !== 'function') return;
    
    const originalSalvar = window.salvar;
    window.salvar = async function() {
      const result = await originalSalvar.apply(this, arguments);
      triggerDashboardUpdate('transaction');
      return result;
    };
  }

  /**
   * Listener customizado global
   */
  function setupCustomEventListener() {
    window.addEventListener('dashboardDataChanged', (e) => {
      const { type, timestamp } = e.detail;
      console.log(`[Dashboard Event] Type: ${type}, Timestamp: ${timestamp}`);
      
      // Feedback visual (opcional)
      showDashboardUpdateFeedback(type);
    });
  }

  /**
   * Mostra feedback visual de atualização (opcional)
   */
  function showDashboardUpdateFeedback(type) {
    // Se a função toast existir, mostra notificação
    if (typeof window.toast === 'function') {
      const typeMap = {
        'account': 'Contas atualizadas',
        'budget': 'Orçamento atualizado',
        'goal': 'Metas atualizadas',
        'transaction': 'Transação registrada',
        'all': 'Dashboard atualizado'
      };
      
      // Apenas mostra em caso de sucesso, silenciosamente
      // window.toast(typeMap[type] || 'Dados atualizados', 'success');
    }
  }

  /**
   * Inicializa o sistema de atualização
   */
  function init() {
    console.log('[Dashboard] Initializing auto-update system...');

    // Apply patches para funções de salvamento
    patchSalvarConta();
    patchSalvarOrcamento();
    patchSalvarMeta();
    patchSalvar();

    // Setup listeners
    setupCustomEventListener();
    setupStorageListener();
    setupPollingWatch();

    console.log('[Dashboard] Auto-update system initialized');
  }

  // Aguarda o DOM estar pronto
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    // Se já estiver pronto, executa imediatamente
    setTimeout(init, 500); // Pequeno delay para garantir que outras scripts carregaram
  }

  // Exporta funções úteis
  window.DashboardUpdater = {
    triggerUpdate: triggerDashboardUpdate,
    refreshCards: refreshDashboardCards,
    init
  };

})();
