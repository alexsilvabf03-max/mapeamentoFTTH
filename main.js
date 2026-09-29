// main.js
import { MenuManager } from './interface/MenuManager.js';
import { db, collection, addDoc, onSnapshot } from './firebase-config.js';

// 1. INICIALIZAÇÃO DO MAPA LEAFLET
const map = L.map('map').setView([-3.7319, -38.5267], 14);

L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
    maxZoom: 19,
    attribution: '© OpenStreetMap - FX Telecom'
}).addTo(map);

const menuManager = new MenuManager();

// VARIÁVEIS DE ESTADO
let tempCoordsCaixa = null;
let pontosFibraTemp = [];
let polylineTemp = null;
let userMarker = null;
let watchIdGPS = null;

// ELEMENTOS DO DOM
const modalCaixa = document.getElementById('modal-caixa');
const modalFibra = document.getElementById('modal-fibra');
const selectTipoCaixa = document.getElementById('tipo-caixa');
const camposCto = document.getElementById('campos-cto');
const camposCeo = document.getElementById('campos-ceo');

const btnSalvarCaixa = document.getElementById('btn-salvar');
const btnCancelarCaixa = document.getElementById('btn-cancelar');
const btnSalvarFibra = document.getElementById('btn-salvar-fibra');
const btnCancelarFibra = document.getElementById('btn-cancelar-fibra');
const btnConcluirFibra = document.getElementById('btn-concluir-fibra');
const btnUsarGpsForm = document.getElementById('btn-usar-gps-form');
const btnGps = document.getElementById('btn-gps');
const btnNavegacao = document.getElementById('btn-navegacao');

// ALTERNÂNCIA CTO / CEO NO MODAL
selectTipoCaixa.addEventListener('change', (e) => {
    if (e.target.value === 'CTO') {
        camposCto.style.display = 'block';
        camposCeo.style.display = 'none';
    } else {
        camposCto.style.display = 'none';
        camposCeo.style.display = 'block';
    }
});

// ÍCONE DE NAVEGAÇÃO GPS
const iconSetinha = L.divIcon({
    className: 'custom-arrow-icon',
    html: `<div id="user-arrow" style="transform: rotate(0deg); transition: transform 0.3s ease;">
            <svg width="32" height="32" viewBox="0 0 24 24" fill="#007bff">
              <path d="M12 2L4.5 20.29l.71.71L12 18l6.79 3 .71-.71z"/>
            </svg>
           </div>`,
    iconSize: [32, 32],
    iconAnchor: [16, 16]
});

// FUNÇÃO AUXILIAR PARA CÁLCULO DE METRAGEM TOTAL DA FIBRA
function calcularMetragemCabo(coords) {
    let metrosTotais = 0;
    for (let i = 0; i < coords.length - 1; i++) {
        const p1 = L.latLng(coords[i][0], coords[i][1]);
        const p2 = L.latLng(coords[i + 1][0], coords[i + 1][1]);
        metrosTotais += p1.distanceTo(p2);
    }
    return Math.round(metrosTotais);
}

// 2. SINCRONIZAÇÃO EM TEMPO REAL COM FIREBASE
function escutarDadosNuvem() {
    onSnapshot(collection(db, "caixas"), (snapshot) => {
        snapshot.docChanges().forEach((change) => {
            if (change.type === "added") {
                const c = change.doc.data();
                const iconeEmoji = c.tipo === 'CTO' ? '📦' : '⚡';
                const marker = L.marker([c.lat, c.lng]).addTo(map);
                
                let conteudoPopup = `<b>${iconeEmoji} ${c.tipo}: ${c.nome}</b><br>`;
                if (c.tipo === 'CTO') conteudoPopup += `Portas: ${c.portas}`;
                if (c.tipo === 'CEO') conteudoPopup += `Fusões: ${c.fusoes}`;
                
                marker.bindPopup(conteudoPopup);
            }
        });
    });

    onSnapshot(collection(db, "fibras"), (snapshot) => {
        snapshot.docChanges().forEach((change) => {
            if (change.type === "added") {
                const f = change.doc.data();
                const polyline = L.polyline(f.coords, { color: '#dc3545', weight: 4 }).addTo(map);
                polyline.bindPopup(`<b>🧵 Cabo: ${f.nome}</b><br>Lançamento: ${f.metragemLançada || 0}m<br>Total (+ Sobras): ${f.metragemTotal || 0}m`);
            }
        });
    });
}
escutarDadosNuvem();

// 3. CLIQUE NO MAPA
map.on('click', (e) => {
    const { lat, lng } = e.latlng;

    if (menuManager.modoAtivo === 'CAIXAS') {
        tempCoordsCaixa = { lat, lng };
        document.getElementById('caixa-lat').value = lat.toFixed(6);
        document.getElementById('caixa-lng').value = lng.toFixed(6);
        modalCaixa.style.display = 'block';
    } 
    else if (menuManager.modoAtivo === 'FIBRAS') {
        pontosFibraTemp.push([lat, lng]);

        if (!polylineTemp) {
            polylineTemp = L.polyline(pontosFibraTemp, { color: '#28a745', weight: 4, dashArray: '5, 10' }).addTo(map);
        } else {
            polylineTemp.setLatLngs(pontosFibraTemp);
        }

        if (pontosFibraTemp.length >= 2) {
            btnConcluirFibra.style.display = 'inline-flex';
        }
    }
});

// 4. SALVAMENTO E MODAIS
btnSalvarCaixa.addEventListener('click', async () => {
    const nome = document.getElementById('nome-caixa').value;
    const tipo = document.getElementById('tipo-caixa').value;
    const portas = document.getElementById('portas-atendimento').value;
    const fusoes = document.getElementById('qtd-fusoes').value;

    if (!nome) return alert('Insira a identificação da caixa!');

    const dadosCaixa = {
        nome,
        tipo,
        portas: tipo === 'CTO' ? portas : null,
        fusoes: tipo === 'CEO' ? fusoes : null,
        lat: tempCoordsCaixa.lat,
        lng: tempCoordsCaixa.lng,
        criadoEm: new Date().toISOString()
    };

    try {
        await addDoc(collection(db, "caixas"), dadosCaixa);
        modalCaixa.style.display = 'none';
        document.getElementById('nome-caixa').value = '';
        menuManager.limparModo();
    } catch (err) {
        console.error("Erro ao salvar caixa: ", err);
        alert("Erro ao salvar caixa no banco!");
    }
});

btnCancelarCaixa.addEventListener('click', () => {
    modalCaixa.style.display = 'none';
    menuManager.limparModo();
});

btnConcluirFibra.addEventListener('click', () => {
    modalFibra.style.display = 'block';
});

btnSalvarFibra.addEventListener('click', async () => {
    const nome = document.getElementById('identificacao-cabo').value;
    const sobraA = Number(document.getElementById('sobra-ponto-a').value || 0);
    const sobraB = Number(document.getElementById('sobra-ponto-b').value || 0);

    if (!nome) return alert('Insira o nome do cabo!');

    const metragemLancada = calcularMetragemCabo(pontosFibraTemp);
    const metragemTotal = metragemLancada + sobraA + sobraB;

    const dadosFibra = {
        nome,
        sobraA,
        sobraB,
        metragemLançada: metragemLancada,
        metragemTotal: metragemTotal,
        coords: pontosFibraTemp,
        criadoEm: new Date().toISOString()
    };

    try {
        await addDoc(collection(db, "fibras"), dadosFibra);
        
        if (polylineTemp) map.removeLayer(polylineTemp);
        polylineTemp = null;
        pontosFibraTemp = [];
        
        modalFibra.style.display = 'none';
        btnConcluirFibra.style.display = 'none';
        menuManager.limparModo();
    } catch (err) {
        console.error("Erro ao salvar fibra: ", err);
        alert("Erro ao salvar cabo no banco!");
    }
});

btnCancelarFibra.addEventListener('click', () => {
    modalFibra.style.display = 'none';
    if (polylineTemp) map.removeLayer(polylineTemp);
    polylineTemp = null;
    pontosFibraTemp = [];
    btnConcluirFibra.style.display = 'none';
    menuManager.limparModo();
});

// 5. NAVEGAÇÃO GPS
function ativarNavegacaoGPS() {
    if (!navigator.geolocation) {
        return alert("Seu dispositivo não suporta geolocalização.");
    }

    if (watchIdGPS !== null) {
        navigator.geolocation.clearWatch(watchIdGPS);
        watchIdGPS = null;
        btnNavegacao.classList.remove('ativo');
        btnNavegacao.innerText = "🧭 Iniciar Navegação";
        return;
    }

    btnNavegacao.classList.add('ativo');
    btnNavegacao.innerText = "🛑 Parar Navegação";

    watchIdGPS = navigator.geolocation.watchPosition((pos) => {
        const { latitude, longitude, heading } = pos.coords;
        const currentLatLng = [latitude, longitude];

        if (!userMarker) {
            userMarker = L.marker(currentLatLng, { icon: iconSetinha }).addTo(map);
        } else {
            userMarker.setLatLng(currentLatLng);
        }

        map.setView(currentLatLng, 18, { animate: true });

        if (heading !== null && heading !== undefined && !isNaN(heading)) {
            const arrowEl = document.getElementById('user-arrow');
            if (arrowEl) arrowEl.style.transform = `rotate(${heading}deg)`;
        }
    }, (err) => {
        console.error("Erro de GPS:", err);
    }, {
        enableHighAccuracy: true,
        maximumAge: 1000,
        timeout: 5000
    });
}

btnNavegacao.addEventListener('click', ativarNavegacaoGPS);

btnGps.addEventListener('click', () => {
    navigator.geolocation.getCurrentPosition((pos) => {
        const { latitude, longitude } = pos.coords;
        map.setView([latitude, longitude], 17);
    });
});

btnUsarGpsForm.addEventListener('click', () => {
    navigator.geolocation.getCurrentPosition((pos) => {
        const { latitude, longitude } = pos.coords;
        tempCoordsCaixa = { lat: latitude, lng: longitude };
        document.getElementById('caixa-lat').value = latitude.toFixed(6);
        document.getElementById('caixa-lng').value = longitude.toFixed(6);
    });
});