// Classe base (Mãe) para qualquer caixa de rede
export class Caixa {
    constructor(id, nome, coords, tipo) {
        this.id = id;          // Ex: 1
        this.nome = nome;      // Ex: "CTO-01"
        this.coords = coords;  // Ex: [-3.7319, -38.5267]
        this.tipo = tipo;      // Ex: "CTO" ou "CEO"
    }
}
