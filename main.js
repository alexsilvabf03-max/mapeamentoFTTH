import { CTO } from './caixas/CTO.js';
import { CEO } from './caixas/CEO.js';
import { MenuManager } from './interface/MenuManager.js';

// 1. Inicializa o Mapa
const mapa = L.map('map', { doubleClickZoom: false }).setView([-3.7319, -38.5267], 14);

L.tileLayer('https://tile.openstreetmap.org/{z}/{x}/{y}.png', {
    maxZoom: 19,
    attribution: '&copy; OpenStreetMap'
}).addTo(mapa);

// 2. Inicializa o Menu e Elementos do DOM
const menu = new MenuManager();

const modalCaixa = document.getElementById('modal-caixa');
const modalFibra = document.getElementById('modal-fibra');

const selectTipo = document.getElementById('tipo-caixa');
const divCamposCTO = document.getElementById('campos-cto');
const divCamposCEO = document.getElementById('campos-ceo');

const btnSalvarCaixa = document.getElementById('btn-salvar');
const btnCancelarCaixa = document.getElementById('btn-cancelar');

const btnConcluirFibra = document.getElementById('btn-concluir-fibra');
const btnSalvarFibra = document.getElementById('btn-salvar-fibra');
const btnCancelarFibra = document.getElementById('btn-cancelar-fibra');

const btnGps = document.getElementById('btn-gps');
const btnGpsModal = document.getElementById('btn-usar-gps-form');
const btnNavegacao = document.getElementById('btn-navegacao');

// Contadores e Estados Globais
let idContadorCaixa = 1;
let idContadorFibra = 1;

let coordsTempCaixa = null;
let pontosCaboTemp = [];
let linhaEmProgresso = null;

// Estados do GPS e Navegação
let marcadorUsuario = null;
let circuloPrecisao = null;
let posicaoGpsAtual = null;

let fibraSelecionada = null; 
let modoNavegacaoAtivo = false;

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
if (selectTipo) {
    selectTipo.addEventListener('change', () => {
        if (selectTipo.value === 'CTO') {
            divCamposCTO.style.display = 'block';
            divCamposCEO.style.display = 'none';
        } else {
            divCamposCTO.style.display = 'none';
            divCamposCEO.style.display = 'block';
        }
    });
}

// 4. Captura de Eventos de Clique no Mapa
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
});

// 5. Finalização do Traçado da Fibra via BOTÃO (Mobile)
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

// Atalho opcional para Desktop (Duplo Clique)
mapa.on('dblclick', () => {
    if (menu.modoAtivo !== 'FIBRAS' || pontosCaboTemp.length < 2) return;

    document.getElementById('identificacao-cabo').value = `Cabo-0${idContadorFibra}`;
    modalFibra.style.display = 'block';
});

// 6. Salvamento da Fibra
if (btnSalvarFibra) {
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

        // Adiciona a linha definitiva da fibra
        const fibraDefinitiva = L.polyline(pontosCaboTemp, { color: 'blue', weight: 4 }).addTo(mapa);

        fibraDefinitiva.bindPopup(`
            <b>Identificação:</b> ${identificacao}<br>
            <b>Distância Lançada:</b> ${distanciaMapa.toFixed(2)}m<br>
            <b>Sobra Ponto A:</b> ${sobraA}m<br>
            <b>Sobra Ponto B:</b> ${sobraB}m<br>
            <b>Metragem Total:</b> ${metragemTotal}m
        `);

        // Clique na fibra seleciona ela para Navegação GPS
        fibraDefinitiva.on('click', (e) => {
            L.DomEvent.stopPropagation(e);
            selecionarFibraParaNavegar(fibraDefinitiva, { 
                identificacao: identificacao,
                metragemTotal: metragemTotal
            });
        });

        if (linhaEmProgresso) {
            mapa.removeLayer(linhaEmProgresso);
        }

        idContadorFibra++;
        fecharModalFibra();
    });
}

if (btnCancelarFibra) {
    btnCancelarFibra.addEventListener('click', () => {
        if (linhaEmProgresso) {
            mapa.removeLayer(linhaEmProgresso);
        }
        fecharModalFibra();
    });
}

function fecharModalFibra() {
    modalFibra.style.display = 'none';
    if (btnConcluirFibra) {
        btnConcluirFibra.style.display = 'none';
    }
    pontosCaboTemp = [];
    linhaEmProgresso = null;
    menu.limparModo();
}

// 7. Handlers do Modal de Caixas
if (btnCancelarCaixa) btnCancelarCaixa.addEventListener('click', fecharModalCaixa);

function fecharModalCaixa() {
    modalCaixa.style.display = 'none';
    coordsTempCaixa = null;
    menu.limparModo();
}

if (btnSalvarCaixa) {
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
}

// ==========================================
// CONTROLE DE LOCALIZAÇÃO VIA GPS (PONTUAL)
// ==========================================

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

mapa.on('locationfound', (e) => {
    posicaoGpsAtual = e.latlng;
    const raio = e.accuracy.toFixed(1);

    if (btnGps) btnGps.innerText = "🎯 Minha Posição";
    if (btnGpsModal) btnGpsModal.innerText = "📍 Capturar Posição GPS";

    if (modoNavegacaoAtivo) {
        mapa.panTo(e.latlng);
    }

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

    marcadorUsuario.bindPopup(`<b>Você está aqui!</b><br>Precisão: ~${raio}m`);

    if (modalCaixa && modalCaixa.style.display !== 'none') {
        preencherInputsCoordenadas(e.latlng.lat, e.latlng.lng);
    }
});

mapa.on('locationerror', (e) => {
    if (btnGps) btnGps.innerText = "🎯 Minha Posição";
    if (btnGpsModal) btnGpsModal.innerText = "📍 Capturar Posição GPS";
    alert("Não foi possível obter sua localização: " + e.message + "\nVerifique se o GPS está ativo.");
});

// ==========================================
// MÓDULO DE NAVEGAÇÃO GUIADA POR FIBRA VIA GPS
// ==========================================

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