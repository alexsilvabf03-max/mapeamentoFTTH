export class MenuManager {
    constructor() {
        // Estado atual do mapa: 'NAVEGACAO' | 'CAIXAS' | 'FIBRAS'
        this.modoAtivo = 'NAVEGACAO';

        // Referências dos Elementos da Interface
        this.btnCaixas = document.getElementById('btn-caixas');
        this.btnFibras = document.getElementById('btn-fibras');
        this.btnNavegacao = document.getElementById('btn-navegacao');
        this.statusTexto = document.getElementById('status-modo');

        this.init();
    }

    init() {
        // Eventos dos botões do Menu
        if (this.btnCaixas) {
            this.btnCaixas.addEventListener('click', () => this.definirModo('CAIXAS'));
        }

        if (this.btnFibras) {
            this.btnFibras.addEventListener('click', () => this.definirModo('FIBRAS'));
        }

        // Atualiza a interface para o estado inicial
        this.atualizarUI();
    }

    /**
     * Define o modo de operação atual do aplicativo
     * @param {string} novoModo - 'CAIXAS', 'FIBRAS' ou 'NAVEGACAO'
     */
    definirModo(novoModo) {
        // Se clicar no botão do modo que já está ativo, volta para NAVEGACAO
        if (this.modoAtivo === novoModo) {
            this.modoAtivo = 'NAVEGACAO';
        } else {
            this.modoAtivo = novoModo;
        }

        this.atualizarUI();
    }

    /**
     * Reseta o estado para o modo padrão (Navegação/Visualização)
     */
    limparModo() {
        this.modoAtivo = 'NAVEGACAO';
        this.atualizarUI();
    }

    /**
     * Atualiza o estado visual dos botões e o texto indicativo na tela
     */
    atualizarUI() {
        // Reseta classes ativas
        if (this.btnCaixas) this.btnCaixas.classList.remove('ativo');
        if (this.btnFibras) this.btnFibras.classList.remove('ativo');

        // Atualiza conforme o modo atual
        switch (this.modoAtivo) {
            case 'CAIXAS':
                if (this.btnCaixas) this.btnCaixas.classList.add('ativo');
                this._setMensagemStatus("Modo: Adicionando Caixa (Clique no mapa)");
                break;

            case 'FIBRAS':
                if (this.btnFibras) this.btnFibras.classList.add('ativo');
                this._setMensagemStatus("Modo: Traçando Fibra (Marque os pontos)");
                break;

            case 'NAVEGACAO':
            default:
                this._setMensagemStatus("Modo: Navegação / Seleção");
                break;
        }
    }

    _setMensagemStatus(texto) {
        if (this.statusTexto) {
            this.statusTexto.innerText = texto;
        }
    }
}