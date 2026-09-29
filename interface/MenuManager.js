// interface/MenuManager.js
export class MenuManager {
    constructor() {
        this.modoAtivo = 'NAVEGACAO'; // NAVEGACAO | CAIXAS | FIBRAS
        this.btnCaixas = document.getElementById('btn-caixas');
        this.btnFibras = document.getElementById('btn-fibras');
        this.statusModo = document.getElementById('status-modo');

        this.initEvents();
    }

    initEvents() {
        this.btnCaixas.addEventListener('click', () => this.alternarModo('CAIXAS'));
        this.btnFibras.addEventListener('click', () => this.alternarModo('FIBRAS'));
    }

    alternarModo(novoModo) {
        if (this.modoAtivo === novoModo) {
            this.limparModo();
            return;
        }

        this.modoAtivo = novoModo;
        this.atualizarUI();
    }

    limparModo() {
        this.modoAtivo = 'NAVEGACAO';
        this.atualizarUI();
    }

    atualizarUI() {
        this.btnCaixas.classList.remove('ativo');
        this.btnFibras.classList.remove('ativo');

        if (this.modoAtivo === 'CAIXAS') {
            this.btnCaixas.classList.add('ativo');
            this.statusModo.innerText = 'Modo: Adicionar Caixa';
        } else if (this.modoAtivo === 'FIBRAS') {
            this.btnFibras.classList.add('ativo');
            this.statusModo.innerText = 'Modo: Traçar Fibra';
        } else {
            this.statusModo.innerText = 'Modo: Navegação';
        }
    }
}