// interface/MenuManager.js

export class MenuManager {
    constructor() {
        // Elementos da interface
        this.btnCaixas = document.getElementById('btn-caixas');
        this.btnFibras = document.getElementById('btn-fibras');
        this.btnConcluirFibra = document.getElementById('btn-concluir-fibra');
        this.statusModo = document.getElementById('status-modo');

        // Estado do modo ativo: 'NAVEGACAO' | 'CAIXAS' | 'FIBRAS'
        this.modoAtivo = 'NAVEGACAO';

        this.inicializarEventos();
    }

    inicializarEventos() {
        if (this.btnCaixas) {
            this.btnCaixas.addEventListener('click', () => {
                if (this.modoAtivo === 'CAIXAS') {
                    this.setModo('NAVEGACAO');
                } else {
                    this.setModo('CAIXAS');
                }
            });
        }

        if (this.btnFibras) {
            this.btnFibras.addEventListener('click', () => {
                if (this.modoAtivo === 'FIBRAS') {
                    this.setModo('NAVEGACAO');
                } else {
                    this.setModo('FIBRAS');
                }
            });
        }
    }

    setModo(novoModo) {
        this.modoAtivo = novoModo;
        this.atualizarInterface();
    }

    limparModo() {
        this.setModo('NAVEGACAO');
    }

    atualizarInterface() {
        // Reseta estados visuais dos botões
        if (this.btnCaixas) this.btnCaixas.classList.remove('ativo');
        if (this.btnFibras) this.btnFibras.classList.remove('ativo');

        // Oculta o botão de concluir fibra por padrão se sair do modo Fibras
        if (this.modoAtivo !== 'FIBRAS' && this.btnConcluirFibra) {
            this.btnConcluirFibra.style.display = 'none';
        }

        // Atualiza conforme o modo atual
        switch (this.modoAtivo) {
            case 'CAIXAS':
                if (this.btnCaixas) this.btnCaixas.classList.add('ativo');
                if (this.statusModo) this.statusModo.innerText = 'Modo: Adicionar Caixa (Clique no Mapa)';
                break;

            case 'FIBRAS':
                if (this.btnFibras) this.btnFibras.classList.add('ativo');
                if (this.statusModo) this.statusModo.innerText = 'Modo: Traçar Fibra (Clique para conectar)';
                break;

            case 'NAVEGACAO':
            default:
                if (this.statusModo) this.statusModo.innerText = 'Modo: Navegação';
                break;
        }
    }
}