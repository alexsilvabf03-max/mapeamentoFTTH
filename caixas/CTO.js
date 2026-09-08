import { Caixa } from './Caixa.js';

// Representa a CTO (Caixa de Terminação Óptica)
export class CTO extends Caixa {
    constructor(id, nome, coords, capacidadePortas) {
        // O super() passa os dados para a classe mãe (Caixa)
        super(id, nome, coords, 'CTO');
        this.capacidadePortas = capacidadePortas;
    }

    // Método para formatar os dados que vão aparecer no balão do mapa
    obterInfoPopup() {
        return `
            <b>${this.nome}</b><br>
            Tipo: <b>${this.tipo}</b><br>
            Capacidade: ${this.capacidadePortas} portas
        `;
    }
}