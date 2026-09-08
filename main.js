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

// 5. Finalização do Traçado da Fibra no Duplo Clique
mapa.on('dblclick', (e) => {
    if (menu.modoAtivo !== 'FIBRAS' || pontosCaboTemp.length < 2) return;

    document.getElementById('identificacao-cabo').value = `Cabo-0${idContadorFibra}`;
    modalFibra.style.display = 'block';
});

// 6. Salvamento da Fibra
btnSalvarFibra.addEventListener('click', () => {
    const sobraA = parseFloat(document.getElementById('sobra-ponto-a').value) || 0;
    const sobraB = parseFloat(document.getElementById('sobra-ponto-b').value) || 0;
    const identificacao = document.getElementById('identificacao-cabo').value || `Cabo-0${idContadorFibra}`;

    let distanciaMapa = 0;
    for (let i = 0; i < pontosCaboTemp.length - 1; i++) {
        const p1 = L.latLng(pontosCaboTemp[i]);
        const p2 = L.latLng(pontosCaboTemp[i + 1]);
        distanciaMapa += p1.distanceTo(p2);
    }

    const metragemTotal = (distanciaMapa + sobraA + sobraB).toFixed(2);

    linhaEmProgresso.bindPopup(`
        <b>Identificação:</b> ${identificacao}<br>
        <b>Distância Lançada:</b> ${distanciaMapa.toFixed(2)}m<br>
        <b>Sobra Ponto A:</b> ${sobraA}m<br>
        <b>Sobra Ponto B:</b> ${sobraB}m<br>
        <b>Metragem Total:</b> ${metragemTotal}m
    `);

    idContadorFibra++;
    fecharModalFibra();
});

btnCancelarFibra.addEventListener('click', () => {
    if (linhaEmProgresso) {
        mapa.removeLayer(linhaEmProgresso);
    }
    fecharModalFibra();
});

function fecharModalFibra() {
    modalFibra.style.display = 'none';
    pontosCaboTemp = [];
    linhaEmProgresso = null;
    menu.limparModo();
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