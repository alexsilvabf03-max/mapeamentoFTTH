import { CTO } from './caixas/CTO.js';
import { CEO } from './caixas/CEO.js';
import { MenuManager } from './interface/MenuManager.js';

// ==========================================
// 1. INICIALIZAÇÃO DO MAPA E ESTILOS
// ==========================================
const mapa = L.map('map', { doubleClickZoom: false }).setView([-3.7319, -38.5267], 14);

L.tileLayer('https://tile.openstreetmap.org/{z}/{x}/{y}.png', {
    maxZoom: 19,
    attribution: '&copy; OpenStreetMap'
}).addTo(mapa);

// Remove fundos padrão para o ícone de seta do Leaflet
const styleElement = document.createElement('style');
styleElement.innerHTML = `.custom-arrow-icon { background: transparent !important; border: none !important; }`;
document.head.appendChild(styleElement);

// Ícone de Setinha estilo Waze
const iconSetinha = L.divIcon({
    className: 'custom-arrow-icon',
    html: `
        <div id="user-arrow" style="transform: rotate(0deg); transition: transform 0.3s ease-out;">
            <svg width="36" height="36" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                <circle cx="12" cy="12" r="11" fill="#007bff" stroke="#ffffff" stroke-width="2"/>
                <path d="M12 4L17 18L12 15L7 18L12 4Z" fill="#ffffff"/>
            </svg>
        </div>
    `,
    iconSize: [36, 36],
    iconAnchor: [18, 18]
});

// ==========================================
// 2. ELEMENTOS DO DOM E MENU
// ==========================================
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

// ==========================================
// 3. ESTADOS E BANCO DE DADOS LOCAL
// ==========================================
let idContadorCaixa = 1;
let idContadorFibra = 1;

let caixasSalvas = [];
let fibrasSalvas = [];

let coordsTempCaixa = null;
let pontosCaboTemp = [];
let linhaEmProgresso = null;

let marcadorUsuario = null;
let circuloPrecisao = null;
let posicaoGpsAtual = null;

let fibraSelecionada = null; 
let modoNavegacaoAtivo = false;

// ==========================================
// 4. PERSISTÊNCIA DE DADOS (LOCALSTORAGE)
// ==========================================
function salvarDados() {
    const estadoGeral = {
        caixas: caixasSalvas,
        fibras: fibrasSalvas,
        idCaixa: idContadorCaixa,
        idFibra: idContadorFibra
    };
    localStorage.setItem('FX_FTTH_DADOS', JSON.stringify(estadoGeral));
}

function carregarDadosSalvos() {
    const dados = localStorage.getItem('FX_FTTH_DADOS');
    if (!dados) return;

    const { caixas, fibras, idCaixa, idFibra } = JSON.parse(dados);

    if (idCaixa) idContadorCaixa = idCaixa;
    if (idFibra) idContadorFibra = idFibra;

    // Recria as Caixas no mapa
    if (caixas) {
        caixas.forEach(c => {
            let caixaInstancia = c.tipo === 'CTO' 
                ? new CTO(c.id, c.nome, c.coords, c.capacidadePortas)
                : new CEO(c.id, c.nome, c.coords, c.quantidadeFusoes);

            caixasSalvas.push(c);
            const m = L.marker(c.coords).addTo(mapa);
            m.bindPopup(caixaInstancia.obterInfoPopup());
        });
    }

    // Recria as Fibras no mapa
    if (fibras) {
        fibras.forEach(f => {
            fibrasSalvas.push(f);
            const fibraLayer = L.polyline(f.pontos, { color: 'blue', weight: 4 }).addTo(mapa);
            
            fibraLayer.bindPopup(`
                <b>Identificação:</b> ${f.identificacao}<br>
                <b>Metragem Total:</b> ${f.metragemTotal}m
            `);

            fibraLayer.on('click', (e) => {
                L.DomEvent.stopPropagation(e);
                selecionarFibraParaNavegar(fibraLayer, f);
            });
        });
    }
}

function preencherInputsCoordenadas(lat, lng) {
    const inputLat = document.getElementById('caixa-lat');
    const inputLng = document.getElementById('caixa-lng');

    if (inputLat && inputLng) {
        inputLat.value = lat.toFixed(6);
        inputLng.value = lng.toFixed(6);
    }
}

// ==========================================
// 5. EVENTOS DO MAPA E MODAIS
// ==========================================
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

mapa.on('click', (e) => {
    if (menu.modoAtivo === 'CAIXAS') {
        coordsTempCaixa = e.latlng;
        document.getElementById('nome-caixa').value = `${selectTipo.value}-0${idContadorCaixa}`;
        modalCaixa.style.display = 'block';
        preencherInputsCoordenadas(e.latlng.lat, e.latlng.lng);
        return;
    }

    if (menu.modoAtivo === 'FIBRAS') {
        pontosCaboTemp.push([e.latlng.lat, e.latlng.lng]);

        if (!linhaEmProgresso) {
            linhaEmProgresso = L.polyline(pontosCaboTemp, { color: 'blue', weight: 4 }).addTo(mapa);
        } else {
            linhaEmProgresso.setLatLngs(pontosCaboTemp);
        }

        if (pontosCaboTemp.length >= 2 && btnConcluirFibra) {
            btnConcluirFibra.style.display = 'inline-block';
        }
    }
});

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

mapa.on('dblclick', () => {
    if (menu.modoAtivo !== 'FIBRAS' || pontosCaboTemp.length < 2) return;
    document.getElementById('identificacao-cabo').value = `Cabo-0${idContadorFibra}`;
    modalFibra.style.display = 'block';
});

// Salvamento de Fibra
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
        const fibraDefinitiva = L.polyline(pontosCaboTemp, { color: 'blue', weight: 4 }).addTo(mapa);

        fibraDefinitiva.bindPopup(`
            <b>Identificação:</b> ${identificacao}<br>
            <b>Distância Lançada:</b> ${distanciaMapa.toFixed(2)}m<br>
            <b>Sobra Ponto A:</b> ${sobraA}m<br>
            <b>Sobra Ponto B:</b> ${sobraB}m<br>
            <b>Metragem Total:</b> ${metragemTotal}m
        `);

        const dadosFibra = { id: idContadorFibra, identificacao, pontos: [...pontosCaboTemp], metragemTotal };
        fibrasSalvas.push(dadosFibra);

        fibraDefinitiva.on('click', (e) => {
            L.DomEvent.stopPropagation(e);
            selecionarFibraParaNavegar(fibraDefinitiva, dadosFibra);
        });

        if (linhaEmProgresso) mapa.removeLayer(linhaEmProgresso);

        idContadorFibra++;
        salvarDados();
        fecharModalFibra();
    });
}

if (btnCancelarFibra) {
    btnCancelarFibra.addEventListener('click', () => {
        if (linhaEmProgresso) mapa.removeLayer(linhaEmProgresso);
        fecharModalFibra();
    });
}

function fecharModalFibra() {
    modalFibra.style.display = 'none';
    if (btnConcluirFibra) btnConcluirFibra.style.display = 'none';
    pontosCaboTemp = [];
    linhaEmProgresso = null;
    menu.limparModo();
}

// Salvamento de Caixas
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

        caixasSalvas.push({ ...novaCaixa, tipo });
        salvarDados();

        fecharModalCaixa();
    });
}

// ==========================================
// 6. NAVEGAÇÃO GPS ESTILO WAZE
// ==========================================
mapa.on('locationfound', (e) => {
    posicaoGpsAtual = e.latlng;
    const accuracy = e.accuracy || 10;
    const heading = e.coords ? e.coords.heading : null;

    if (btnGps) btnGps.innerText = "🎯 Minha Posição";
    if (btnGpsModal) btnGpsModal.innerText = "📍 Capturar Posição GPS";

    // 1. Atualiza a Setinha
    if (!marcadorUsuario) {
        marcadorUsuario = L.marker(e.latlng, { icon: iconSetinha }).addTo(mapa);
    } else {
        marcadorUsuario.setLatLng(e.latlng);
    }

    // 2. Atualiza o Círculo de precisão
    if (circuloPrecisao) mapa.removeLayer(circuloPrecisao);
    circuloPrecisao = L.circle(e.latlng, accuracy, {
        color: '#1e88e5',
        fillColor: '#1e88e5',
        fillOpacity: 0.15,
        weight: 1
    }).addTo(mapa);

    // 3. Rotação em Tempo Real (Heading)
    if (heading !== null && heading !== undefined && !isNaN(heading)) {
        const arrowElement = document.getElementById('user-arrow');
        if (arrowElement) {
            arrowElement.style.transform = `rotate(${heading}deg)`;
        }
    }

    // 4. Centralização Automática (Waze View)
    if (modoNavegacaoAtivo) {
        mapa.setView(e.latlng, 18, { animate: true });
    }

    if (modalCaixa && modalCaixa.style.display !== 'none') {
        preencherInputsCoordenadas(e.latlng.lat, e.latlng.lng);
    }
});

mapa.on('locationerror', (e) => {
    if (btnGps) btnGps.innerText = "🎯 Minha Posição";
    if (btnGpsModal) btnGpsModal.innerText = "📍 Capturar Posição GPS";
    alert("Erro de GPS: " + e.message);
});

if (btnGps) {
    btnGps.addEventListener('click', (e) => {
        e.preventDefault();
        btnGps.innerText = "⏳ Localizando...";
        mapa.locate({ setView: true, maxZoom: 18, enableHighAccuracy: true });
    });
}

if (btnGpsModal) {
    btnGpsModal.addEventListener('click', (e) => {
        e.preventDefault();
        btnGpsModal.innerText = "⏳ Obtendo posição...";
        mapa.locate({ setView: true, maxZoom: 18, enableHighAccuracy: true });
    });
}

function selecionarFibraParaNavegar(camadaPolyline, dadosFibra) {
    if (fibraSelecionada && fibraSelecionada.layer) {
        fibraSelecionada.layer.setStyle({ color: 'blue', weight: 4 });
    }

    fibraSelecionada = { layer: camadaPolyline, dados: dadosFibra };
    fibraSelecionada.layer.setStyle({ color: '#ff9800', weight: 6 });
    alert(`Fibra "${dadosFibra?.identificacao || 'Selecionada'}" pronta! Clique em "Iniciar Navegação" para acompanhar.`);
}

if (btnNavegacao) {
    btnNavegacao.addEventListener('click', (e) => {
        e.preventDefault();

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

// Inicializa recuperando os dados gravados
carregarDadosSalvos();