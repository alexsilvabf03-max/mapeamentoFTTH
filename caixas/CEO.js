import { Caixa } from './Caixa.js';

// Representa a CEO (Caixa de Emenda Óptica)
export class CEO extends Caixa {
    constructor(id, nome, coords, quantidadeFusoes) {
        super(id, nome, coords, 'CEO');
        this.quantidadeFusoes = quantidadeFusoes;
    }

    // Método para formatar os dados que vão aparecer no balão do mapa
    obterInfoPopup() {
        return `
            <b>${this.nome}</b><br>
            Tipo: <b>${this.tipo}</b><br>
            Capacidade: ${this.quantidadeFusoes} fusões
        `;
    }
}