// main.js - Módulo Principal de Mapeamento de Rede FTTH
import { MenuManager } from './interface/MenuManager.js';
import {
    db,
    collection,
    addDoc,
    onSnapshot,
    doc,
    deleteDoc
} from './firebase-config.js';

// ==========================================
// 1. ESTRUTURAS DE CONTROLE E AUXILIARES
// ==========================================

// Dicionário global para guardar as referências das camadas no Leaflet por ID do Firestore
const camadasMapa = {};

// Função para higienizar entradas e evitar injeções de scripts (XSS) nos popups
function santatizar(str) {
    if (str === null || str === undefined) return '';
    return String(str).replace(/[&<>"']/g, function(m) {
        return {
            '&': '&amp;',
            '<': '&lt;',
            '>': '&gt;',
            '"': '&quot;',
            "'": '&#039;'
        }[m];
    });
}

// ==========================================
// 2. INICIALIZAÇÃO DO MAPA (LEAFLET)
// ==========================================

// Configuração inicial focada nas coordenadas padrão do sistema
const map = L.map('map').setView([-3.7319, -38.5267], 13);

// Camada base OpenStreetMap
L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
    maxZoom: 19,
    attribution: '© OpenStreetMap contributors'
}).addTo(map);

// Inicializa gerenciador de interface de menus se existente
if (typeof MenuManager === 'function') {
    const menuManager = new MenuManager();

    let tempCoordsCaixa = null;
    let pontosFibraTemp = [];
    let polylineTemp = null;
    let userMarker = null;
    let watchIdGPS = null;

    const modalCaixa = document.getElementById('modal-caixa');
    const modalFibra = document.getElementById('modal-fibra');
    const selectTipoCaixa = document.getElementById('tipo-caixa');
    const camposCto = document.getElementById('campos-cto');
    const camposCeo = document.getElementById('campos-ceo');
    const btnConcluirFibra = document.getElementById('btn-concluir-fibra');
    const btnGps = document.getElementById('btn-gps');
    const btnNavegacao = document.getElementById('btn-navegacao');
    const btnUsarGpsForm = document.getElementById('btn-usar-gps-form');

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

    selectTipoCaixa.addEventListener('change', (event) => {
        const isCto = event.target.value === 'CTO';
        camposCto.style.display = isCto ? 'block' : 'none';
        camposCeo.style.display = isCto ? 'none' : 'block';
    });

    map.on('click', (event) => {
        const { lat, lng } = event.latlng;

        if (menuManager.modoAtivo === 'CAIXAS') {
            tempCoordsCaixa = { lat, lng };
            document.getElementById('caixa-lat').value = lat.toFixed(6);
            document.getElementById('caixa-lng').value = lng.toFixed(6);
            modalCaixa.style.display = 'block';
        } else if (menuManager.modoAtivo === 'FIBRAS') {
            pontosFibraTemp.push([lat, lng]);

            if (!polylineTemp) {
                polylineTemp = L.polyline(pontosFibraTemp, {
                    color: '#28a745',
                    weight: 4,
                    dashArray: '5, 10'
                }).addTo(map);
            } else {
                polylineTemp.setLatLngs(pontosFibraTemp);
            }

            if (pontosFibraTemp.length >= 2) {
                btnConcluirFibra.style.display = 'inline-flex';
            }
        }
    });

    btnConcluirFibra.addEventListener('click', (event) => {
        event.preventDefault();
        event.stopPropagation();

        if (pontosFibraTemp.length < 2) {
            alert('Selecione pelo menos 2 pontos no mapa para formar um cabo!');
            return;
        }

        modalFibra.style.display = 'block';
    });

    document.getElementById('btn-salvar').addEventListener('click', async () => {
        const nome = document.getElementById('nome-caixa').value.trim();
        const tipo = selectTipoCaixa.value;

        if (!nome) return alert('Insira a identificação da caixa!');
        if (!tempCoordsCaixa) return alert('Selecione a posição da caixa no mapa!');

        const salvo = await salvarCaixa({
            nome,
            tipo,
            portas: tipo === 'CTO' ? document.getElementById('portas-atendimento').value : 0,
            fusoes: tipo === 'CEO' ? document.getElementById('qtd-fusoes').value : 0,
            ...tempCoordsCaixa
        });
        if (!salvo) return;

        modalCaixa.style.display = 'none';
        document.getElementById('nome-caixa').value = '';
        tempCoordsCaixa = null;
        menuManager.limparModo();
    });

    document.getElementById('btn-cancelar').addEventListener('click', () => {
        modalCaixa.style.display = 'none';
        tempCoordsCaixa = null;
        menuManager.limparModo();
    });

    document.getElementById('btn-salvar-fibra').addEventListener('click', async () => {
        const nome = document.getElementById('identificacao-cabo').value.trim();
        const sobraA = document.getElementById('sobra-ponto-a').value;
        const sobraB = document.getElementById('sobra-ponto-b').value;

        if (!nome) return alert('Insira o nome do cabo!');
        if (pontosFibraTemp.length < 2) return alert('Selecione pelo menos 2 pontos no mapa!');

        const salvo = await salvarFibra({ nome, sobraA, sobraB, coords: pontosFibraTemp });
        if (!salvo) return;

        if (polylineTemp) map.removeLayer(polylineTemp);
        polylineTemp = null;
        pontosFibraTemp = [];
        document.getElementById('identificacao-cabo').value = '';
        document.getElementById('sobra-ponto-a').value = '15';
        document.getElementById('sobra-ponto-b').value = '15';
        modalFibra.style.display = 'none';
        btnConcluirFibra.style.display = 'none';
        menuManager.limparModo();
    });

    document.getElementById('btn-cancelar-fibra').addEventListener('click', () => {
        modalFibra.style.display = 'none';
        if (polylineTemp) map.removeLayer(polylineTemp);
        polylineTemp = null;
        pontosFibraTemp = [];
        btnConcluirFibra.style.display = 'none';
        menuManager.limparModo();
    });

    function ativarNavegacaoGPS() {
        if (!navigator.geolocation) {
            return alert('Seu dispositivo não suporta geolocalização.');
        }

        if (watchIdGPS !== null) {
            navigator.geolocation.clearWatch(watchIdGPS);
            watchIdGPS = null;
            btnNavegacao.classList.remove('ativo');
            btnNavegacao.innerText = '🧭 Iniciar Navegação';
            return;
        }

        btnNavegacao.classList.add('ativo');
        btnNavegacao.innerText = '🛑 Parar Navegação';
        watchIdGPS = navigator.geolocation.watchPosition((position) => {
            const { latitude, longitude, heading } = position.coords;
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
        }, (error) => {
            console.error('Erro de GPS:', error);
        }, { enableHighAccuracy: true, maximumAge: 1000, timeout: 5000 });
    }

    btnNavegacao.addEventListener('click', ativarNavegacaoGPS);
    btnGps.addEventListener('click', () => {
        navigator.geolocation.getCurrentPosition((position) => {
            const { latitude, longitude } = position.coords;
            map.setView([latitude, longitude], 17);
        });
    });
    btnUsarGpsForm.addEventListener('click', () => {
        navigator.geolocation.getCurrentPosition((position) => {
            const { latitude, longitude } = position.coords;
            tempCoordsCaixa = { lat: latitude, lng: longitude };
            document.getElementById('caixa-lat').value = latitude.toFixed(6);
            document.getElementById('caixa-lng').value = longitude.toFixed(6);
        });
    });
}

// ==========================================
// 3. ESCUTA EM TEMPO REAL E CARREGAMENTO (FIRESTORE)
// ==========================================

/**
 * Escuta em tempo real da coleção 'caixas' (CTOs / CEOs)
 * Garante a renderização inicial no F5 e atualizações instantâneas.
 */
onSnapshot(collection(db, "caixas"), (snapshot) => {
    // 1. Processa todos os documentos presentes no snapshot (Carga inicial + Adições)
    snapshot.docs.forEach((docSnap) => {
        const id = docSnap.id;
        const c = docSnap.data();

        // Evita duplicar elemento se ele já estiver desenhado no mapa
        if (camadasMapa[id]) return;

        // Converte coordenadas para número float (Resolve o problema de sumir no F5)
        const lat = Number(c.lat);
        const lng = Number(c.lng);

        if (isNaN(lat) || isNaN(lng)) return;

        const iconeEmoji = c.tipo === 'CTO' ? '📦' : '⚡';
        const marker = L.marker([lat, lng]).addTo(map);

        let conteudoPopup = `<b>${iconeEmoji} ${santatizar(c.tipo)}: ${santatizar(c.nome)}</b><br>`;
        if (c.tipo === 'CTO') conteudoPopup += `Portas: ${santatizar(c.portas)}<br>`;
        if (c.tipo === 'CEO') conteudoPopup += `Fusões: ${santatizar(c.fusoes)}<br>`;

        conteudoPopup += `
            <div style="margin-top: 8px; text-align: center;">
                <button onclick="deletarElemento('caixas', '${id}')"
                        style="background:#dc3545; color:white; border:none; padding:5px 10px; border-radius:4px; cursor:pointer; font-size:12px; font-weight:bold;">
                    🗑️ Excluir ${santatizar(c.tipo)}
                </button>
            </div>
        `;

        marker.bindPopup(conteudoPopup);
        camadasMapa[id] = marker; // Armazena a referência para controle
    });

    // 2. Trata remoções em tempo real enviadas pelo Firestore
    snapshot.docChanges().forEach((change) => {
        if (change.type === "removed") {
            const id = change.doc.id;
            if (camadasMapa[id]) {
                map.removeLayer(camadasMapa[id]);
                delete camadasMapa[id];
            }
        }
    });
}, (error) => {
    console.error("Erro na escuta de caixas:", error);
});

/**
 * Escuta em tempo real da coleção 'fibras' (Cabos ópticos)
 * Processa arrays de coordenadas e atualiza o mapa.
 */
onSnapshot(collection(db, "fibras"), (snapshot) => {
    // 1. Processa todos os documentos presentes no snapshot
    snapshot.docs.forEach((docSnap) => {
        const id = docSnap.id;
        const f = docSnap.data();

        if (camadasMapa[id]) return;
        if (!f.coords || !Array.isArray(f.coords)) return;

        // Trata conversão de objetos {lat, lng} ou arrays [lat, lng]
        const latLngs = f.coords.map(coord => {
            if (Array.isArray(coord)) {
                return [Number(coord[0]), Number(coord[1])];
            }
            if (coord && typeof coord.lat !== 'undefined' && typeof coord.lng !== 'undefined') {
                return [Number(coord.lat), Number(coord.lng)];
            }
            return null;
        }).filter(coord => coord !== null && !isNaN(coord[0]) && !isNaN(coord[1]));

        if (latLngs.length < 2) return; // Exige ao menos 2 pontos válidos

        const polyline = L.polyline(latLngs, { color: '#dc3545', weight: 4 }).addTo(map);

        let conteudoPopup = `<b>🧵 Cabo: ${santatizar(f.nome)}</b><br>Sobra A: ${santatizar(f.sobraA) || 0}m | Sobra B: ${santatizar(f.sobraB) || 0}m<br>`;
        conteudoPopup += `
            <div style="margin-top: 8px; text-align: center;">
                <button onclick="deletarElemento('fibras', '${id}')"
                        style="background:#dc3545; color:white; border:none; padding:5px 10px; border-radius:4px; cursor:pointer; font-size:12px; font-weight:bold;">
                    🗑️ Excluir Cabo
                </button>
            </div>
        `;

        polyline.bindPopup(conteudoPopup);
        camadasMapa[id] = polyline;
    });

    // 2. Trata remoções em tempo real
    snapshot.docChanges().forEach((change) => {
        if (change.type === "removed") {
            const id = change.doc.id;
            if (camadasMapa[id]) {
                map.removeLayer(camadasMapa[id]);
                delete camadasMapa[id];
            }
        }
    });
}, (error) => {
    console.error("Erro na escuta de fibras:", error);
});

// ==========================================
// 4. FUNÇÕES DE GRAVAÇÃO (SALVAMENTO NO FIRESTORE)
// ==========================================

/**
 * Função utilitária para cadastrar nova Caixa (CTO/CEO) no banco
 */
export async function salvarCaixa(dados) {
    try {
        const novaCaixa = {
            nome: String(dados.nome),
            tipo: String(dados.tipo),
            lat: Number(dados.lat), // 📍 Garantido como Number para persistência no F5
            lng: Number(dados.lng), // 📍 Garantido como Number para persistência no F5
            portas: Number(dados.portas || 0),
            fusoes: Number(dados.fusoes || 0),
            criadoEm: new Date()
        };

        await addDoc(collection(db, "caixas"), novaCaixa);
        return true;
    } catch (err) {
        console.error("Erro ao salvar caixa no Firestore:", err);
        alert("Erro ao salvar caixa: " + err.message);
        return false;
    }
}

/**
 * Função utilitária para cadastrar novo Cabo de Fibra no banco
 */
export async function salvarFibra(dados) {
    try {
        // Formata as coordenadas garantindo valores numéricos
        const coordsFormatadas = dados.coords.map(c => ({
            lat: Number(c.lat || c[0]),
            lng: Number(c.lng || c[1])
        }));

        const novaFibra = {
            nome: String(dados.nome),
            sobraA: Number(dados.sobraA || 0),
            sobraB: Number(dados.sobraB || 0),
            coords: coordsFormatadas,
            criadoEm: new Date()
        };

        await addDoc(collection(db, "fibras"), novaFibra);
        return true;
    } catch (err) {
        console.error("Erro ao salvar fibra no Firestore:", err);
        alert("Erro ao salvar cabo de fibra: " + err.message);
        return false;
    }
}

// ==========================================
// 5. FUNÇÃO GLOBAL DE EXCLUSÃO (WINDOW)
// ==========================================

/**
 * Registrada no objeto window para ser chamada diretamente pelos botões dos Popups
 */
window.deletarElemento = async function(colecao, id) {
    if (!confirm("Deseja realmente excluir este elemento do mapa?")) return;

    try {
        // 1. Remove o documento da coleção no Firestore
        await deleteDoc(doc(db, colecao, id));

        // 2. Remove imediatamente do mapa local
        if (camadasMapa[id]) {
            map.removeLayer(camadasMapa[id]);
            delete camadasMapa[id];
        }

    } catch (err) {
        console.error("Erro ao excluir do Firestore:", err);
        alert("Erro ao excluir o item: " + err.message);
    }
};