import { CTO } from './caixas/CTO.js';
import { CEO } from './caixas/CEO.js';
import { MenuManager } from './interface/MenuManager.js';

// 1. Inicializa o Mapa
const mapa = L.map('map', { doubleClickZoom: false }).setView([-3.7319, -38.5267], 14);

L.tileLayer('https://tile.openstreetmap.org/{z}/{x}/{y}.png', {
    maxZoom: 19,
    attribution: '&copy; OpenStreetMap'
}).addTo(mapa);

// 2. Inicializa o Menu
const menu = new MenuManager();

// Mapeamento dos Modais e Elementos no DOM
const modalCaixa = document.getElementById('modal-caixa');
const modalFibra = document.getElementById('modal-fibra');

const selectTipo = document.getElementById('tipo-caixa');
const divCamposCTO = document.getElementById('campos-cto');
const divCamposCEO = document.getElementById('campos-ceo');

const btnSalvarCaixa = document.getElementById('btn-salvar');
const btnCancelarCaixa = document.getElementById('btn-cancelar');

const btnSalvarFibra = document.getElementById('btn-salvar-fibra');
const btnCancelarFibra = document.getElementById('btn-cancelar-fibra');

const btnGps = document.getElementById('btn-gps');
const btnGpsModal = document.getElementById('btn-usar-gps-form');

let idContadorCaixa = 1;
let idContadorFibra = 1;

let coordsTempCaixa = null;

// Variáveis de Controle para Traçado de Fibras e GPS
let pontosCaboTemp = [];
let linhaEmProgresso = null;
let marcadorUsuario = null;
let circuloPrecisao = null;
let posicaoGpsAtual = null;

// Helper para preencher coordenadas no formulário
function preencherInputsCoordenadas(lat, lng) {
    const inputLat = document.getElementById('caixa-lat');
    const inputLng = document.getElementById('caixa-lng');

    if (inputLat && inputLng) {
        inputLat.value = lat.toFixed(6);
        inputLng.value = lng.toFixed(6);
    }
}

// 3. Alternância Dinâmica de Campos no Modal de Caixa
selectTipo.addEventListener('change', () => {
    if (selectTipo.value === 'CTO') {
        divCamposCTO.style.display = 'block';
        divCamposCEO.style.display = 'none';
    } else {
        divCamposCTO.style.display = 'none';
        divCamposCEO.style.display = 'block';
    }
});

// 4. Captura de Eventos no Mapa
mapa.on('click', (e) => {
    // Ação no Modo CAIXAS
    if (menu.modoAtivo === 'CAIXAS') {
        coordsTempCaixa = e.latlng;
        document.getElementById('nome-caixa').value = `${selectTipo.value}-0${idContadorCaixa}`;
        modalCaixa.style.display = 'block';
        preencherInputsCoordenadas(e.latlng.lat, e.latlng.lng);
        return;
    }

    // Ação no Modo FIBRAS (Desenho Sequencial)
    if (menu.modoAtivo === 'FIBRAS') {
        pontosCaboTemp.push([e.latlng.lat, e.latlng.lng]);

        if (!linhaEmProgresso) {
            linhaEmProgresso = L.polyline(pontosCaboTemp, { color: 'blue', weight: 4 }).addTo(mapa);
        } else {
            linhaEmProgresso.setLatLngs(pontosCaboTemp);
        }
    }
});

// Captura do novo botão no DOM
const btnConcluirFibra = document.getElementById('btn-concluir-fibra');

// 4. Captura de Eventos no Mapa
mapa.on('click', (e) => {
    // Ação no Modo CAIXAS
    if (menu.modoAtivo === 'CAIXAS') {
        coordsTempCaixa = e.latlng;
        document.getElementById('nome-caixa').value = `${selectTipo.value}-0${idContadorCaixa}`;
        modalCaixa.style.display = 'block';
        preencherInputsCoordenadas(e.latlng.lat, e.latlng.lng);
        return;
    }

    // Modo FIBRAS (Desenho Sequencial)
    if (menu.modoAtivo === 'FIBRAS') {
        pontosCaboTemp.push([e.latlng.lat, e.latlng.lng]);

        if (!linhaEmProgresso) {
            linhaEmProgresso = L.polyline(pontosCaboTemp, { color: 'blue', weight: 4 }).addTo(mapa);
        } else {
            linhaEmProgresso.setLatLngs(pontosCaboTemp);
        }

        // Exibe o botão de concluir assim que tiver pelo menos 2 pontos
        if (pontosCaboTemp.length >= 2 && btnConcluirFibra) {
            btnConcluirFibra.style.display = 'inline-block';
        }
    }

// 5. Finalização do Traçado da Fibra via BOTÃO (Ideal para Mobile)
if (btnConcluirFibra) {
    btnConcluirFibra.addEventListener('click', () => {
        if (pontosCaboTemp.length < 2) {
            alert("Desenhe pelo menos 2 pontos no mapa antes de finalizar o cabo.");
            return;
        }

        document.getElementById('identificacao-cabo').value = `Cabo-0${idContadorFibra}`;
        modalFibra.style.display = 'block';
    });
}

// Mantemos o dblclick como atalho opcional para desktop
mapa.on('dblclick', (e) => {
    if (menu.modoAtivo !== 'FIBRAS' || pontosCaboTemp.length < 2) return;

    document.getElementById('identificacao-cabo').value = `Cabo-0${idContadorFibra}`;
    modalFibra.style.display = 'block';
});

// 6. Salvamento da Fibra
btnSalvarFibra.addEventListener('click', () => {
    // 1. Coleta e validação dos inputs do modal
    const sobraA = parseFloat(document.getElementById('sobra-ponto-a').value) || 0;
    const sobraB = parseFloat(document.getElementById('sobra-ponto-b').value) || 0;
    const identificacao = document.getElementById('identificacao-cabo').value || `Cabo-0${idContadorFibra}`;

    // 2. Cálculo da distância geodésica do traçado
    let distanciaMapa = 0;
    for (let i = 0; i < pontosCaboTemp.length - 1; i++) {
        const p1 = L.latLng(pontosCaboTemp[i]);
        const p2 = L.latLng(pontosCaboTemp[i + 1]);
        distanciaMapa += p1.distanceTo(p2);
    }

    const metragemTotal = (distanciaMapa + sobraA + sobraB).toFixed(2);

    // 3. Adiciona a linha definitiva da fibra no mapa
    const fibraDefinitiva = L.polyline(pontosCaboTemp, { color: 'blue', weight: 4 }).addTo(mapa);

    // 4. Vincula o Popup com as métricas do cabo
    fibraDefinitiva.bindPopup(`
        <b>Identificação:</b> ${identificacao}<br>
        <b>Distância Lançada:</b> ${distanciaMapa.toFixed(2)}m<br>
        <b>Sobra Ponto A:</b> ${sobraA}m<br>
        <b>Sobra Ponto B:</b> ${sobraB}m<br>
        <b>Metragem Total:</b> ${metragemTotal}m
    `);

    // 5. Evento de Clique na Fibra para o Módulo de NAVEGAÇÃO GPS
    fibraDefinitiva.on('click', (e) => {
        L.DomEvent.stopPropagation(e); // Evita acionar cliques padrão no mapa
        selecionarFibraParaNavegar(fibraDefinitiva, { 
            identificacao: identificacao,
            metragemTotal: metragemTotal
        });
    });

    // 6. Salvamento da Fibra
btnSalvarFibra.addEventListener('click', () => {
    // 1. Coleta e validação dos inputs do modal
    const sobraA = parseFloat(document.getElementById('sobra-ponto-a').value) || 0;
    const sobraB = parseFloat(document.getElementById('sobra-ponto-b').value) || 0;
    const identificacao = document.getElementById('identificacao-cabo').value || `Cabo-0${idContadorFibra}`;

    // 2. Cálculo da distância geodésica do traçado
    let distanciaMapa = 0;
    for (let i = 0; i < pontosCaboTemp.length - 1; i++) {
        const p1 = L.latLng(pontosCaboTemp[i]);
        const p2 = L.latLng(pontosCaboTemp[i + 1]);
        distanciaMapa += p1.distanceTo(p2);
    }

    const metragemTotal = (distanciaMapa + sobraA + sobraB).toFixed(2);

    // 3. Adiciona a linha definitiva da fibra no mapa
    const fibraDefinitiva = L.polyline(pontosCaboTemp, { color: 'blue', weight: 4 }).addTo(mapa);

    // 4. Vincula o Popup com as métricas do cabo
    fibraDefinitiva.bindPopup(`
        <b>Identificação:</b> ${identificacao}<br>
        <b>Distância Lançada:</b> ${distanciaMapa.toFixed(2)}m<br>
        <b>Sobra Ponto A:</b> ${sobraA}m<br>
        <b>Sobra Ponto B:</b> ${sobraB}m<br>
        <b>Metragem Total:</b> ${metragemTotal}m
    `);

    // 5. Evento de Clique na Fibra para o Módulo de NAVEGAÇÃO GPS
    fibraDefinitiva.on('click', (e) => {
        L.DomEvent.stopPropagation(e); // Evita acionar cliques padrão no mapa
        selecionarFibraParaNavegar(fibraDefinitiva, { 
            identificacao: identificacao,
            metragemTotal: metragemTotal
        });
    });

   // 6. Salvamento da Fibra
btnSalvarFibra.addEventListener('click', () => {
    // 1. Coleta e validação dos inputs do modal
    const sobraA = parseFloat(document.getElementById('sobra-ponto-a').value) || 0;
    const sobraB = parseFloat(document.getElementById('sobra-ponto-b').value) || 0;
    const identificacao = document.getElementById('identificacao-cabo').value || `Cabo-0${idContadorFibra}`;

    // 2. Cálculo da distância geodésica do traçado
    let distanciaMapa = 0;
    for (let i = 0; i < pontosCaboTemp.length - 1; i++) {
        const p1 = L.latLng(pontosCaboTemp[i]);
        const p2 = L.latLng(pontosCaboTemp[i + 1]);
        distanciaMapa += p1.distanceTo(p2);
    }

    const metragemTotal = (distanciaMapa + sobraA + sobraB).toFixed(2);

    // 3. Adiciona a linha definitiva da fibra no mapa
    const fibraDefinitiva = L.polyline(pontosCaboTemp, { color: 'blue', weight: 4 }).addTo(mapa);

    // 4. Vincula o Popup com as métricas do cabo
    fibraDefinitiva.bindPopup(`
        <b>Identificação:</b> ${identificacao}<br>
        <b>Distância Lançada:</b> ${distanciaMapa.toFixed(2)}m<br>
        <b>Sobra Ponto A:</b> ${sobraA}m<br>
        <b>Sobra Ponto B:</b> ${sobraB}m<br>
        <b>Metragem Total:</b> ${metragemTotal}m
    `);

    // 5. Evento de Clique na Fibra para o Módulo de NAVEGAÇÃO GPS
    fibraDefinitiva.on('click', (e) => {
        L.DomEvent.stopPropagation(e); // Evita acionar cliques padrão no mapa
        selecionarFibraParaNavegar(fibraDefinitiva, { 
            identificacao: identificacao,
            metragemTotal: metragemTotal
        });
    });

    // 6. Remove a linha temporária de desenho do mapa
    if (linhaEmProgresso) {
        mapa.removeLayer(linhaEmProgresso);
    }

    // 7. Incrementa o contador e fecha o modal
    idContadorFibra++;
    fecharModalFibra();
});

// Evento de Cancelamento
if (btnCancelarFibra) {
    btnCancelarFibra.addEventListener('click', () => {
        if (linhaEmProgresso) {
            mapa.removeLayer(linhaEmProgresso);
        }
        fecharModalFibra();
    });
}

// Função de Fechamento do Modal e Limpeza de Estado
function fecharModalFibra() {
    modalFibra.style.display = 'none';
    if (btnConcluirFibra) {
        btnConcluirFibra.style.display = 'none'; // Esconde o botão verde do painel
    }
    pontosCaboTemp = [];
    linhaEmProgresso = null;
    menu.limparModo();
}

// ==========================================
// MÓDULO DE NAVEGAÇÃO GUIADA POR FIBRA VIA GPS
// ==========================================

let fibraSelecionada = null; 
let modoNavegacaoAtivo = false;
const btnNavegacao = document.getElementById('btn-navegacao');

function selecionarFibraParaNavegar(camadaPolyline, dadosFibra) {
    // Restaura a cor da fibra anterior se houver
    if (fibraSelecionada && fibraSelecionada.layer) {
        fibraSelecionada.layer.setStyle({ color: 'blue', weight: 4 });
    }

    // Define a nova fibra selecionada e aplica destaque visual (laranja grosso)
    fibraSelecionada = {
        layer: camadaPolyline,
        dados: dadosFibra
    };

    fibraSelecionada.layer.setStyle({ color: '#ff9800', weight: 6 });
    alert(`Fibra "${dadosFibra.identificacao}" selecionada! Clique em "Iniciar Navegação" para acompanhar no GPS.`);
}

if (btnNavegacao) {
    btnNavegacao.addEventListener('click', (e) => {
        e.preventDefault();
        e.stopPropagation();

        if (!fibraSelecionada && !modoNavegacaoAtivo) {
            alert("⚠️ Selecione primeiro qual fibra você deseja acompanhar no mapa!");
            return;
        }

        if (modoNavegacaoAtivo) {
            // Parar Navegação
            mapa.stopLocate();
            modoNavegacaoAtivo = false;
            
            btnNavegacao.innerText = "🧭 Iniciar Navegação";
            btnNavegacao.style.backgroundColor = "";
            btnNavegacao.style.color = "";

            if (fibraSelecionada && fibraSelecionada.layer) {
                fibraSelecionada.layer.setStyle({ color: 'blue', weight: 4 });
            }
        } else {
            // Iniciar Navegação Contínua
            modoNavegacaoAtivo = true;
            
            btnNavegacao.innerText = "🛑 Parar Navegação";
            btnNavegacao.style.backgroundColor = "#dc3545";
            btnNavegacao.style.color = "#ffffff";

            if (fibraSelecionada && fibraSelecionada.layer) {
                mapa.fitBounds(fibraSelecionada.layer.getBounds(), { padding: [50, 50] });
            }

            mapa.locate({ 
                setView: true, 
                maxZoom: 19, 
                watch: true, 
                enableHighAccuracy: true,
                maximumAge: 1000 
            });
        }
    });
}

// 7. Handlers de Caixas
btnCancelarCaixa.addEventListener('click', fecharModalCaixa);

function fecharModalCaixa() {
    modalCaixa.style.display = 'none';
    coordsTempCaixa = null;
    menu.limparModo();
}

btnSalvarCaixa.addEventListener('click', () => {
    if (!coordsTempCaixa) return;

    const tipo = selectTipo.value;
    const nome = document.getElementById('nome-caixa').value || "Sem Nome";
    const coords = [coordsTempCaixa.lat, coordsTempCaixa.lng];

    let novaCaixa;
    if (tipo === 'CTO') {
        const portas = parseInt(document.getElementById('portas-atendimento').value, 10) || 16;
        novaCaixa = new CTO(idContadorCaixa++, nome, coords, portas);
    } else {
        const fusoes = parseInt(document.getElementById('qtd-fusoes').value, 10) || 48;
        novaCaixa = new CEO(idContadorCaixa++, nome, coords, fusoes);
    }

    const marcador = L.marker(novaCaixa.coords).addTo(mapa);
    marcador.bindPopup(novaCaixa.obterInfoPopup());

    fecharModalCaixa();
});

// ==========================================
// CONTROLE DE LOCALIZAÇÃO VIA GPS (INDEPENDENTE)
// ==========================================

// 1. Clique no botão principal "🎯 Minha Posição"
if (btnGps) {
    btnGps.addEventListener('click', (e) => {
        e.preventDefault();
        e.stopPropagation();
        
        btnGps.innerText = "⏳ Localizando...";
        mapa.locate({ 
            setView: true, 
            maxZoom: 18, 
            enableHighAccuracy: true,
            timeout: 10000,
            maximumAge: 0
        });
    });
}

// 2. Clique no botão "📍 Capturar Posição GPS" DENTRO do Modal
if (btnGpsModal) {
    btnGpsModal.addEventListener('click', (e) => {
        e.preventDefault();
        btnGpsModal.innerText = "⏳ Obtendo posição...";
        mapa.locate({ 
            setView: true, 
            maxZoom: 18, 
            enableHighAccuracy: true,
            timeout: 10000,
            maximumAge: 0
        });
    });
}

// 3. EVENTO ÚNICO DO LEAFLET: Quando a localização é encontrada com sucesso
mapa.on('locationfound', (e) => {
    posicaoGpsAtual = e.latlng;
    const raio = e.accuracy.toFixed(1);

    if (btnGps) btnGps.innerText = "🎯 Minha Posição";
    if (btnGpsModal) btnGpsModal.innerText = "📍 Capturar Posição GPS";

    if (marcadorUsuario) mapa.removeLayer(marcadorUsuario);
    if (circuloPrecisao) mapa.removeLayer(circuloPrecisao);

    circuloPrecisao = L.circle(e.latlng, e.accuracy, {
        color: '#1e88e5',
        fillColor: '#1e88e5',
        fillOpacity: 0.15,
        weight: 1
    }).addTo(mapa);

    marcadorUsuario = L.circleMarker(e.latlng, {
        radius: 8,
        fillColor: '#1e88e5',
        color: '#ffffff',
        weight: 2,
        opacity: 1,
        fillOpacity: 0.9
    }).addTo(mapa);

    marcadorUsuario.bindPopup(`<b>Você está aqui!</b><br>Precisão do GPS: ~${raio}m`).openPopup();

    // Se o modal de caixa estiver visível na tela, preenche com o GPS
    if (modalCaixa && modalCaixa.style.display !== 'none') {
        preencherInputsCoordenadas(e.latlng.lat, e.latlng.lng);
    }
});

// 4. Trata erros de permissão ou falha de GPS
mapa.on('locationerror', (e) => {
    if (btnGps) btnGps.innerText = "🎯 Minha Posição";
    if (btnGpsModal) btnGpsModal.innerText = "📍 Capturar Posição GPS";
    alert("Não foi possível obter sua localização: " + e.message + "\nVerifique se o GPS está ativo.");
});

// ==========================================
// MÓDULO DE NAVEGAÇÃO GUIADA POR FIBRA
// ==========================================

let fibraSelecionada = null; 
let modoNavegacaoAtivo = false;
const btnNavegacao = document.getElementById('btn-navegacao');

function selecionarFibraParaNavegar(camadaPolyline, dadosFibra) {
    if (fibraSelecionada && fibraSelecionada.layer) {
        fibraSelecionada.layer.setStyle({ color: 'blue', weight: 4 });
    }

    fibraSelecionada = {
        layer: camadaPolyline,
        dados: dadosFibra
    };

    fibraSelecionada.layer.setStyle({ color: '#ff9800', weight: 6 });
    alert(`Fibra "${dadosFibra?.identificacao || 'Selecionada'}" marcada! Clique em "Iniciar Navegação" para acompanhar no GPS.`);
}

if (btnNavegacao) {
    btnNavegacao.addEventListener('click', (e) => {
        e.preventDefault();
        e.stopPropagation();

        if (!fibraSelecionada && !modoNavegacaoAtivo) {
            alert("⚠️ Selecione primeiro qual fibra você deseja acompanhar no mapa!");
            return;
        }

        if (modoNavegacaoAtivo) {
            mapa.stopLocate();
            modoNavegacaoAtivo = false;
            
            btnNavegacao.innerText = "🧭 Iniciar Navegação";
            btnNavegacao.style.backgroundColor = "";
            btnNavegacao.style.color = "";

            if (fibraSelecionada && fibraSelecionada.layer) {
                fibraSelecionada.layer.setStyle({ color: 'blue', weight: 4 });
            }
        } else {
            modoNavegacaoAtivo = true;
            
            btnNavegacao.innerText = "🛑 Parar Navegação";
            btnNavegacao.style.backgroundColor = "#dc3545";
            btnNavegacao.style.color = "#ffffff";

            if (fibraSelecionada && fibraSelecionada.layer) {
                mapa.fitBounds(fibraSelecionada.layer.getBounds(), { padding: [50, 50] });
            }

            mapa.locate({ 
                setView: true, 
                maxZoom: 19, 
                watch: true, 
                enableHighAccuracy: true,
                maximumAge: 1000 
            });
        }
    });
}

