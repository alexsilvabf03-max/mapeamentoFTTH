export class MenuManager {
    constructor() {
        this.modoAtivo = null; // Guarda se o usuário abriu 'CAIXAS' ou 'FIBRAS'
        
        this.btnCaixas = document.getElementById('btn-caixas');
        this.btnFibras = document.getElementById('btn-fibras');
        this.statusTexto = document.getElementById('status-modo');

        this._configurarEventos();
    }

    _configurarEventos() {
        // Quando clica em Caixas, avisamos a aplicação
        this.btnCaixas.addEventListener('click', () => this.alternarModo('CAIXAS'));
        this.btnFibras.addEventListener('click', () => this.alternarModo('FIBRAS'));
    }

    alternarModo(modo) {
        if (this.modoAtivo === modo) {
            this.limparModo();
        } else {
            this.modoAtivo = modo;
            this.statusTexto.innerText = `Modo: ${modo}`;
            this.btnCaixas.classList.toggle('ativo', modo === 'CAIXAS');
            this.btnFibras.classList.toggle('ativo', modo === 'FIBRAS');
        }
    }

    limparModo() {
        this.modoAtivo = null;
        this.statusTexto.innerText = "Modo: Navegação";
        this.btnCaixas.classList.remove('ativo');
        this.btnFibras.classList.remove('ativo');
    }
}