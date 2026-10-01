// main.js
import { MenuManager } from './interface/MenuManager.js';
import { db, collection, addDoc, onSnapshot, doc, deleteDoc } from './firebase-config.js';

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
            const id = change.doc.id; // 📍 ID do documento no Firestore
            const c = change.doc.data();
            const iconeEmoji = c.tipo === 'CTO' ? '📦' : '⚡';
            const marker = L.marker([c.lat, c.lng]).addTo(map);

            marker.firestoreId = id; // 📍 Guarda a referência no Marker

            let conteudoPopup = `<b>${iconeEmoji} ${c.tipo}: ${c.nome}</b><br>`;
            if (c.tipo === 'CTO') conteudoPopup += `Portas: ${c.portas}<br>`;
            if (c.tipo === 'CEO') conteudoPopup += `Fusões: ${c.fusoes}<br>`;

            // 📍 Botão de Excluir
            conteudoPopup += `
                <div style="margin-top: 8px; text-align: center;">
                    <button onclick="deletarElemento('caixas', '${id}')"
                            style="background:#dc3545; color:white; border:none; padding:5px 10px; border-radius:4px; cursor:pointer; font-size:12px; font-weight:bold;">
                        🗑️ Excluir ${c.tipo}
                    </button>
                </div>
            `;

            marker.bindPopup(conteudoPopup);
        }
    });
});

    // ESCUTA EM TEMPO REAL DAS FIBRAS
   onSnapshot(collection(db, "fibras"), (snapshot) => {
    snapshot.docChanges().forEach((change) => {
        if (change.type === "added") {
            const id = change.doc.id; // 📍 ID do documento no Firestore
            const f = change.doc.data();

            const latLngs = f.coords.map(c => Array.isArray(c) ? c : [c.lat, c.lng]);
            const polyline = L.polyline(latLngs, { color: '#dc3545', weight: 4 }).addTo(map);

            polyline.firestoreId = id; // 📍 Guarda a referência na Polyline

            let conteudoPopup = `<b>🧵 Cabo: ${f.nome}</b><br>Sobra A: ${f.sobraA || 0}m | Sobra B: ${f.sobraB || 0}m<br>`;
            conteudoPopup += `
                <div style="margin-top: 8px; text-align: center;">
                    <button onclick="deletarElemento('fibras', '${id}')"
                            style="background:#dc3545; color:white; border:none; padding:5px 10px; border-radius:4px; cursor:pointer; font-size:12px; font-weight:bold;">
                        🗑️ Excluir Cabo
                    </button>
                </div>
            `;

            polyline.bindPopup(conteudoPopup);
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

// 4. AÇÃO DO BOTÃO "FINALIZAR CABO" (ABRE O MODAL)
btnConcluirFibra.addEventListener('click', (e) => {
    e.preventDefault();
    e.stopPropagation();

    if (pontosFibraTemp.length < 2) {
        alert('Selecione pelo menos 2 pontos no mapa para formar um cabo!');
        return;
    }

    modalFibra.style.display = 'block';
});

// 5. SALVAMENTO E MODAIS DE CAIXA E FIBRA
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

// EVENTO DE SALVAR FIBRA
btnSalvarFibra.addEventListener('click', async () => {
    const nome = document.getElementById('identificacao-cabo').value;
    const sobraA = Number(document.getElementById('sobra-ponto-a').value || 0);
    const sobraB = Number(document.getElementById('sobra-ponto-b').value || 0);

    if (!nome) return alert('Insira o nome do cabo!');
    if (pontosFibraTemp.length < 2) return alert('Selecione pelo menos 2 pontos no mapa!');

    // Converte [[lat, lng], ...] para [{ lat, lng }, ...] (Compatível com Firestore)
    const coordsLimpas = pontosFibraTemp.map(pt => ({
        lat: pt[0],
        lng: pt[1]
    }));

    const dadosFibra = {
        nome,
        sobraA,
        sobraB,
        coords: coordsLimpas,
        criadoEm: new Date().toISOString()
    };

    try {
        await addDoc(collection(db, "fibras"), dadosFibra);
        
        if (polylineTemp) map.removeLayer(polylineTemp);
        polylineTemp = null;
        pontosFibraTemp = [];
        
        document.getElementById('identificacao-cabo').value = '';
        document.getElementById('sobra-ponto-a').value = '';
        document.getElementById('sobra-ponto-b').value = '';

        modalFibra.style.display = 'none';
        btnConcluirFibra.style.display = 'none';
        menuManager.limparModo();
        alert('Cabo salvo com sucesso!');
    } catch (err) {
        console.error("Erro detalhado do Firebase:", err);
        alert("Erro ao salvar cabo: " + err.message);
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

// 6. NAVEGAÇÃO GPS
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

// 📍 FUNÇÃO GLOBAL DE EXCLUSÃO (Compatível com Módulos ES6)
window.deletarElemento = async function(colecao, id) {
    const confirmacao = confirm(`Deseja realmente excluir este item?`);
    if (!confirmacao) return;

    try {
        // 1. Remove do Firestore usando o SDK v9+ (modular)
        await deleteDoc(doc(db, colecao, id));

        // 2. Remove o elemento visual do mapa instantaneamente
        map.eachLayer((layer) => {
            if (layer.firestoreId === id) {
                map.removeLayer(layer);
            }
        });

        alert("Item excluído com sucesso!");
    } catch (err) {
        console.error("Erro ao excluir do Firestore:", err);
        alert("Erro ao excluir item: " + err.message);
    }
};