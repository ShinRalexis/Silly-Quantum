import { getContext, renderExtensionTemplateAsync } from '../../extensions.js';
import { eventSource, event_types, setExtensionPrompt, extension_prompt_types, extension_prompt_roles } from '../../../script.js';

const MODULE_NAME = 'silly-quantum';
const DISPLAY_NAME = 'Silly Quantum';
const VERSION = '1.6.4';
const QUANTUM_API_URL = 'http://127.0.0.1:8227';

let extensionSettings = {
    isEnabled: true,
    qubitCount: 6,
    entanglementQubits: 4,
    moodInjectionEnabled: true,
    entanglementEnabled: true,
    entanglementForce: 0.5,
    judgementEnabled: true,
    hideOracleResult: false,
    autoOracleInterval: 0,
    language: "it",
    hardwareProfileMode: "auto",
    noisyMindEnabled: false,
    multiverse: false,
    groverOracle: false,
    driftMode: 'contextual',  // 'contextual' | 'always' | 'disabled'
    customChallengeConcepts: ''  // keyword extra per il Judgement, separate da virgola
};

let characterQuantumStates = {};
let isProcessing = false;
let lastOracleTwist = null;
let lastQuantumJudgement = null;
let lastProcessedIndex = -1;
let lastProcessedText = "";
let _promptGen = 0; // [R2] monotonic counter: incrementato da onCharacterSelected e onUserMessage per invalidare drift in volo
let _oracleTwistTimer = null; // [B4] tracks oracle expiry timer so it can be cleared before reset


const sq_translations = {
    "it": {
        ui_language: "Lingua Interfaccia:",
        enable_engine: "Abilita Motore Quantistico:",
        verify_btn: "Verifica",
        mood_management: "Gestione dell'Umore Quantistico",
        mood_injection: "Iniezione Umore Quantistico:",
        qubit_complexity: "Complessità Qubit:",
        "2q_4s": "2 Qubits (4 stati)",
        "3q_8s": "3 Qubits (8 stati)",
        "4q_16s": "4 Qubits (16 stati)",
        "6q_64s": "6 Qubits (64 stati)",
        entanglement_title: "Entanglement USER/Personaggio",
        enable_entanglement: "Attiva Connessione Spirituale (Dinamica):",
        entanglement_complexity: "Complessità Legame (Qubit):",
        "2q_love_hate": "2 Qubits (Amore/Odio)",
        "3q_base": "3 Qubits (Sfumature Base)",
        "4q_complex": "4 Qubits (Legame Complesso)",
        "6q_chaos": "6 Qubits (Caos Totale)",
        entanglement_desc: "L'Entanglement evolve in base a Mirroring lessicale e Allineamento emotivo in chat.",
        entanglement_force: "Intensità Legame:",
        quantum_drift: "Quantum Drift (Collasso da Osservazione):",
        drift_contextual: "Contestuale",
        drift_always: "Sempre Attivo",
        drift_disabled: "Disattivato",
        plot_management: "Gestione Sviluppo di Trama",
        consult_oracle: "🔮 Consulta Oracolo Trama",
        reset_state: "🔄 Reset Stato",
        oracle_veil: "Velo dell'Oracolo (Nascondi risultato):",
        auto_oracle: "Affidarsi al fato (Auto-Oracolo):",
        none: "Nessuna",
        every_5: "Ogni 5 messaggi",
        every_10: "Ogni 10 messaggi",
        every_15: "Ogni 15 messaggi",
        every_20: "Ogni 20 messaggi",
        every_30: "Ogni 30 messaggi",
        every_40: "Ogni 40 messaggi",
        every_50: "Ogni 50 messaggi",
        every_75: "Ogni 75 messaggi",
        every_100: "Ogni 100 messaggi",
        judgement_title: "Giudizio e Risoluzione Azioni",
        enable_judgement: "Abilita Motore del Fato:",
        judgement_waiting: "In attesa di azione significativa...",
        monitor_title: "Monitor Collasso Quantistico",
        monitor_waiting: "In attesa di primo impulso...",
        support: "Sostieni il Progetto Quantum",
        hardware_profile: "Profilo Quantistico:",
        hw_auto: "Auto (dalla descrizione)",
        hw_superconducting: "Normale (Superconducting)",
        hw_silicon_spin: "Analitico (Silicon Spin)",
        hw_trapped_ion: "Impulsivo (Trapped Ion)",
        hw_neutral_atom: "Caotico (Neutral Atom)",
        noisy_mind: "Mente Offuscata (Rumore Quantistico):",
        multiverse: "Oracolo Multiverso (16 Universi Paralleli):",
        grover_oracle: "Oracolo di Grover (Amplificazione del Destino):"
    },
    "en": {
        ui_language: "Interface Language:",
        enable_engine: "Enable Quantum Engine:",
        verify_btn: "Verify",
        mood_management: "Quantum Mood Management",
        mood_injection: "Quantum Mood Injection:",
        qubit_complexity: "Qubit Complexity:",
        "2q_4s": "2 Qubits (4 states)",
        "3q_8s": "3 Qubits (8 states)",
        "4q_16s": "4 Qubits (16 states)",
        "6q_64s": "6 Qubits (64 states)",
        entanglement_title: "USER/Character Entanglement",
        enable_entanglement: "Enable Spiritual Connection (Dynamic):",
        entanglement_complexity: "Bond Complexity (Qubit):",
        "2q_love_hate": "2 Qubits (Love/Hate)",
        "3q_base": "3 Qubits (Base Nuances)",
        "4q_complex": "4 Qubits (Complex Bond)",
        "6q_chaos": "6 Qubits (Total Chaos)",
        entanglement_desc: "Entanglement evolves based on lexical Mirroring and emotional Alignment in chat.",
        entanglement_force: "Bond Intensity:",
        quantum_drift: "Quantum Drift (Observation Collapse):",
        drift_contextual: "Contextual",
        drift_always: "Always Active",
        drift_disabled: "Disabled",
        plot_management: "Plot Development Management",
        consult_oracle: "🔮 Consult Plot Oracle",
        reset_state: "🔄 Reset State",
        oracle_veil: "Oracle's Veil (Hide result):",
        auto_oracle: "Trust in Fate (Auto-Oracle):",
        none: "None",
        every_5: "Every 5 messages",
        every_10: "Every 10 messages",
        every_15: "Every 15 messages",
        every_20: "Every 20 messages",
        every_30: "Every 30 messages",
        every_40: "Every 40 messages",
        every_50: "Every 50 messages",
        every_75: "Every 75 messages",
        every_100: "Every 100 messages",
        judgement_title: "Judgement and Action Resolution",
        enable_judgement: "Enable Engine of Fate:",
        judgement_waiting: "Waiting for significant action...",
        monitor_title: "Quantum Collapse Monitor",
        monitor_waiting: "Waiting for first impulse...",
        support: "Support the Quantum Project",
        hardware_profile: "Quantum Profile:",
        hw_auto: "Auto (from description)",
        hw_superconducting: "Normal (Superconducting)",
        hw_silicon_spin: "Analytical (Silicon Spin)",
        hw_trapped_ion: "Impulsive (Trapped Ion)",
        hw_neutral_atom: "Chaotic (Neutral Atom)",
        noisy_mind: "Noisy Mind (Quantum Noise):",
        multiverse: "Multiverse Oracle (16 Parallel Universes):",
        grover_oracle: "Grover Oracle (Fate Amplification):"
    },
    "es": {
        ui_language: "Idioma de la interfaz:",
        enable_engine: "Habilitar Motor Cuántico:",
        verify_btn: "Verificar",
        mood_management: "Gestión del Estado de Ánimo Cuántico",
        mood_injection: "Inyección de Estado de Ánimo Cuántico:",
        qubit_complexity: "Complejidad Qubit:",
        "2q_4s": "2 Qubits (4 estados)",
        "3q_8s": "3 Qubits (8 estados)",
        "4q_16s": "4 Qubits (16 estados)",
        "6q_64s": "6 Qubits (64 estados)",
        entanglement_title: "Entrelazamiento USER/Personaje",
        enable_entanglement: "Activar Conexión Espiritual (Dinámica):",
        entanglement_complexity: "Complejidad del Vínculo (Qubit):",
        "2q_love_hate": "2 Qubits (Amor/Odio)",
        "3q_base": "3 Qubits (Matices Base)",
        "4q_complex": "4 Qubits (Vínculo Complejo)",
        "6q_chaos": "6 Qubits (Caos Total)",
        entanglement_desc: "El entrelazamiento evoluciona en base al reflejo léxico y la alineación emocional en el chat.",
        entanglement_force: "Intensidad del Vínculo:",
        quantum_drift: "Quantum Drift (Colapso por Observación):",
        drift_contextual: "Contextual",
        drift_always: "Siempre Activo",
        drift_disabled: "Desactivado",
        plot_management: "Gestión del Desarrollo de la Trama",
        consult_oracle: "🔮 Consultar Oráculo de Trama",
        reset_state: "🔄 Restablecer Estado",
        oracle_veil: "Velo del Oráculo (Ocultar resultado):",
        auto_oracle: "Confiar en el Destino (Auto-Oráculo):",
        none: "Ninguno",
        every_5: "Cada 5 mensajes",
        every_10: "Cada 10 mensajes",
        every_15: "Cada 15 mensajes",
        every_20: "Cada 20 mensajes",
        every_30: "Cada 30 mensajes",
        every_40: "Cada 40 mensajes",
        every_50: "Cada 50 mensajes",
        every_75: "Cada 75 mensajes",
        every_100: "Cada 100 mensajes",
        judgement_title: "Juicio y Resolución de Acciones",
        enable_judgement: "Habilitar Motor del Destino:",
        judgement_waiting: "Esperando acción significativa...",
        monitor_title: "Monitor de Colapso Cuántico",
        monitor_waiting: "Esperando el primer impulso...",
        support: "Apoyar el Proyecto Quantum",
        hardware_profile: "Perfil Cuántico:",
        hw_auto: "Auto (de la descripción)",
        hw_superconducting: "Normal (Superconducting)",
        hw_silicon_spin: "Analítico (Silicon Spin)",
        hw_trapped_ion: "Impulsivo (Trapped Ion)",
        hw_neutral_atom: "Caótico (Neutral Atom)",
        noisy_mind: "Mente Nublada (Ruido Cuántico):",
        multiverse: "Oráculo Multiverso (16 Universos Paralelos):",
        grover_oracle: "Oráculo de Grover (Amplificación del Destino):"
    },
    "fr": {
        ui_language: "Langue de l'interface:",
        enable_engine: "Activer le Moteur Quantique:",
        verify_btn: "Vérifier",
        mood_management: "Gestion de l'Humeur Quantique",
        mood_injection: "Injection d'Humeur Quantique:",
        qubit_complexity: "Complexité Qubit:",
        "2q_4s": "2 Qubits (4 états)",
        "3q_8s": "3 Qubits (8 états)",
        "4q_16s": "4 Qubits (16 états)",
        "6q_64s": "6 Qubits (64 états)",
        entanglement_title: "Intrication USER/Personnage",
        enable_entanglement: "Activer la Connexion Spirituelle (Dynamique):",
        entanglement_complexity: "Complexité du Lien (Qubit):",
        "2q_love_hate": "2 Qubits (Amour/Haine)",
        "3q_base": "3 Qubits (Nuances de Base)",
        "4q_complex": "4 Qubits (Lien Complexe)",
        "6q_chaos": "6 Qubits (Chaos Total)",
        entanglement_desc: "L'intrication évolue en fonction du miroir lexical et de l'alignement émotionnel dans le chat.",
        entanglement_force: "Intensité du Lien:",
        quantum_drift: "Quantum Drift (Effondrement par Observation):",
        drift_contextual: "Contextuel",
        drift_always: "Toujours Actif",
        drift_disabled: "Désactivé",
        plot_management: "Gestion du Développement de l'Intrigue",
        consult_oracle: "🔮 Consulter l'Oracle de l'Intrigue",
        reset_state: "🔄 Réinitialiser l'État",
        oracle_veil: "Voile de l'Oracle (Masquer le résultat):",
        auto_oracle: "Faire confiance au Destin (Auto-Oracle):",
        none: "Aucun",
        every_5: "Tous les 5 messages",
        every_10: "Tous les 10 messages",
        every_15: "Tous les 15 messages",
        every_20: "Tous les 20 messages",
        every_30: "Tous les 30 messages",
        every_40: "Tous les 40 messages",
        every_50: "Tous les 50 messages",
        every_75: "Tous les 75 messages",
        every_100: "Tous les 100 messages",
        judgement_title: "Jugement et Résolution des Actions",
        enable_judgement: "Activer le Moteur du Destin:",
        judgement_waiting: "En attente d'une action significative...",
        monitor_title: "Moniteur d'Effondrement Quantique",
        monitor_waiting: "En attente de la première impulsion...",
        support: "Soutenir le Projet Quantum",
        hardware_profile: "Profil Quantique:",
        hw_auto: "Auto (de la description)",
        hw_superconducting: "Normal (Superconducting)",
        hw_silicon_spin: "Analytique (Silicon Spin)",
        hw_trapped_ion: "Impulsif (Trapped Ion)",
        hw_neutral_atom: "Chaotique (Neutral Atom)",
        noisy_mind: "Esprit Brouillé (Bruit Quantique):",
        multiverse: "Oracle Multivers (16 Univers Parallèles):",
        grover_oracle: "Oracle de Grover (Amplification du Destin):"
    },
    "de": {
        ui_language: "Schnittstellensprache:",
        enable_engine: "Quantenmotor aktivieren:",
        verify_btn: "Überprüfen",
        mood_management: "Quantenstimmungsmanagement",
        mood_injection: "Quantenstimmungsinjektion:",
        qubit_complexity: "Qubit-Komplexität:",
        "2q_4s": "2 Qubits (4 Zustände)",
        "3q_8s": "3 Qubits (8 Zustände)",
        "4q_16s": "4 Qubits (16 Zustände)",
        "6q_64s": "6 Qubits (64 Zustände)",
        entanglement_title: "USER/Charakter-Verschränkung",
        enable_entanglement: "Spirituelle Verbindung aktivieren (Dynamisch):",
        entanglement_complexity: "Bindungskomplexität (Qubit):",
        "2q_love_hate": "2 Qubits (Liebe/Hass)",
        "3q_base": "3 Qubits (Basisnuancen)",
        "4q_complex": "4 Qubits (Komplexe Bindung)",
        "6q_chaos": "6 Qubits (Totales Chaos)",
        entanglement_desc: "Die Verschränkung entwickelt sich basierend auf lexikalischer Spiegelung und emotionaler Ausrichtung im Chat.",
        entanglement_force: "Bindungsintensität:",
        quantum_drift: "Quantum Drift (Beobachtungskollaps):",
        drift_contextual: "Kontextuell",
        drift_always: "Immer Aktiv",
        drift_disabled: "Deaktiviert",
        plot_management: "Handlungsentwicklungsmanagement",
        consult_oracle: "🔮 Handlungs-Orakel befragen",
        reset_state: "🔄 Zustand zurücksetzen",
        oracle_veil: "Schleier des Orakels (Ergebnis verbergen):",
        auto_oracle: "Auf das Schicksal vertrauen (Auto-Orakel):",
        none: "Keine",
        every_5: "Alle 5 Nachrichten",
        every_10: "Alle 10 Nachrichten",
        every_15: "Alle 15 Nachrichten",
        every_20: "Alle 20 Nachrichten",
        every_30: "Alle 30 Nachrichten",
        every_40: "Alle 40 Nachrichten",
        every_50: "Alle 50 Nachrichten",
        every_75: "Alle 75 Nachrichten",
        every_100: "Alle 100 Nachrichten",
        judgement_title: "Urteil und Handlungsauflösung",
        enable_judgement: "Schicksalsmotor aktivieren:",
        judgement_waiting: "Warten auf bedeutsame Handlung...",
        monitor_title: "Quantenkollaps-Monitor",
        monitor_waiting: "Warten auf ersten Impuls...",
        support: "Unterstütze das Quantum-Projekt",
        hardware_profile: "Quantenprofil:",
        hw_auto: "Auto (aus Beschreibung)",
        hw_superconducting: "Normal (Superconducting)",
        hw_silicon_spin: "Analytisch (Silicon Spin)",
        hw_trapped_ion: "Impulsiv (Trapped Ion)",
        hw_neutral_atom: "Chaotisch (Neutral Atom)",
        noisy_mind: "Getrübter Geist (Quantenrauschen):",
        multiverse: "Multiversum-Orakel (16 Paralleluniversen):",
        grover_oracle: "Grover-Orakel (Schicksalsverstärkung):"
    },
    "ja": {
        ui_language: "インターフェース言語：",
        enable_engine: "量子エンジンを有効にする：",
        verify_btn: "確認",
        mood_management: "量子ムード管理",
        mood_injection: "量子ムード注入：",
        qubit_complexity: "キュービットの複雑さ：",
        "2q_4s": "2 キュービット（4状態）",
        "3q_8s": "3 キュービット（8状態）",
        "4q_16s": "4 キュービット（16状態）",
        "6q_64s": "6 キュービット（64状態）",
        entanglement_title: "USER/キャラクターの量子もつれ",
        enable_entanglement: "スピリチュアルな繋がりを有効にする（動的）：",
        entanglement_complexity: "絆の複雑さ（キュービット）：",
        "2q_love_hate": "2 キュービット（愛/憎悪）",
        "3q_base": "3 キュービット（基本のニュアンス）",
        "4q_complex": "4 キュービット（複雑な絆）",
        "6q_chaos": "6 キュービット（完全な混沌）",
        entanglement_desc: "もつれは、チャット内の語彙のミラーリングと感情的な一致に基づいて進化します。",
        entanglement_force: "絆の強度：",
        quantum_drift: "量子ドリフト（観測によるコラプス）：",
        drift_contextual: "コンテキスト連動",
        drift_always: "常時有効",
        drift_disabled: "無効",
        plot_management: "プロット展開管理",
        consult_oracle: "🔮 プロットのオラクルに相談する",
        reset_state: "🔄 状態をリセット",
        oracle_veil: "オラクルのベール（結果を隠す）：",
        auto_oracle: "運命に委ねる（自動オラクル）：",
        none: "なし",
        every_5: "5メッセージごと",
        every_10: "10メッセージごと",
        every_15: "15メッセージごと",
        every_20: "20メッセージごと",
        every_30: "30メッセージごと",
        every_40: "40メッセージごと",
        every_50: "50メッセージごと",
        every_75: "75メッセージごと",
        every_100: "100メッセージごと",
        judgement_title: "判断と行動の解決",
        enable_judgement: "運命のエンジンを有効にする：",
        judgement_waiting: "意味のある行動を待っています...",
        monitor_title: "量子崩壊モニター",
        monitor_waiting: "最初のインパルスを待っています...",
        support: "クアンタムプロジェクトを支援する",
        hardware_profile: "量子プロファイル：",
        hw_auto: "自動（説明から）",
        hw_superconducting: "通常（超伝導）",
        hw_silicon_spin: "分析的（シリコンスピン）",
        hw_trapped_ion: "衝動的（トラップドイオン）",
        hw_neutral_atom: "混沌（中性原子）",
        noisy_mind: "曇った心（量子ノイズ）：",
        multiverse: "マルチバースのオラクル（16の並行宇宙）：",
        grover_oracle: "グローバーのオラクル（運命の増幅）："
    },
    "zh": {
        ui_language: "界面语言：",
        enable_engine: "启用量子引擎：",
        verify_btn: "验证",
        mood_management: "量子情绪管理",
        mood_injection: "量子情绪注入：",
        qubit_complexity: "量子比特复杂度：",
        "2q_4s": "2 量子比特（4 个状态）",
        "3q_8s": "3 量子比特（8 个状态）",
        "4q_16s": "4 量子比特（16 个状态）",
        "6q_64s": "6 量子比特（64 个状态）",
        entanglement_title: "USER/角色量子纠缠",
        enable_entanglement: "启用精神连接（动态）：",
        entanglement_complexity: "羁绊复杂度（量子比特）：",
        "2q_love_hate": "2 量子比特（爱/恨）",
        "3q_base": "3 量子比特（基础微妙变化）",
        "4q_complex": "4 量子比特（复杂羁绊）",
        "6q_chaos": "6 量子比特（完全混沌）",
        entanglement_desc: "纠缠基于聊天中的词汇镜像和情感对齐而演变。",
        entanglement_force: "羁绊强度：",
        quantum_drift: "量子漂移（观测坍缩）：",
        drift_contextual: "情境触发",
        drift_always: "始终启用",
        drift_disabled: "禁用",
        plot_management: "剧情发展管理",
        consult_oracle: "🔮 咨询剧情神谕",
        reset_state: "🔄 重置状态",
        oracle_veil: "神谕面纱（隐藏结果）：",
        auto_oracle: "听天由命（自动神谕）：",
        none: "无",
        every_5: "每 5 条消息",
        every_10: "每 10 条消息",
        every_15: "每 15 条消息",
        every_20: "每 20 条消息",
        every_30: "每 30 条消息",
        every_40: "每 40 条消息",
        every_50: "每 50 条消息",
        every_75: "每 75 条消息",
        every_100: "每 100 条消息",
        judgement_title: "判断与行动解决",
        enable_judgement: "启用命运引擎：",
        judgement_waiting: "等待有意义的行动...",
        monitor_title: "量子坍缩监视器",
        monitor_waiting: "等待第一次脉冲...",
        support: "支持量子项目",
        hardware_profile: "量子配置：",
        hw_auto: "自动（从描述）",
        hw_superconducting: "正常（超导体）",
        hw_silicon_spin: "分析型（硅自旋）",
        hw_trapped_ion: "冲动型（困域离子）",
        hw_neutral_atom: "混沌型（中性原子）",
        noisy_mind: "迷乱之心（量子噪声）：",
        multiverse: "多元宇宙神谕（16个平行宇宙）：",
        grover_oracle: "格罗弗神谕（命运放大）："
    }
};

function sq_applyLanguage(lang) {
    if (!sq_translations[lang]) lang = "it";
    const dict = sq_translations[lang];
    $('#silly-quantum-settings [data-sq-i18n]').each(function() {
        const key = $(this).attr('data-sq-i18n');
        if (dict[key]) {
            if ($(this).is('input')) {
                // Not needed for current checkboxes
            } else if ($(this).is('option')) {
                $(this).text(dict[key]);
            } else {
                $(this).text(dict[key]);
            }
        }
    });
}

async function init() {
    try {
        console.log(`[${DISPLAY_NAME}] v${VERSION} Initializing...`);
        
        const savedSettings = localStorage.getItem('silly_quantum_settings');
        if (savedSettings) {
            extensionSettings = Object.assign(extensionSettings, JSON.parse(savedSettings));
        }

        // Migration: old boolean quantumDrift → new driftMode string  [M2] atomic save
        if (typeof extensionSettings.quantumDrift === 'boolean') {
            const migratedMode = extensionSettings.quantumDrift ? 'always' : 'disabled';
            extensionSettings.driftMode = migratedMode;
            delete extensionSettings.quantumDrift;
            try {
                saveSettings(); // [M2] se questo lancia, ripristiniamo la chiave vecchia
                console.log(`[${DISPLAY_NAME}] Migrated quantumDrift boolean → driftMode='${extensionSettings.driftMode}'`);
            } catch (saveErr) {
                // localStorage pieno — ripristina il flag vecchio in memoria così la migrazione
                // riparte al prossimo avvio invece di perdersi silenziosamente
                extensionSettings.quantumDrift = (migratedMode === 'always');
                console.warn(`[${DISPLAY_NAME}] Migration save failed (localStorage full?), retrying next startup:`, saveErr);
            }
        }

        await renderUI();

    // Event registration with safety checks to prevent "undefined event" crash
    const safeOn = (eventName, handler) => {
        if (eventName) {
            eventSource.on(eventName, handler);
            console.log(`[${DISPLAY_NAME}] Event registered: ${eventName}`);
        } else {
            console.warn(`[${DISPLAY_NAME}] Event not supported by this ST version:`, eventName);
        }
    };

        try {
            safeOn(event_types.CHARACTER_SELECTED, onCharacterSelected);
            safeOn(event_types.MESSAGE_RECEIVED, onMessageReceived);
            safeOn(event_types.USER_MESSAGE_RENDERED, onUserMessage);
            
            // Support CHAT_CHANGED for newer ST versions (maps to onCharacterSelected)
            // Guard: if CHAT_CHANGED === CHARACTER_SELECTED (same string), avoid double-binding
            if (event_types.CHAT_CHANGED && event_types.CHAT_CHANGED !== event_types.CHARACTER_SELECTED) safeOn(event_types.CHAT_CHANGED, onCharacterSelected);
            
            // NOTE: GENERATION_STARTED and MESSAGE_SENT are intentionally NOT bound here.
            // They fire for AI responses too, causing double processing.
            // USER_MESSAGE_RENDERED is the correct and only event for user turns.
        } catch (e) {
            console.error(`[${DISPLAY_NAME}] Error during event registration:`, e);
        }

        // Initial API check
        checkApiStatus();

        // Delayed trigger manual load to ensure context is fully ready
        setTimeout(() => {
            const context = getContext();
            if (context.characterId !== undefined && context.characterId !== null && context.characterId !== -1) {
                console.log(`[${DISPLAY_NAME}] Character detected after delay, triggering state load.`);
                onCharacterSelected();
            } else {
                console.log(`[${DISPLAY_NAME}] No character detected after delay.`);
            }
        }, 1000);

        // Registrazione comandi - Metodo base compatibile con tutte le versioni
        try {
            if (typeof registerSlashCommand === 'function') {
                registerSlashCommand('q-oracle', () => generateQuantumPlotTwist(), [], 'Oracolo', true, true);
                registerSlashCommand('q-reset', () => resetQuantumState(), [], 'Reset', true, true);
            } else if (window.SlashCommandParser) {
                window.SlashCommandParser.addCommand('q-oracle', () => generateQuantumPlotTwist(), [], 'Oracolo', true, true);
                window.SlashCommandParser.addCommand('q-reset', () => resetQuantumState(), [], 'Reset', true, true);
            }
        } catch (e) { console.error("Slash registration failed", e); }

        // Bridge condiviso MP↔SQ: slot quantumStates sempre aggiornato (getter live).
        window.__sillybridge = window.__sillybridge || {};
        Object.defineProperty(window.__sillybridge, 'quantumStates', {
            get: () => characterQuantumStates,
            configurable: true
        });
        // Compatibilità legacy con chi legge window.characterQuantumStates direttamente
        Object.defineProperty(window, 'characterQuantumStates', {
            get: () => characterQuantumStates,
            configurable: true
        });
        // Notifica MP (o chiunque ascolti) che SQ è pronto
        window.dispatchEvent(new CustomEvent('sillyquantum:ready', { detail: { version: VERSION } }));
        // Se MP ha caricato dopo SQ, registra callMemPalace nel bridge ora che il bridge esiste
        // { once: false } intenzionale: MP può riabilitarsi mid-session e rifare il dispatch.
        // Il callback è idempotente (semplice assignment), non accumula listener.
        window.addEventListener('mempalace:ready', () => {
            if (typeof window.callMemPalace === 'function') {
                window.__sillybridge.callMemPalace = window.callMemPalace;
                console.log(`[${DISPLAY_NAME}] Bridge MP↔SQ aggiornato: callMemPalace registrata.`);
            }
        });

        // Pulizia di eventuali residui di versioni precedenti
        setExtensionPrompt('Silly Quantum', '', extension_prompt_types.IN_PROMPT, 0);
        setExtensionPrompt('silly-quantum', '', extension_prompt_types.IN_PROMPT, 0);

        console.log(`[${DISPLAY_NAME}] v${VERSION} Ready.`);
    } catch (e) {
        console.error(`[${DISPLAY_NAME}] Critical error during init:`, e);
    }
}

async function renderUI() {
    const html = await renderExtensionTemplateAsync(MODULE_NAME, 'settings');
    $('#extensions_settings').append(html);


    $('#sq_language').val(extensionSettings.language || "it").on('change', function() {
        extensionSettings.language = $(this).val();
        saveSettings();
        sq_applyLanguage(extensionSettings.language);
    });
    sq_applyLanguage(extensionSettings.language || "it");
    
    $('#sq_enabled').prop('checked', extensionSettings.isEnabled).on('change', function() {
        extensionSettings.isEnabled = !!$(this).prop('checked');
        saveSettings();
    });

    $('#sq_mood').prop('checked', extensionSettings.moodInjectionEnabled).on('change', function() {
        extensionSettings.moodInjectionEnabled = !!$(this).prop('checked');
        saveSettings();
    });

    $('#sq_entanglement').prop('checked', extensionSettings.entanglementEnabled).on('change', function() {
        extensionSettings.entanglementEnabled = !!$(this).prop('checked');
        saveSettings();
    });

    $('#sq_hide_oracle_result').prop('checked', extensionSettings.hideOracleResult).on('change', function() {
        extensionSettings.hideOracleResult = !!$(this).prop('checked');
        saveSettings();
    });

    $('#sq_judgement').prop('checked', extensionSettings.judgementEnabled).on('change', function() {
        extensionSettings.judgementEnabled = !!$(this).prop('checked');
        saveSettings();
    });

    $('#sq_qubits').val(extensionSettings.qubitCount).on('change', function() {
        extensionSettings.qubitCount = parseInt($(this).val()) || 6;
        saveSettings();
    });

    $('#sq_entanglement_qubits').val(extensionSettings.entanglementQubits || 4).on('change', function() {
        extensionSettings.entanglementQubits = parseInt($(this).val()) || 4;
        saveSettings();
    });

    const forceVal = extensionSettings.entanglementForce ?? 0.5;
    $('#sq_entanglement_force').val(forceVal);
    $('#sq_entanglement_force_val').text(forceVal.toFixed(1));
    $('#sq_entanglement_force').on('input', function() {
        extensionSettings.entanglementForce = parseFloat($(this).val());
        $('#sq_entanglement_force_val').text(extensionSettings.entanglementForce.toFixed(1));
        saveSettings();
    });

    $('#sq_auto_oracle').val(extensionSettings.autoOracleInterval || 0).on('change', function() {
        extensionSettings.autoOracleInterval = parseInt($(this).val()) || 0;
        saveSettings();
    });

    $('#sq_hardware_profile').val(extensionSettings.hardwareProfileMode || 'auto').on('change', function() {
        extensionSettings.hardwareProfileMode = $(this).val();
        saveSettings();
    });

    $('#sq_noisy_mind').prop('checked', extensionSettings.noisyMindEnabled).on('change', function() {
        extensionSettings.noisyMindEnabled = !!$(this).prop('checked');
        saveSettings();
    });

    $('#sq_multiverse').prop('checked', extensionSettings.multiverse).on('change', function() {
        extensionSettings.multiverse = !!$(this).prop('checked');
        if (extensionSettings.multiverse) {
            extensionSettings.groverOracle = false;
            $('#sq_grover_oracle').prop('checked', false).prop('disabled', true);
        } else {
            $('#sq_grover_oracle').prop('disabled', false);
        }
        saveSettings();
    });

    $('#sq_grover_oracle').prop('checked', extensionSettings.groverOracle).on('change', function() {
        extensionSettings.groverOracle = !!$(this).prop('checked');
        if (extensionSettings.groverOracle) {
            extensionSettings.multiverse = false;
            $('#sq_multiverse').prop('checked', false).prop('disabled', true);
        } else {
            $('#sq_multiverse').prop('disabled', false);
        }
        saveSettings();
    });

    // Ripristina stato disabilitato al caricamento se uno dei due era attivo
    if (extensionSettings.multiverse)   $('#sq_grover_oracle').prop('disabled', true);
    if (extensionSettings.groverOracle) $('#sq_multiverse').prop('disabled', true);

    $('#sq_drift_mode').val(extensionSettings.driftMode ?? 'contextual').on('change', function() {
        extensionSettings.driftMode = $(this).val();
        saveSettings();
    });

    $('#sq_api_check').on('click', checkApiStatus);
    $('#sq_plot_oracle').on('click', generateQuantumPlotTwist);
    $('#sq_reset_state').on('click', resetQuantumState);

    // --- PRESET SETTINGS (F3) ---
    const SQ_PRESETS = {
        dungeon: {
            label: 'Dungeon Crawler',
            judgementEnabled: true, autoOracleInterval: 5, noisyMindEnabled: true,
            groverOracle: false, multiverse: false, driftMode: 'always', hardwareProfileMode: 'neutral_atom'
        },
        romance: {
            label: 'Romance',
            judgementEnabled: false, autoOracleInterval: 0, noisyMindEnabled: false,
            groverOracle: false, multiverse: false, driftMode: 'contextual', hardwareProfileMode: 'silicon_spin'
        },
        thriller: {
            label: 'Thriller',
            judgementEnabled: true, autoOracleInterval: 3, noisyMindEnabled: true,
            groverOracle: true, multiverse: false, driftMode: 'always', hardwareProfileMode: 'trapped_ion'
        },
        sandbox: {
            label: 'Sandbox',
            judgementEnabled: false, autoOracleInterval: 0, noisyMindEnabled: false,
            groverOracle: false, multiverse: true, driftMode: 'disabled', hardwareProfileMode: 'auto'
        }
    };

    $('#sq_preset_load').on('click', function() {
        const key = $('#sq_preset_select').val();
        const preset = SQ_PRESETS[key];
        if (!preset) return toastr.warning('Select a preset first.');
        Object.assign(extensionSettings, preset);
        saveSettings();
        // Aggiorna DOM per i campi inclusi nel preset (evita out-of-sync UI)
        if (preset.judgementEnabled !== undefined) $('#sq_judgement').prop('checked', preset.judgementEnabled);
        if (preset.noisyMindEnabled !== undefined) $('#sq_noisy_mind').prop('checked', preset.noisyMindEnabled);
        if (preset.groverOracle !== undefined) {
            $('#sq_grover_oracle').prop('checked', preset.groverOracle);
            $('#sq_multiverse').prop('disabled', preset.groverOracle);
        }
        if (preset.multiverse !== undefined) {
            $('#sq_multiverse').prop('checked', preset.multiverse);
            $('#sq_grover_oracle').prop('disabled', preset.multiverse);
        }
        if (preset.driftMode !== undefined) $('#sq_drift_mode').val(preset.driftMode);
        if (preset.hardwareProfileMode !== undefined) $('#sq_hardware_profile').val(preset.hardwareProfileMode);
        if (preset.autoOracleInterval !== undefined) $('#sq_auto_oracle').val(preset.autoOracleInterval);
        toastr.success(`Preset "${preset.label}" applied.`, 'Silly Quantum');
    });
    $('#sq_preset_save').on('click', function() {
        const snap = JSON.stringify(extensionSettings, null, 2);
        const blob = new Blob([snap], { type: 'application/json' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url; a.download = `sq_settings_${new Date().toISOString().slice(0,10)}.json`; a.click();
        URL.revokeObjectURL(url);
        toastr.success('Settings exported.', 'Silly Quantum');
    });
}

function saveSettings() {
    localStorage.setItem('silly_quantum_settings', JSON.stringify(extensionSettings));
}

async function checkApiStatus() {
    const icon = $('#sq_api_status_icon');
    const text = $('#sq_api_status_text');
    const lang = extensionSettings.language || 'it';
    const statusLabels = {
        it:  { active: 'QuantumA Core: Attivo',      error: 'QuantumA Core: Errore',      offline: 'QuantumA Core: Disconnesso',
               ok_toast: 'QuantumA Core: Collegamento stabilito.', err_toast: 'QuantumA Core API ha restituito un errore.', off_toast: 'QuantumA Core API non raggiungibile.' },
        en:  { active: 'QuantumA Core: Active',      error: 'QuantumA Core: Error',       offline: 'QuantumA Core: Offline',
               ok_toast: 'QuantumA Core: Connection established.', err_toast: 'QuantumA Core API returned an error.', off_toast: 'QuantumA Core API unreachable.' },
        es:  { active: 'QuantumA Core: Activo',      error: 'QuantumA Core: Error',       offline: 'QuantumA Core: Desconectado',
               ok_toast: 'QuantumA Core: Conexión establecida.', err_toast: 'QuantumA Core API devolvió un error.', off_toast: 'QuantumA Core API no accesible.' },
        fr:  { active: 'QuantumA Core: Actif',       error: 'QuantumA Core: Erreur',      offline: 'QuantumA Core: Hors ligne',
               ok_toast: 'QuantumA Core: Connexion établie.', err_toast: "L'API QuantumA Core a renvoyé une erreur.", off_toast: 'API QuantumA Core inaccessible.' },
        de:  { active: 'QuantumA Core: Aktiv',       error: 'QuantumA Core: Fehler',      offline: 'QuantumA Core: Getrennt',
               ok_toast: 'QuantumA Core: Verbindung hergestellt.', err_toast: 'QuantumA Core API hat einen Fehler zurückgegeben.', off_toast: 'QuantumA Core API nicht erreichbar.' },
        ja:  { active: 'QuantumA Core: アクティブ', error: 'QuantumA Core: エラー',      offline: 'QuantumA Core: オフライン',
               ok_toast: 'QuantumA Core: 接続が確立されました。', err_toast: 'QuantumA Core APIがエラーを返しました。', off_toast: 'QuantumA Core APIに到達できません。' },
        zh:  { active: 'QuantumA Core: 在线',        error: 'QuantumA Core: 错误',        offline: 'QuantumA Core: 离线',
               ok_toast: 'QuantumA Core：连接已建立。', err_toast: 'QuantumA Core API 返回了错误。', off_toast: 'QuantumA Core API 无法访问。' }
    };
    const sl = statusLabels[lang] || statusLabels.it;
    try {
        const response = await fetch(`${QUANTUM_API_URL}/status`);
        if (response.ok) {
            icon.removeClass('sq-status-disconnected').addClass('sq-status-connected');
            text.text(sl.active);
            toastr.success(sl.ok_toast);
        } else {
            icon.removeClass('sq-status-connected').addClass('sq-status-disconnected');
            text.text(sl.error);
            toastr.error(sl.err_toast);
        }
    } catch (err) {
        icon.removeClass('sq-status-connected').addClass('sq-status-disconnected');
        text.text(sl.offline);
        toastr.error(sl.off_toast);
    }
}

/**
 * Load character states from storage
 */
function loadCharacterStates() {
    try {
        const saved = localStorage.getItem('silly_quantum_character_states');
        if (!saved) return;
        const parsed = JSON.parse(saved);
        if (typeof parsed !== 'object' || parsed === null || Array.isArray(parsed)) {
            console.warn(`[${DISPLAY_NAME}] character_states schema invalid — resetting.`);
            characterQuantumStates = {};
            return;
        }
        // Per-entry validation: scarta entry malformate invece di rifiutare l'intero oggetto
        const validated = {};
        for (const [key, val] of Object.entries(parsed)) {
            if (typeof val !== 'object' || val === null) continue;
            validated[key] = {
                name: typeof val.name === 'string' ? val.name : key,
                qubits: typeof val.qubits === 'number' ? val.qubits : 6,
                history: Array.isArray(val.history) ? val.history.filter(h => typeof h === 'string') : [],
                last_collapse: typeof val.last_collapse === 'string' && /^[01]+$/.test(val.last_collapse) ? val.last_collapse : '000000',
                oracle_counter: typeof val.oracle_counter === 'number' ? val.oracle_counter : 0,
                entanglementScore: typeof val.entanglementScore === 'number' && !isNaN(val.entanglementScore) ? val.entanglementScore : undefined,
                bitstring_history: Array.isArray(val.bitstring_history) ? val.bitstring_history.filter(b => typeof b === 'string') : [],
                last_seen_ts: typeof val.last_seen_ts === 'number' ? val.last_seen_ts : undefined,
            };
        }
        // Pruning: rimuovi personaggi non usati da >7 giorni per evitare crescita illimitata
        const PRUNE_DAYS = 7;
        const pruneThreshold = Date.now() - PRUNE_DAYS * 24 * 60 * 60 * 1000;
        let pruned = 0;
        for (const key of Object.keys(validated)) {
            const lastSeen = validated[key].last_seen_ts;
            if (lastSeen && lastSeen < pruneThreshold) {
                delete validated[key];
                pruned++;
            }
        }
        if (pruned > 0) console.log(`[${DISPLAY_NAME}] Pruned ${pruned} stale character state(s) (>7 days unused).`);
        characterQuantumStates = validated;
        console.log(`[${DISPLAY_NAME}] States loaded:`, Object.keys(characterQuantumStates).length);
    } catch (e) {
        console.error(`[${DISPLAY_NAME}] Error loading states:`, e);
        characterQuantumStates = {};
    }
}

/**
 * Save character states to storage
 */
function saveCharacterStates() {
    try {
        localStorage.setItem('silly_quantum_character_states', JSON.stringify(characterQuantumStates));
    } catch (e) {
        console.error(`[${DISPLAY_NAME}] Error saving states:`, e);
    }
}

/**
 * Handle character selection
 */
function onCharacterSelected() {
    try {
        const context = getContext();
        console.log(`[${DISPLAY_NAME}] Event: CHARACTER_SELECTED`, context.characterId);
        
        if (context.characterId === undefined || context.characterId === null || context.characterId === -1) {
            console.warn(`[${DISPLAY_NAME}] No character selected.`);
            return;
        }
        
        const char = context.characters[context.characterId];
        if (!char) {
            console.error(`[${DISPLAY_NAME}] Character data not found for ID:`, context.characterId);
            return;
        }
        
        const charName = char.name;
        const charId = (charName || '').trim().replace(/\s+/g, '_'); // [FIX-CHARID] usa nome canonico, non avatar path

        loadCharacterStates();

        if (!characterQuantumStates[charId]) {
            console.log(`[${DISPLAY_NAME}] Creating new state for:`, charName);
            characterQuantumStates[charId] = {
                name: charName,
                qubits: extensionSettings.qubitCount,
                history: [],
                last_collapse: '0'.repeat(extensionSettings.qubitCount),
                oracle_counter: 0,
                last_seen_ts: Date.now()
            };
            saveCharacterStates();
        }

        // [FIX-PRUNING] Cap in-session: se durante una sessione si aprono >150 personaggi
        // (improbabile ma possibile in test), forza un reload+prune per non far crescere
        // il localStorage oltre il limite pratico del browser (~5 MB).
        if (Object.keys(characterQuantumStates).length > 150) {
            loadCharacterStates(); // re-legge e pruna i >7gg
            saveCharacterStates();
        }

        lastProcessedIndex = -1; // Previene il blocco messaggi incrociato cambiando chat
        lastProcessedText = "";   // Resetta anche il testo per evitare falsi positivi cross-chat

        // [FIX-ORACLE-BLEED] Cancella subito lastOracleTwist e lastQuantumJudgement del personaggio
        // precedente: senza questo, i valori globali vengono iniettati nel prompt del nuovo personaggio
        // per tutta la finestra del timer (fino a 2 minuti). Il timer viene anche cancellato.
        lastOracleTwist = null;
        lastQuantumJudgement = null;
        if (_oracleTwistTimer) { clearTimeout(_oracleTwistTimer); _oracleTwistTimer = null; }

        updatePromptInjection(charId, characterQuantumStates[charId].last_collapse || '000000');

        // Quantum Drift: ricalcola lo stato se la sessione precedente era >30 min fa.
        // [R2] _promptGen++ invalida qualsiasi drift precedente (cambio personaggio rapido).
        // driftStartGen viene passato a applyQuantumDrift: se nel frattempo arriva un messaggio
        // utente (che incrementa _promptGen di nuovo), il drift salva lo stato ma salta
        // updatePromptInjection per non sovrascrivere lo stato già scritto da onUserMessage.
        const driftStartGen = ++_promptGen;
        applyQuantumDrift(charId, driftStartGen).catch(e =>
            console.warn(`[${DISPLAY_NAME}] Quantum Drift failed silently:`, e)
        );
    } catch (e) {
        console.error(`[${DISPLAY_NAME}] Error in onCharacterSelected:`, e);
    }
}

async function onMessageReceived(messageIndex) {}


async function onUserMessage(messageIndex) {
    if (!extensionSettings.isEnabled || isProcessing) return;
    
    const context = getContext();
    let idx = parseInt(messageIndex);
    if (isNaN(idx)) idx = context.chat.length - 1;
    if (idx < 0 || !context.chat[idx]) return;

    const lastMessage = context.chat[idx]?.mes || "";

    // Evita doppie esecuzioni, ma permette l'esecuzione se l'utente ha modificato (edit) il messaggio
    if (idx === lastProcessedIndex && lastProcessedText === lastMessage) return;

    lastProcessedIndex = idx;
    lastProcessedText = lastMessage;

    const char = context.characters[context.characterId];
    if (!char) return;

    const charId = (char.name || '').trim().replace(/\s+/g, '_'); // [FIX-CHARID]
    const isUser = context.chat[idx]?.is_user;
    if (!isUser) return;


    // isProcessing viene alzato PRIMA delle await per bloccare eventuali eventi concorrenti
    isProcessing = true;
    try {
        // Esegui Giudizio Quantistico SOLO se è un messaggio dell'utente
        if (extensionSettings.judgementEnabled && isUser) {
            await evaluateQuantumAction(lastMessage, charId, char, idx);
        }

        // Auto-Oracolo
        if (extensionSettings.autoOracleInterval > 0) {
            if (!characterQuantumStates[charId]) {
                characterQuantumStates[charId] = {
                    name: char.name, // [FIX-CHARNAME] raw name per compatibilità con bridge MP
                    qubits: extensionSettings.qubitCount,
                    history: [],
                    last_collapse: '0'.repeat(extensionSettings.qubitCount),
                    oracle_counter: 0,
                    last_seen_ts: Date.now()
                };
            } else {
                characterQuantumStates[charId].last_seen_ts = Date.now();
            }
            characterQuantumStates[charId].oracle_counter = (characterQuantumStates[charId].oracle_counter || 0) + 1;

            if (characterQuantumStates[charId].oracle_counter >= extensionSettings.autoOracleInterval) {
                characterQuantumStates[charId].oracle_counter = 0;
                saveCharacterStates();
                await generateQuantumPlotTwist(true);
            } else {
                saveCharacterStates();
            }
        }

        // Bias dal contesto narrativo (ultimi 5 msg) — allineato al Judgement e all'Entanglement.
        // Era [lastMessage] singolo → bias quasi sempre 0 → mood circuit pseudo-random.
        const bias = analyzeContextForBias(context.chat.slice(-5).map(m => m?.mes || ''));
        const seed = Date.now();

        $('#sq_last_state').html(`<i class="fa-solid fa-spinner fa-spin"></i> Evoluzione Emotiva...`);

        const entropyBits = Array.from({length: 6}, () => Math.random() > 0.5);
        const instructions = [];
        
        // Fase 1: Entropia Ibrida
        entropyBits.forEach((bit, i) => {
            if (bit) instructions.push({ gate: 'x', qubits: [i] });
            instructions.push({ gate: 'ry', qubits: [i], params: { theta: (bias * 0.3) + ((seed % (100 + i)) / 100) } });
        });

        // Fase 2: Sovrapposizione e Entanglement
        instructions.push({ gate: 'h', qubits: [0] }, { gate: 'h', qubits: [1] }, { gate: 'h', qubits: [2] });
        instructions.push({ gate: 'h', qubits: [3] }, { gate: 'h', qubits: [4] }, { gate: 'h', qubits: [5] });
        instructions.push({ gate: 'cx', qubits: [0, 1] }, { gate: 'cx', qubits: [2, 3] }, { gate: 'cx', qubits: [4, 5] });

        // Modalità density_matrix: attivata se "Mente Offuscata" è abilitata e il personaggio
        // è già in uno stato di caos/ombra con bias negativo (stressato, traumatizzato, ubriaco).
        const lastBitstring = characterQuantumStates[charId]?.last_collapse || '000000';
        const isInChaosZone = lastBitstring.startsWith('111') || lastBitstring.startsWith('110');
        const useNoisyMode = extensionSettings.noisyMindEnabled && isInChaosZone && bias < -1;

        const payload = {
            n_qubits: extensionSettings.qubitCount,
            shots: useNoisyMode ? 64 : 1,
            mode: useNoisyMode ? 'density_matrix' : 'statevector',
            hardware_profile: getActiveHardwareProfile(),
            instructions: instructions.map(inst => ({
                ...inst,
                qubits: inst.qubits.filter(q => q < extensionSettings.qubitCount)
            })).filter(inst => {
                if (inst.gate === 'cx') return inst.qubits.length === 2;
                return inst.qubits.length > 0;
            }),
            backend: 'auto'
        };

        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), 10000);

        let response;
        try {
            response = await fetch(`${QUANTUM_API_URL}/simulate`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json', 'X-SillyQuantum-Version': VERSION },
                body: JSON.stringify(payload),
                signal: controller.signal
            });
        } finally {
            clearTimeout(timeoutId);
        }

        if (response && response.ok) {  // [C2] guard: response è undefined se fetch ha throwato
            const result = await response.json();
            // In density_matrix mode l'esito arriva come top_states[0].state; in statevector come bitstring_final
            const bitstring = useNoisyMode
                ? (result.top_states?.[0]?.state || result.bitstring_final || '000000')
                : (result.bitstring_final || '000000');

            if (!characterQuantumStates[charId]) {
                characterQuantumStates[charId] = {
                    name: char.name, // [FIX-CHARNAME] raw name per compatibilità con bridge MP
                    qubits: extensionSettings.qubitCount,
                    history: [],
                    last_collapse: '0'.repeat(extensionSettings.qubitCount),
                    oracle_counter: 0,
                    last_seen_ts: Date.now()
                };
            }

            characterQuantumStates[charId].last_collapse = bitstring;
            characterQuantumStates[charId].history.push(entropyBits[0] ? 'x' : 'ry');
            if (characterQuantumStates[charId].history.length > 10) characterQuantumStates[charId].history.shift();

            saveCharacterStates();
            _promptGen++; // [R2] invalida qualsiasi drift in volo: il suo updatePromptInjection verrà saltato
            updatePromptInjection(charId, bitstring, true); // fromMessage=true: decay + score update apply
        }
    } catch (err) {
        console.error("Quantum Evolution failed:", err);
    } finally {
        isProcessing = false;
        lastQuantumJudgement = null;
        // lastOracleTwist is NOT cleared here: it's managed by _oracleTwistTimer
        // and must survive into the next AI turn to be injected into the prompt.
    }
}


function updatePromptInjection(charId, bitstring, fromMessage = false) {
    try {
        if (!extensionSettings.isEnabled || !extensionSettings.moodInjectionEnabled) {
            setExtensionPrompt('Silly Quantum', '', extension_prompt_types.IN_PROMPT, 0);
            return;
        }

        const moodMap = {
            // ZONA 000: ORDINE ASSOLUTO, CALMA, LOGICA
            '000000': 'Armonia Quantistica (Sincronia Totale)',
            '000001': 'Equilibrio interiore profondo',
            '000010': 'Analisi fredda e razionale',
            '000011': 'Focus assoluto sull\'obiettivo',
            '000100': 'Calma vigile e consapevole',
            '000101': 'Stato di riposo rigenerativo',
            '000110': 'Osservazione distaccata',
            '000111': 'Pazienza strategica',

            // ZONA 001: DISCIPLINA, METODO, RIGORE
            '001000': 'Disciplina e rigore formale',
            '001001': 'Fermezza e inflessibilità',
            '001010': 'Istruttore / Guida autorevole',
            '001011': 'Metodico e instancabile',
            '001100': 'Costanza incrollabile',
            '001101': 'Risolutezza silenziosa',
            '001110': 'Perfezionismo tecnico',
            '001111': 'Stato di Grazia Marziale',

            // ZONA 010: TENSIONE, ALLERTA, DIFESA
            '010000': 'Tensione pre-conflitto',
            '010001': 'Allerta massima (Pronto all\'azione)',
            '010010': 'Difesa impenetrabile',
            '010011': 'Sguardo indagatore',
            '010100': 'Valutazione tattica dei rischi',
            '010101': 'Autorità dominante',
            '010110': 'Resistenza ostinata',
            '010111': 'Pressione psicologica costante',

            // ZONA 011: CONFLITTO, AGGRESSIVITÀ, IMPULSO
            '011000': 'Impulso combattivo',
            '011001': 'Determinazione feroce',
            '011010': 'Rabbia controllata',
            '011011': 'Istinto di sopravvivenza',
            '011100': 'Fredda esecuzione',
            '011101': 'Passione ardente',
            '011110': 'Carica energetica instabile',
            '011111': 'Trionfo della Volontà',

            // ZONA 100: APERTURA, EMPATIA, CONNESSIONE
            '100000': 'Apertura e disponibilità',
            '100001': 'Empatia naturale affiorante',
            '100010': 'Sintonia emotiva profonda',
            '100011': 'Protettività e cura',
            '100100': 'Fiducia in evoluzione',
            '100101': 'Vibrazione positiva e vitale',
            '100110': 'Ispirazione e slancio interiore',
            '100111': 'Connessione spirituale latente',

            // ZONA 101: SERENITÀ, GIOIA, COMPRENSIONE
            '101000': 'Serenità contagiosa',
            '101001': 'Gentilezza d\'animo',
            '101010': 'Comprensione universale',
            '101011': 'Pace dopo la tempesta',
            '101100': 'Leggerezza dello spirito',
            '101101': 'Gratitudine silenziosa',
            '101110': 'Ottimismo radioso',
            '101111': 'Estasi meditativa',

            // ZONA 110: OMBRA, INTROSPEZIONE, DUBBIO
            '110000': 'Vulnerabilità (Difese incrinate)',
            '110001': 'Malinconia e introspezione',
            '110010': 'Sesto senso acuto',
            '110011': 'Dubbio e incertezza',
            '110100': 'Pensieroso e distante',
            '110101': 'Turbamento sottile',
            '110110': 'Malessere latente',
            '110111': 'Ricerca di risposte interiori',

            // ZONA 111: CAOS, FRAGILITÀ, TRASFORMAZIONE
            '111000': 'Instabilità emotiva',
            '111001': 'Frammentazione dell\'io',
            '111010': 'Ego ferito / Reattività',
            '111011': 'Paura primordiale',
            '111100': 'Sofferenza silente',
            '111101': 'Desiderio di redenzione',
            '111110': 'Crisi d\'identità',
            '111111': 'Caos Creatore (Trasformazione Totale)'
        };

        let normalizedBitstring = bitstring;
        if (bitstring.length < 6) {
            normalizedBitstring = bitstring.padEnd(6, '0');
        } else if (bitstring.length > 6) {
            normalizedBitstring = bitstring.substring(0, 6);
        }

        const currentMood = moodMap[normalizedBitstring] || 'Stato in mutamento';
        
        // Risonanza Semantica - Entanglement Dinamico (Lexical + Emotional Mirroring)
        const context = getContext();
        const char = context.characters[context.characterId];
        let resonanceInfo = 'Inattivo';
        let syncColor = '#888';
        
        if (extensionSettings.entanglementEnabled) {
            // Guard: se lo stato non esiste per questo charId, salta il calcolo entanglement
            if (!characterQuantumStates[charId]) {
                console.warn(`[${DISPLAY_NAME}] Entanglement skipped: no state for charId=${charId}`);
            } else {
            const getSignificantWords = (text) => {
                return text.replace(/[^\w\sàèìòù]/gi, ' ')
                           .split(/\s+/)
                           .filter(w => w.length > 4)
                           .filter(w => !['dello', 'della', 'questo', 'quello', 'tutto', 'perché', 'senza'].includes(w));
            };

            // Inizializzazione Score Base (Ground State da Schede)
            let eScore = characterQuantumStates[charId].entanglementScore;
            if (eScore === undefined || eScore === null || isNaN(eScore)) {
                const playerDesc = (context.user_description || context.settings?.user_description || '').toLowerCase();
                const charDesc = (char?.description || '').toLowerCase();
                const userBaseWords = getSignificantWords(playerDesc);
                const charBaseWords = getSignificantWords(charDesc);
                const commonBase = [...new Set(userBaseWords.filter(w => charBaseWords.includes(w)))];
                eScore = Math.min(100, Math.max(0, 40 + (commonBase.length * 10))); // Base neutrale 40
            }

            // [R13] Score update only on real message turns — not on character selection display refresh.
            // Calling updatePromptInjection from onCharacterSelected (no new message) used to silently
            // consume 1 decay point just for switching tabs.
            if (fromMessage) {
            // Mirroring Lessicale - Analisi SOLO sull'ultimo scambio (per evitare crescita esponenziale)
            const lastUserMsg = context.chat.filter(m => m.is_user).pop()?.mes || '';
            const lastCharMsg = context.chat.filter(m => !m.is_user).pop()?.mes || '';

            const userWords = getSignificantWords(lastUserMsg.toLowerCase());
            const charWords = getSignificantWords(lastCharMsg.toLowerCase());
            const commonWords = [...new Set(userWords.filter(w => charWords.includes(w)))];

            const eForce = extensionSettings.entanglementForce ?? 0.5; // Intensità modificatori [0.1 - 1.0]

            // [R12] Adaptive decay: full -1 at high scores, 0 below 15 to break the zero-floor trap.
            // Without this, eScore=0 → max(0, 0-1)=0 → stuck forever.
            // Multilingual roleplay (EN user / IT char) produces zero lexical overlap, so the trap
            // is permanent without this floor. Decay=0 below threshold lets any positive interaction recover.
            let syncDelta = eScore > 15 ? -1 : 0;
            // Cap al bonus lessicale: massimo +3 per turno anche se ci sono 10 parole uguali
            if (commonWords.length > 0) syncDelta += Math.min(3, commonWords.length * 1.5) * eForce;

            // Allineamento Emotivo (Interferenza)
            // Passiamo stringhe esplicite, non oggetti, per evitare di dipendere dal safeMessages guard
            const recentMsgs = context.chat.slice(-5).map(m => m.mes || '');
            const situationalBias = analyzeContextForBias(recentMsgs);

            const isAggressive = bitstring.startsWith('011') || bitstring.startsWith('010');
            const isVulnerable = bitstring.startsWith('110') || bitstring.startsWith('111');
            const isSerene = bitstring.startsWith('101') || bitstring.startsWith('100');

            // Modificatori Emotivi scalati da entanglementForce
            if (situationalBias > 1.5 && isAggressive) syncDelta += 2 * eForce;  // Sopravvivenza condivisa
            if (situationalBias < -1  && isSerene)     syncDelta -= 2 * eForce;  // Freddezza vs Apertura
            if (situationalBias > 1   && isVulnerable) syncDelta -= 3 * eForce;  // Tradimento tattico

            // Hard cap simmetrico: nessun turno può spostare più di ±4 punti
            syncDelta = Math.max(-4, Math.min(4, syncDelta));

            // Applica e salva
            eScore = Math.min(100, Math.max(0, eScore + syncDelta));
            characterQuantumStates[charId].entanglementScore = eScore;

            if (syncDelta >= 4) console.log(`[${DISPLAY_NAME}] Entanglement Spike! +${syncDelta}`);
            if (syncDelta <= -4) console.log(`[${DISPLAY_NAME}] Decoherence Drop! ${syncDelta}`);
            } // end if (fromMessage)

            // Risoluzione basata sui Qubit Scelti
            const eQubits = extensionSettings.entanglementQubits || 4;
            
            if (eQubits == 2) {
                if (eScore >= 60) { resonanceInfo = 'Entanglement (Legame)'; syncColor = '#4ade80'; }
                else if (eScore <= 40) { resonanceInfo = 'Decoerenza (Distacco)'; syncColor = '#ff6b6b'; }
                else { resonanceInfo = 'Fluttuazione Neutra'; syncColor = '#b0c4de'; }
            } else if (eQubits == 3) {
                if (eScore >= 75) { resonanceInfo = 'Entanglement Assoluto'; syncColor = '#00ffcc'; }
                else if (eScore >= 55) { resonanceInfo = 'Sincronia Risonante'; syncColor = '#4ade80'; }
                else if (eScore >= 35) { resonanceInfo = 'Connessione Sottile'; syncColor = '#b0c4de'; }
                else { resonanceInfo = 'Decoerenza (Distacco)'; syncColor = '#ff6b6b'; }
            } else { // 4 or 6 qubits (Alta risoluzione)
                if (eScore >= 90) { resonanceInfo = `Entanglement Assoluto [${Math.floor(eScore)}%]`; syncColor = '#00ffcc'; }
                else if (eScore >= 70) { resonanceInfo = `Sincronia Risonante [${Math.floor(eScore)}%]`; syncColor = '#4ade80'; }
                else if (eScore >= 45) { resonanceInfo = `Fluttuazione Neutra [${Math.floor(eScore)}%]`; syncColor = '#b0c4de'; }
                else if (eScore >= 20) { resonanceInfo = `Connessione Sottile [${Math.floor(eScore)}%]`; syncColor = '#ffcc00'; }
                else { resonanceInfo = `Decoerenza (Distacco) [${Math.floor(eScore)}%]`; syncColor = '#ff6b6b'; }
            }
            
            } // end else (characterQuantumStates[charId] exists)
        }

        // Composizione Iniezione Narrativa - PROTOCOLLO IMPERATIVO
        let oracleInjection = lastOracleTwist ? `\n### [QUANTUM ORACLE PROPHECY: MANDATORY]\nPROPHESY: ${lastOracleTwist}\n[INSTRUCTION: A sudden environmental or psychological shift occurs. You MUST integrate this prophecy NOW.]\n` : '';
        let judgementInjection = lastQuantumJudgement
            ? `\n### ⚠️ [QUANTUM FATE ENGINE — ABSOLUTE OVERRIDE] ⚠️\n` +
              `RESULT: ${lastQuantumJudgement.label}\n` +
              `NARRATIVE DIRECTIVE: ${lastQuantumJudgement.directive}\n` +
              `[SYSTEM RULE: This is a hard physics outcome determined before your response. ` +
              `You MUST follow the directive above EXACTLY when writing your reply. ` +
              `Ignoring or contradicting this outcome is NOT permitted under any circumstance. ` +
              `Character sheets, story context, and your own judgment are all subordinate to this result.]\n`
            : '';

        const injectionText = `${judgementInjection}${oracleInjection}### [QUANTUM STATE: ACTIVE]\n**Mood Context**: ${currentMood}\n**Quantum Signature**: ${bitstring}\n[Entanglement: ${resonanceInfo}]\n*System Note: The QuantumA Core has collapsed the wave function. Respect the mandatory outcomes above.*`;
        
        setExtensionPrompt('Silly Quantum', injectionText, extension_prompt_types.IN_PROMPT, 0);
        
        // Aggiorniamo la UI ISTANTANEAMENTE con tutte le info
        const monitor = $('#sq_last_state');
        if (monitor.length > 0) {
            const monitorLabels = {
                it: { mood: "Umore", entanglement: "Entanglement", gates: "Gate Recenti", none: "Nessuno" },
                en: { mood: "Mood", entanglement: "Entanglement", gates: "Recent Gates", none: "None" },
                es: { mood: "Estado", entanglement: "Entrelazamiento", gates: "Gates Recientes", none: "Ninguno" },
                fr: { mood: "Humeur", entanglement: "Intrication", gates: "Portes Récentes", none: "Aucun" },
                de: { mood: "Stimmung", entanglement: "Verschränkung", gates: "Letzte Gates", none: "Keine" },
                ja: { mood: "ムード", entanglement: "量子もつれ", gates: "最近のゲート", none: "なし" },
                zh: { mood: "情绪", entanglement: "量子纠缠", gates: "最近门操作", none: "无" }
            };
            const lang = extensionSettings.language || "it";
            const mLabels = monitorLabels[lang] || monitorLabels.it;
            
            const _rawProfile = getActiveHardwareProfile();
            const activeProfile = ['auto','superconducting','silicon_spin','trapped_ion','neutral_atom'].includes(_rawProfile) ? _rawProfile : 'unknown';
            const oracleInterval = extensionSettings.autoOracleInterval;
            const oracleCount = characterQuantumStates[charId]?.oracle_counter ?? 0;
            const oracleInfo = oracleInterval > 0
                ? `<span style="color: #aaa; font-size: 0.9em;">${oracleCount}/${oracleInterval}</span>`
                : `<span style="color: #555; font-size: 0.9em;">off</span>`;
            const safeBitstring = (bitstring || '').replace(/[^01]/g, '');

            // Sparkline: storico bitstring convertito in valore decimale, visualizzato come barre ASCII
            const bsHistory = characterQuantumStates[charId]?.bitstring_history || [];
            const sparkBars = ['▁','▂','▃','▄','▅','▆','▇','█'];
            const sparkLine = bsHistory.slice(-10).map(bs => {
                const v = parseInt((bs || '').replace(/[^01]/g, '') || '0', 2);
                const maxV = Math.pow(2, extensionSettings.qubitCount) - 1 || 63;
                return sparkBars[Math.min(Math.floor(v / maxV * (sparkBars.length - 1)), sparkBars.length - 1)];
            }).join('');

            monitor.html(`
                <b>Bitstring:</b> ${safeBitstring}<br>
                <b>${mLabels.mood}:</b> ${currentMood}<br>
                <b>${mLabels.entanglement}:</b> <span style="color: ${syncColor}; font-weight: bold;">${resonanceInfo}</span><br>
                <b>${mLabels.gates}:</b> ${characterQuantumStates[charId]?.history?.slice(-5).join(', ') || mLabels.none}<br>
                <b>Profile:</b> <span style="color: #aaa; font-size: 0.9em;">${activeProfile}</span> &nbsp; <b>Oracle:</b> ${oracleInfo}<br>
                ${sparkLine ? `<span style="font-family:monospace; letter-spacing:2px; color:#6366f1;">${sparkLine}</span>` : ''}
            `);
        }

        // Salviamo lo stato per persistenza
        if (characterQuantumStates[charId]) {
            const prevCollapse = characterQuantumStates[charId].last_collapse;
            characterQuantumStates[charId].last_collapse = bitstring;
            // Aggiungi alla sparkline solo se il bitstring è cambiato (evita duplicati da oracle che
            // chiama updatePromptInjection con il last_collapse già corrente)
            if (bitstring !== prevCollapse) {
                const bsHist = characterQuantumStates[charId].bitstring_history || [];
                bsHist.push(bitstring);
                if (bsHist.length > 20) bsHist.splice(0, bsHist.length - 20);
                characterQuantumStates[charId].bitstring_history = bsHist;
            }
            saveCharacterStates();
        }

        console.log(`[${DISPLAY_NAME}] Prompt & UI Synced: ${bitstring} (${currentMood})`);
    } catch (err) {
        console.error(`[${DISPLAY_NAME}] updatePromptInjection failed:`, err);
    }
}


function resetQuantumState() {
    const context = getContext();
    const char = context.characters[context.characterId];
    if (!char) return;

    const charId = (char.name || '').trim().replace(/\s+/g, '_'); // [FIX-CHARID]
    const neutralBitstring = "0".repeat(extensionSettings.qubitCount);
    const existingScore = characterQuantumStates[charId]?.entanglementScore;
    const existingOracle = characterQuantumStates[charId]?.oracle_counter || 0;
    
    characterQuantumStates[charId] = {
        name: char.name,
        qubits: extensionSettings.qubitCount,
        history: ['RESET'],
        last_collapse: neutralBitstring,
        entanglementScore: (existingScore > 0 ? existingScore : undefined),
        oracle_counter: existingOracle,
        last_seen_ts: Date.now()
    };
    saveCharacterStates();
    updatePromptInjection(charId, neutralBitstring);
    toastr.info("Stato Quantistico resettato a Neutro (Calma e analitica).");
}

/**
 * Rileva segnali narrativi di congedo o transizione di capitolo nell'ultima parte della chat.
 * Analizza gli ultimi 3 messaggi cercando saluti espliciti o marker di cambio scena/capitolo.
 * Usato da applyQuantumDrift in modalità 'contextual' per decidere se il Drift è narrativamente giustificato.
 */
function detectNarrativeFarewell(context) {
    const chat = context.chat;
    if (!chat || chat.length === 0) return false;

    // Scan last 3 messages (user + AI turns)
    const recentMsgs = chat.slice(-3).map(m => (m.mes || '').toLowerCase());
    const combined = recentMsgs.join(' ');

    // ── Farewell keywords (multilingual) ─────────────────────────────────────
    // [R8] Rimossi i falsi positivi più comuni dal dialogo normale:
    //   "stai bene" (IT: "are you okay?"), "per ora" (IT: "for now"), "a dopo" (IT: "talk later mid-sentence")
    const farewellKeywords = [
        // Italiano
        'arrivederci', 'a domani', 'ci vediamo', 'buonanotte', 'buona notte',
        'addio', 'a presto', 'alla prossima', 'ti lascio', 'ci sentiamo',
        'mi congedo', 'vado a dormire', 'vado a letto', 'ci risentiremo',
        'finisce qui', 'per stasera',
        // English
        'goodbye', 'good bye', 'farewell', 'good night', 'goodnight',
        'until next time', 'take care', 'see you tomorrow', 'talk later',
        'catch you later', 'i\'m heading out', 'got to go', 'gotta go',
        'have to leave', 'time to sleep', 'signing off',
        // Español
        'adiós', 'hasta mañana', 'hasta luego', 'buenas noches', 'nos vemos',
        // Français
        'au revoir', 'bonne nuit', 'à demain', 'à bientôt',
        // Deutsch
        'auf wiedersehen', 'gute nacht', 'bis morgen', 'tschüss',
    ];

    // ── Chapter / scene-transition markers ───────────────────────────────────
    const chapterKeywords = [
        // Italiano — narrativi
        'fine del capitolo', 'capitolo successivo', 'nuovo capitolo', 'fine scena',
        'cambio di scena', 'scena successiva', 'si chiude la scena', 'si apre la scena',
        'il giorno dopo', 'il giorno seguente', 'qualche ora dopo', 'ore dopo',
        'giorni dopo', 'settimane dopo', 'mesi dopo', 'anni dopo', 'passa del tempo',
        'dopo di allora', 'nel frattempo',
        // English — narrative
        'end of chapter', 'next chapter', 'chapter break', 'scene break', 'end scene',
        'time skip', 'time passes', 'hours later', 'days later', 'the next day',
        'the following day', 'weeks later', 'months later', 'years later',
        'some time later', 'meanwhile', 'fade out', 'fade to black',
        // Universal fiction markers (must be standalone-ish)
        '— fin —', '— end —', '— fine —',
    ];

    // [R8] Word-boundary-aware match: usa (?:^|[\s,!?.;:'"])kw(?:[\s,!?.;:'"]|$) invece di .includes()
    // puro per evitare falsi positivi su sottostringhe ("goodnight" dentro "said goodnight to",
    // "take care" dentro "take care of the wounded", ecc.).
    // Funziona anche per keyword con accenti (dove \b non è affidabile).
    const kwMatch = (kw) => new RegExp(
        `(?:^|[\\s,!?.;:'"])${kw.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}(?:[\\s,!?.;:'"]|$)`,
        'i'
    ).test(combined);

    // Also detect triple-star / triple-dash separators that indicate a scene break in fiction.
    // We only count them if they appear as their own "paragraph" (not in mid-sentence).
    const hasSceneBreak = /(\*\*\*|---)\s*$/.test(combined) || /^\s*(\*\*\*|---)/m.test(combined);

    const hasFarewell = farewellKeywords.some(kwMatch);
    const hasChapter  = chapterKeywords.some(kwMatch);

    const detected = hasFarewell || hasChapter || hasSceneBreak;
    if (detected) {
        console.log(`[${DISPLAY_NAME}] Narrative farewell/chapter detected → Drift allowed.`);
    }
    return detected;
}

/**
 * Quantum Drift — Collasso da Osservazione.
 * Si attiva quando la chat viene riaperta dopo >30 minuti di assenza.
 *
 * Modalità (extensionSettings.driftMode):
 *   'always'     — Comportamento classico: si attiva sempre se >30 min di assenza.
 *   'contextual' — (default) Si attiva solo se l'ultimo scambio narrativo conteneva
 *                  un saluto esplicito o un cambio di scena/capitolo.
 *   'disabled'   — Non si attiva mai.
 *
 * Il bias temporale è proporzionale alle ore trascorse, cappato a 2h.
 */
async function applyQuantumDrift(charId, driftStartGen = -1) { // [R2] driftStartGen cattura _promptGen al momento del lancio
    if (!extensionSettings.isEnabled) return;

    const mode = extensionSettings.driftMode ?? 'contextual';
    if (mode === 'disabled') return;

    const stateKey = `sq_last_session_${charId}`;
    const now = Date.now();
    const lastSession = parseInt(localStorage.getItem(stateKey) || '0');
    const elapsedMs = now - lastSession;
    const elapsedMinutes = elapsedMs / 60000;

    // [R3] NON salvare il timestamp qui — viene salvato solo dopo un drift riuscito (vedi sotto).
    // Se il backend è down e il fetch fallisce, il cooldown non deve scattare.

    // Soglia minima: 30 minuti. Senza una sessione precedente, nessun drift.
    if (!lastSession || elapsedMinutes < 30) return;

    // Contextual mode: only drift if the last chat exchange contained a narrative goodbye or chapter break
    if (mode === 'contextual') {
        const ctx = getContext();
        if (!detectNarrativeFarewell(ctx)) {
            console.log(`[${DISPLAY_NAME}] Quantum Drift: ${elapsedMinutes.toFixed(0)} min elapsed, but no narrative farewell detected — Drift suspended.`);
            return;
        }
    }

    // Drift bias: da 0 (30 min) a 1.0 (2 ore+), poi capped
    const driftHours = Math.min(2, elapsedMinutes / 60);
    const driftBias = (driftHours / 2) * (Math.random() > 0.5 ? 1 : -1); // direzione casuale

    console.log(`[${DISPLAY_NAME}] Quantum Drift: ${elapsedMinutes.toFixed(0)} min trascorsi, bias=${driftBias.toFixed(2)}`);

    const entropyBits = Array.from({length: 6}, () => Math.random() > 0.5);
    const instructions = [];
    entropyBits.forEach((bit, i) => {
        if (bit) instructions.push({ gate: 'x', qubits: [i] });
        instructions.push({ gate: 'ry', qubits: [i], params: { theta: (driftBias * 0.4) + ((Date.now() % (100 + i)) / 100) } });
    });
    instructions.push({ gate: 'h', qubits: [0] }, { gate: 'h', qubits: [1] }, { gate: 'h', qubits: [2] });
    instructions.push({ gate: 'h', qubits: [3] }, { gate: 'h', qubits: [4] }, { gate: 'h', qubits: [5] });
    instructions.push({ gate: 'cx', qubits: [0, 1] }, { gate: 'cx', qubits: [2, 3] }, { gate: 'cx', qubits: [4, 5] });

    const payload = {
        n_qubits: extensionSettings.qubitCount,
        shots: 1,
        mode: 'statevector', // [FIX-MODE] esplicito — drift non usa density_matrix
        hardware_profile: getActiveHardwareProfile(),
        instructions: instructions.map(inst => ({
            ...inst,
            qubits: inst.qubits.filter(q => q < extensionSettings.qubitCount)
        })).filter(inst => {
            if (inst.gate === 'cx') return inst.qubits.length === 2;
            return inst.qubits.length > 0;
        }),
        backend: 'auto'
    };

    try {
        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), 8000);
        let response;
        try {
            response = await fetch(`${QUANTUM_API_URL}/simulate`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json', 'X-SillyQuantum-Version': VERSION },
                body: JSON.stringify(payload),
                signal: controller.signal
            });
        } finally {
            clearTimeout(timeoutId);
        }

        if (response && response.ok) {
            const result = await response.json();
            const bitstring = result.bitstring_final || '000000';  // [C1] guard: backend 200 con body malformato
            // [R3] Salva il timestamp solo dopo un drift riuscito: se il fetch fallisce
            // il cooldown non si brucia e il drift può ritentare al prossimo CHARACTER_SELECTED.
            localStorage.setItem(stateKey, String(now));
            if (characterQuantumStates[charId]) {
                characterQuantumStates[charId].last_collapse = bitstring;
                characterQuantumStates[charId].history.push('drift');
                if (characterQuantumStates[charId].history.length > 10) characterQuantumStates[charId].history.shift();
                saveCharacterStates();
            }
            // [R2] Scrivi il prompt solo se nessun messaggio utente (né cambio personaggio) ha già
            // aggiornato lo stato nel frattempo. Lo stato è sempre salvato anche se saltiamo.
            if (driftStartGen === -1 || _promptGen === driftStartGen) {
                updatePromptInjection(charId, bitstring);
            } else {
                console.log(`[${DISPLAY_NAME}] Drift state saved, prompt update skipped (user message took precedence).`);
            }

            const driftMinText = elapsedMinutes < 120
                ? `${Math.round(elapsedMinutes)} min`
                : `${(elapsedMinutes / 60).toFixed(1)} h`;
            toastr.info(`Quantum Drift: ${driftMinText} di assenza hanno alterato lo stato emotivo.`, DISPLAY_NAME, { timeOut: 4000 });
        }
    } catch (err) {
        console.warn(`[${DISPLAY_NAME}] Quantum Drift failed:`, err);
    }
}

/**
 * Classifica la descrizione di un personaggio in uno dei 4 profili hardware quantistici.
 * silicon_spin (99.5% fidelity) = logico/analitico
 * superconducting (99.9%)       = normale/bilanciato (default)
 * trapped_ion (98.5%)           = impulsivo/emotivo
 * neutral_atom (97.0%)          = caotico/frammentato
 */
function detectHardwareProfile(charDescription) {
    const desc = (charDescription || '').toLowerCase();

    const analyticalKeywords = [
        'logical', 'analytical', 'precise', 'calculated', 'rational', 'cold', 'stoic',
        'methodical', 'calm', 'controlled', 'scientist', 'scholar', 'intellectual', 'robotic',
        'logico', 'analitico', 'preciso', 'calcolato', 'razionale', 'freddo', 'stoico',
        'metodico', 'calmo', 'controllato', 'scienziato', 'studioso', 'intellettuale'
    ];
    const chaoticKeywords = [
        'chaotic', 'unstable', 'insane', 'mad', 'crazy', 'volatile', 'erratic', 'unpredictable',
        'fragmented', 'broken', 'traumatized', 'deranged', 'frenzied', 'shattered',
        'caotico', 'instabile', 'pazzo', 'folle', 'volatile', 'imprevedibile',
        'frammentato', 'rotto', 'traumatizzato', 'demente', 'frenetico', 'distrutto'
    ];
    const impulsiveKeywords = [
        'impulsive', 'passionate', 'emotional', 'aggressive', 'fierce', 'reckless',
        'bold', 'daring', 'intense', 'hot-headed', 'fiery', 'explosive',
        'impulsivo', 'appassionato', 'emotivo', 'aggressivo', 'impetuoso', 'feroce',
        'spericolato', 'audace', 'intenso', 'focoso', 'esplosivo'
    ];

    if (analyticalKeywords.some(kw => desc.includes(kw))) return 'silicon_spin';
    if (chaoticKeywords.some(kw => desc.includes(kw)))    return 'neutral_atom';
    if (impulsiveKeywords.some(kw => desc.includes(kw)))  return 'trapped_ion';
    return 'superconducting';
}

/**
 * Restituisce il profilo hardware attivo: manuale se impostato, altrimenti auto-rilevato dalla descrizione del personaggio.
 */
function getActiveHardwareProfile() {
    if (extensionSettings.hardwareProfileMode !== 'auto') {
        return extensionSettings.hardwareProfileMode;
    }
    const context = getContext();
    const char = context.characters[context.characterId];
    const baseProfile = detectHardwareProfile(char?.description || '');

    // Adattamento dinamico: se i messaggi recenti mostrano pattern di caos/emozione,
    // il profilo può migrare temporaneamente verso neutral_atom o trapped_ion.
    try {
        const recentText = (context.chat || []).slice(-8).map(m => m?.mes || '').join(' ').toLowerCase();
        const chaosSignals = ['suddenly', 'panic', 'chaos', 'unexpected', 'implode', 'collapse',
                              'improvvis', 'panico', 'caos', 'inaspettat', 'collasso'];
        const emotionSignals = ['love', 'hate', 'rage', 'tears', 'crying', 'desperate', 'passion',
                                'amore', 'odio', 'rabbia', 'lacrime', 'disperato', 'passione'];
        const chaosCount = chaosSignals.filter(kw => recentText.includes(kw)).length;
        const emotionCount = emotionSignals.filter(kw => recentText.includes(kw)).length;
        if (chaosCount >= 3) return 'neutral_atom';
        if (emotionCount >= 3) return 'trapped_ion';
    } catch (_) { /* fallback al baseProfile */ }

    return baseProfile;
}

/**
 * Analizza il contesto per determinare se applicare un bonus o un malus quantistico
 */
function analyzeContextForBias(messages) {
    let bias = 0;
    // Ensure we always work with plain strings (messages may be objects if passed incorrectly)
    const safeMessages = messages.map(m => (typeof m === 'string' ? m : (m?.mes || '')));
    const chatHistory = safeMessages.slice(-5).join(' ').toLowerCase();
    const currentMsg = (safeMessages[safeMessages.length - 1] || '').toLowerCase();

    // 1. ANALISI DELLA TENSIONE (EN + IT + ES + FR + DE + JA/ZH romanized)
    const tensionMarkers = [
        '!', '?',
        // IT
        'improvvis', 'subit', 'mentre', 'urlo', 'grido', 'sudor', 'battit', 'pericol', 'attenzione',
        // EN
        'danger', 'sudden', 'watch out', 'alert', 'warning',
        // ES
        'peligro', 'cuidado', 'repentino', 'grito',
        // FR
        'danger', 'soudain', 'attention', 'cri',
        // DE
        'gefahr', 'plötzlich', 'achtung', 'schrei'
    ];
    let tension = tensionMarkers.filter(m => chatHistory.includes(m)).length * 0.2;

    // 2. STATO DEI PERSONAGGI (Malus Situazionali — EN + IT)
    const malusSituations = {
        'weakness':     [
            // EN
            'wound', 'wounded', 'bleeding', 'bleed', 'blood', 'hurt', 'injured', 'injury',
            'exhausted', 'exhaustion', 'tired', 'weak', 'weakened', 'pain', 'agony',
            'broken', 'shattered', 'crippled', 'dying', 'barely',
            // IT
            'ferit', 'sanguin', 'stanco', 'esaurit', 'dolore', 'agonia', 'morend', 'debol',
            // ES
            'herido', 'sangre', 'cansado', 'dolor', 'agonía',
            // FR
            'blessé', 'sang', 'fatigué', 'douleur',
            // DE
            'verletzt', 'blut', 'müde', 'schmerz', 'schwach'
        ],
        'hostility':    [
            // EN
            'enemy', 'enemies', 'monster', 'ambush', 'ambushed', 'trap', 'trapped',
            'surrounded', 'outnumbered', 'cornered', 'threat', 'threatened', 'hostile', 'lethal',
            // IT
            'nemico', 'nemici', 'mostro', 'imboscata', 'trappola', 'circondato', 'minaccia', 'ostile',
            // ES
            'enemigo', 'monstruo', 'emboscada', 'trampa', 'rodeado', 'amenaza',
            // FR
            'ennemi', 'monstre', 'embuscade', 'piège', 'menace',
            // DE
            'feind', 'monster', 'hinterhalt', 'falle', 'bedrohung'
        ],
        'darkness':     [
            // EN
            'dark', 'darkness', 'shadow', 'shadows', 'blind', 'blinded', 'obscured', 'pitch black', 'fog', 'smoke',
            // IT
            'buio', 'oscurità', 'ombra', 'cieco', 'nebbia', 'fumo',
            // ES
            'oscuridad', 'sombra', 'ciego', 'niebla', 'humo',
            // FR
            'obscurité', 'ombre', 'aveugle', 'brouillard', 'fumée',
            // DE
            'dunkelheit', 'schatten', 'blind', 'nebel', 'rauch'
        ]
    };

    // 3. VANTAGGI (Bonus Situazionali — EN + IT)
    const bonusSituations = {
        'strength':     [
            // EN
            'powerful', 'strong', 'strength', 'mighty', 'power', 'focused', 'focus',
            'steady', 'weapon', 'armed', 'blade', 'gun', 'shield', 'armor', 'fortified',
            // IT
            'potente', 'forte', 'forza', 'concentrat', 'armat', 'lama', 'scudo', 'armatura',
            // ES
            'poderoso', 'fuerte', 'fuerza', 'armado', 'escudo',
            // FR
            'puissant', 'fort', 'force', 'armé', 'bouclier',
            // DE
            'mächtig', 'stark', 'kraft', 'bewaffnet', 'schild'
        ],
        'inspiration':  [
            // EN
            'courage', 'courageous', 'hope', 'hopeful', 'determined', 'determination',
            'inspired', 'inspire', 'light', 'faith', 'will', 'resolve', 'confident',
            // IT
            'coraggio', 'coraggioso', 'speranza', 'determinat', 'ispirat', 'luce', 'fede', 'volontà',
            // ES
            'coraje', 'esperanza', 'determinado', 'inspirado', 'fe', 'voluntad',
            // FR
            'courage', 'espoir', 'déterminé', 'inspiré', 'foi', 'volonté',
            // DE
            'mut', 'hoffnung', 'entschlossen', 'inspiriert', 'glaube', 'wille'
        ],
        'prior_success':['success', 'successful', 'victory', 'victorious', 'won', 'win', 'landed',
                         'hit', 'connected', 'advantage', 'upper hand', 'momentum',
                         // IT
                         'successo', 'vittoria', 'vinto', 'vantaggio',
                         // ES
                         'éxito', 'victoria', 'ventaja',
                         // FR
                         'succès', 'victoire', 'avantage',
                         // DE
                         'erfolg', 'sieg', 'vorteil'
        ]
    };

    // Applichiamo i Bias in base alla situazione rilevata
    for (const [key, keywords] of Object.entries(malusSituations)) {
        if (keywords.some(kw => chatHistory.includes(kw))) bias -= 0.4;
    }
    for (const [key, keywords] of Object.entries(bonusSituations)) {
        if (keywords.some(kw => chatHistory.includes(kw))) bias += 0.4;
    }

    if (currentMsg.length > 150) bias += 0.2;

    return Math.max(-2.5, Math.min(2.5, bias + tension));
}

async function generateQuantumPlotTwist(skipProcessingCheck = false) {
    if (!extensionSettings.isEnabled || (!skipProcessingCheck && isProcessing)) return;

    const context = getContext();
    // [R5] Guard: context.chat può essere null/undefined se nessuna chat è caricata
    if (!context || !context.chat || context.chat.length === 0) {
        toastr.warning("Nessuna chat attiva per l'Oracolo.");
        return;
    }
    const chat = context.chat;
    const bias = analyzeContextForBias(chat.map(m => m?.mes || ''));
    
    let biasInfo = "Neutro";
    if (bias > 0) biasInfo = `Bonus Fortuna (+${bias})`;
    if (bias < 0) biasInfo = `Malus Sventura (${bias})`;

    const toastId = toastr.info(`Consultando l'Oracolo... Context: ${biasInfo}`, '', { timeOut: 0, extendedTimeOut: 0 });

    const seed = Date.now();

    try {
        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), 10000);

        let response;

        // Modalità Grover: amplifica lo stato target calcolato dal bias contestuale.
        // Bias [-2.5, +2.5] → target_state [0, 63]. Ha priorità su Multiverso.
        if (extensionSettings.groverOracle) {
            const normalizedBias = (bias + 2.5) / 5.0; // [0, 1]
            const targetState = Math.round(normalizedBias * 63);
            const groverPayload = {
                n_qubits: 6,
                target_state: targetState,
                iterations: 1,
                shots: 1,
                backend: 'auto'
            };
            try {
                response = await fetch(`${QUANTUM_API_URL}/grover`, {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json', 'X-SillyQuantum-Version': VERSION },
                    body: JSON.stringify(groverPayload),
                    signal: controller.signal
                });
            } finally {
                clearTimeout(timeoutId);
                toastr.clear(toastId);
            }
        } else {
            // Generiamo entropia reale in JS per "sporcare" il circuito quantistico
            const entropyBits = Array.from({length: 6}, () => Math.random() > 0.5);
            const randomAngles = Array.from({length: 6}, () => (Math.random() * Math.PI) + (bias * 0.5));

            const instructions = [];

            // Fase 1: Iniezione di Entropia (X gates basati su JS + RY basati su Bias)
            entropyBits.forEach((bit, i) => {
                if (bit) instructions.push({ gate: 'x', qubits: [i] });
                instructions.push({ gate: 'ry', qubits: [i], params: { theta: randomAngles[i] } });
            });

            // Fase 2: Sovrapposizione e Entanglement (Natura Quantistica)
            instructions.push({ gate: 'h', qubits: [0] }, { gate: 'h', qubits: [1] }, { gate: 'h', qubits: [2] });
            instructions.push({ gate: 'h', qubits: [3] }, { gate: 'h', qubits: [4] }, { gate: 'h', qubits: [5] });
            instructions.push({ gate: 'cx', qubits: [0, 1] }, { gate: 'cx', qubits: [2, 3] }, { gate: 'cx', qubits: [4, 5] });

            // Modalità Multiverso: shots:16 con monte_carlo per scegliere il destino più frequente tra 16 universi paralleli
            const payload = {
                n_qubits: 6, // L'Oracolo opera sempre a 6 qubit per garantire tutti i 64 twist
                shots: extensionSettings.multiverse ? 16 : 1,
                mode: extensionSettings.multiverse ? 'monte_carlo' : 'statevector',
                hardware_profile: getActiveHardwareProfile(),
                instructions: instructions.map(inst => ({
                    ...inst,
                    qubits: inst.qubits.filter(q => q < 6)
                })).filter(inst => {
                    if (inst.gate === 'cx') return inst.qubits.length === 2;
                    return inst.qubits.length > 0;
                }),
                backend: 'auto'
            };

            try {
                response = await fetch(`${QUANTUM_API_URL}/simulate`, {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json', 'X-SillyQuantum-Version': VERSION },
                    body: JSON.stringify(payload),
                    signal: controller.signal
                });
            } finally {
                clearTimeout(timeoutId);
                toastr.clear(toastId);
            }
        }

        if (response && response.ok) {  // [C2] guard: response è undefined se fetch ha throwato
            const result = await response.json();
            // Grover restituisce bitstring_final direttamente; monte_carlo usa top_states[0].state
            // [R4] Fallback '000000' su tutti i rami: evita parseInt(undefined,2)=NaN → twists[NaN]=undefined
            const oracleBitstring = extensionSettings.groverOracle
                ? (result.bitstring_final || '000000')           // [R4] era senza fallback → NaN → "PROPHESY: undefined"
                : extensionSettings.multiverse
                    ? (result.top_states?.[0]?.state || result.bitstring_final || '000000')
                    : (result.bitstring_final || '000000');
            const twists = [
                "Catastrofe: La situazione attuale crolla nel peggiore dei modi.",
                "Tradimento: Un volto amico si rivela un nemico giurato.",
                "Perdita: Un oggetto o un legame prezioso viene distrutto per sempre.",
                "Ferita Profonda: Un colpo fisico o morale lascia un segno indelebile.",
                "Isolamento: Sei separato dai tuoi alleati nel momento del bisogno.",
                "Falso Indizio: Segui una pista che ti porta in una trappola mortale.",
                "Debito Esigibile: Un vecchio errore torna a pretendere un prezzo terribile.",
                "Sabotaggio: I tuoi mezzi o i tuoi piani vengono rovinati dall'interno.",
                "Ombra del Nemico: La mano del tuo avversario ti raggiunge nell'oscurità.",
                "Perdita di Controllo: Un personaggio cede all'istinto, causando danni.",
                "Sfortuna Nera: Ogni azione intrapresa ora avrà conseguenze nefaste.",
                "Segreto Svelato: Una verità pericolosa viene rivelata a chi non dovrebbe.",
                "Ambiente Ostile: Il luogo in cui ti trovi diventa improvvisamente letale.",
                "Errore Fatale: Un passo falso mette a rischio l'intera missione.",
                "Visione d'Orrore: Uno sguardo nel futuro rivela solo cenere e rovina.",
                "Limite Raggiunto: Le energie o le risorse svaniscono nel momento critico.",
                "Incontro Inaspettato: Uno sconosciuto incrocia la tua strada.",
                "Messaggio Criptico: Ricevi una comunicazione ambigua o incompleta.",
                "Cambio di Scenario: La trama si sposta in un luogo imprevisto.",
                "Ostacolo Naturale: Un evento atmosferico o ambientale rallenta tutto.",
                "Oggetto Misterioso: Trovi qualcosa di cui non comprendi l'utilità.",
                "Déjà Vu: Senti di aver già vissuto questo momento in passato.",
                "Sguardo Invisibile: Senti di essere osservato da occhi nascosti.",
                "Voci Discordanti: Sorge un disaccordo o un dubbio tra gli alleati.",
                "Crisi di Coscienza: Metti in dubbio le tue motivazioni o i tuoi valori.",
                "Traccia Incerta: Trovi un indizio che solleva più domande che risposte.",
                "Distrazione Improvvisa: Un evento esterno attira l'attenzione generale.",
                "Equilibrio Instabile: La situazione è tesa e pronta a mutare bruscamente.",
                "Eco del Passato: Un vecchio ricordo o una ferita torna a farsi sentire.",
                "Enigma Irrisolto: Un ostacolo logico blocca il progresso.",
                "Nuovo Attore: Un personaggio secondario entra in scena con decisione.",
                "Silenzio Carico: Una pausa improvvisa aumenta la tensione nell'aria.",
                "Bivio: Devi scegliere tra due strade, entrambe incognite.",
                "Patto Rischioso: Viene offerta un'intesa dai termini poco chiari.",
                "Specchio della Verità: Sei costretto a vedere una realtà spiacevole.",
                "Tensione Esplosiva: L'aria presagisce un conflitto o un mutamento.",
                "Intuizione Lampo: Capisci un dettaglio fondamentale, ma non il tutto.",
                "Strana Coincidenza: Due eventi slegati sembrano ora collegati.",
                "Legame Sottile: Percepisci un'affinità con qualcuno di inatteso.",
                "Tempo che Stringe: Un limite temporale si palesa all'improvviso.",
                "Rivelazione Incompleta: Scopri solo una parte di ciò che cercavi.",
                "Rumore d'Allerta: Un suono sospetto mette tutti in guardia.",
                "Salto Temporale: La percezione del tempo o del ritmo si altera.",
                "Immagine Onirica: Un sogno o una visione ti suggerisce un'idea.",
                "Presagio: Un segno del mondo circostante indica una direzione.",
                "Sospetto Strisciante: La fiducia reciproca viene messa alla prova.",
                "Labirinto: Ti accorgi che la strada è più complessa del previsto.",
                "Verità Nascosta: Intravedi il vero volto di chi ti circonda.",
                "Colpo di Fortuna: Un ostacolo svanisce per pura coincidenza.",
                "Ispirazione: La mente si schiarisce, la soluzione è davanti a te.",
                "Aiuto Inaspettato: Qualcuno giunge in soccorso nel bisogno.",
                "Risorsa Trovata: Recuperi un mezzo o uno strumento utile.",
                "Mistero Svelato: Un grande segreto viene finalmente compreso.",
                "Sincronia: Gli alleati agiscono in perfetta coordinazione.",
                "Beneficio Inatteso: Ricevi un aiuto o un vantaggio senza chiederlo.",
                "Punto debole Trovato: Scopri la vulnerabilità del tuo ostacolo.",
                "Ricarica: Recuperi energie o determinazione nel momento finale.",
                "Visione di Speranza: Uno sguardo nel futuro rivela un esito positivo.",
                "Riconoscimento: Le tue azioni ti valgono la stima di qualcuno.",
                "Nuova Via: Una strada luminosa si apre davanti a te.",
                "Forza Interiore: Senti un'energia che guida i tuoi passi.",
                "Successo Insperato: Ottieni un risultato migliore del previsto.",
                "Legame Fortificato: Un'amicizia o un patto diventa d'acciaio.",
                "Vittoria del Destino: La realtà si piega alla tua volontà. Trionfo assoluto."
            ];
            
            const bitValue = parseInt(oracleBitstring, 2);
            const twistIndex = bitValue % twists.length;
            const twist = twists[twistIndex];
            lastOracleTwist = twist;

            const toastMessage = extensionSettings.hideOracleResult
                ? "L'oracolo è stato consultato. Il destino è in moto..."
                : `Responso: ${twist}`;

            toastr.info(toastMessage, "Silly Quantum Oracle");

            const char = context.characters[context.characterId];
            if (char) {
                const charId = (char.name || '').trim().replace(/\s+/g, '_'); // [FIX-CHARID]
                const lastCollapse = characterQuantumStates[charId]?.last_collapse || '000000';
                updatePromptInjection(charId, lastCollapse);
            }

            // I1 — Salva il twist oracle in MemPalace room:lore come memoria permanente narrativa
            // [FIX-WINGNAME] wing usa canonicalCharKey (spazi→underscore) per allineamento con MemPalace
            try {
                const _mpCall = window.__sillybridge?.callMemPalace || window.callMemPalace;
                if (typeof _mpCall === 'function' && char) {
                    const mpWing = (char.name || '').trim().replace(/\s+/g, '_');
                    _mpCall('mempalace_add_drawer', {
                        wing: mpWing,
                        room: 'lore',
                        content: `[Oracle Twist] ${twist}`,
                        source_file: `oracle:${Date.now()}`
                    }).catch(() => {});
                }
            } catch (_) { /* MemPalace non disponibile */ }
            if (_oracleTwistTimer) clearTimeout(_oracleTwistTimer);
            _oracleTwistTimer = setTimeout(() => { lastOracleTwist = null; _oracleTwistTimer = null; }, 120000);
        } else {
            toastr.error("Errore Oracolo.");
        }
    } catch (err) {
        toastr.clear(toastId);
        toastr.error("Connessione Oracolo fallita.");
        lastOracleTwist = null; // [R5] reset: evita che un twist stale della sessione precedente bleed nel prossimo prompt
    }
}

/**
 * Evaluate if a message contains an action and determine its outcome
 */
async function evaluateQuantumAction(message, charId, charData, msgIdx) {
    const msgLower = message.toLowerCase();
    const context = getContext();
    // Guard against messages with no text (e.g. image-only messages) which would crash .toLowerCase()
    const chatHistory = context.chat.slice(-5).map(m => (m.mes || '').toLowerCase()).join(' ');
    
    // 1. DETERMINAZIONE DELL'OPPORTUNITÀ (Dobbiamo tirare i dadi?)
    const extremeTension = /[!?]{2,}/.test(message);
    const _defaultChallengeConcepts = [
        // Combat
        'attack', 'strike', 'punch', 'slash', 'stab', 'shoot', 'fire', 'aim', 'hit',
        'swing', 'charge', 'lunge', 'parry', 'dodge', 'block', 'counter',
        // Physical Action
        'try', 'attempt', 'grab', 'grapple', 'push', 'pull', 'throw', 'leap', 'jump',
        'climb', 'sprint', 'rush', 'dive', 'roll', 'crawl', 'break', 'force',
        // Stealth & Rogue
        'sneak', 'hide', 'steal', 'pickpocket', 'lockpick', 'picklock', 'disarm',
        'backstab', 'ambush', 'shadow', 'infiltrate',
        // Investigation & Interaction
        'search', 'investigate', 'inspect', 'examine', 'scan', 'hack', 'crack',
        'persuade', 'convince', 'seduce', 'charm', 'bluff', 'lie', 'deceive',
        'intimidate', 'threaten', 'interrogate', 'bribe', 'negotiate',
        // Magic & Abilities
        'cast', 'conjure', 'summon', 'channel', 'invoke', 'activate', 'trigger',
        // Kiss / Intimacy
        'kiss', 'embrace', 'touch', 'caress'
    ];
    // Supporto override da settings: l'utente può aggiungere keyword custom separate da virgola
    const _customExtra = (extensionSettings.customChallengeConcepts || '')
        .split(',').map(s => s.trim().toLowerCase()).filter(s => s.length > 2);
    const challengeConcepts = _customExtra.length > 0
        ? [..._defaultChallengeConcepts, ..._customExtra]
        : _defaultChallengeConcepts;
    const isChallenge = challengeConcepts.some(c => msgLower.includes(c));
    
    if (!extremeTension && !isChallenge) return;

    // 2. DETERMINAZIONE DEL CONTESTO (Cosa stiamo giudicando?)
    let actionContext = "Azione";
    const words = msgLower.split(/\s+/);
    const challengeIdx = words.findIndex(w => challengeConcepts.some(c => w.includes(c)));
    if (challengeIdx !== -1) {
        actionContext = words.slice(Math.max(0, challengeIdx - 1), challengeIdx + 2).join(' ');
    }

    // 3. ANALISI DEL BIAS SITUAZIONALE (Salute, Ambiente, Audacia)
    const situationalBias = analyzeContextForBias(context.chat.slice(-5).map(m => m?.mes || ''));
    
    const audacityKeywords = [
        'desperate', 'desperation', 'all or nothing', 'all in', 'reckless', 'recklessly',
        'gamble', 'sacrifice', 'suicidal', 'extreme', 'last resort', 'last chance',
        'nothing to lose', 'risk it all', 'bet everything', 'mad', 'insane', 'death',
        'die trying', 'do or die', 'beyond my limit', 'push through', 'last effort'
    ];
    let audacityBonus = audacityKeywords.some(kw => msgLower.includes(kw)) ? 1.2 : 0;

    const totalBias = Math.max(-2.5, Math.min(2.5, situationalBias + audacityBonus));

    try {
        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), 8000);

        $('#sq_judgement_log').html(`<i class="fa-solid fa-dice-d20 fa-spin"></i> Il Fato sta decidendo... (Bias: ${totalBias.toFixed(1)})`);

        const entropyBits = Array.from({length: 6}, () => Math.random() > 0.5);
        const randomAngles = Array.from({length: 6}, () => (Math.random() * Math.PI) + (totalBias * 0.45));

        const instructions = [];
        entropyBits.forEach((bit, i) => {
            if (bit) instructions.push({ gate: 'x', qubits: [i] });
            instructions.push({ gate: 'ry', qubits: [i], params: { theta: randomAngles[i] } });
        });

        instructions.push({ gate: 'h', qubits: [0] }, { gate: 'h', qubits: [1] }, { gate: 'h', qubits: [2] });
        instructions.push({ gate: 'h', qubits: [3] }, { gate: 'h', qubits: [4] }, { gate: 'h', qubits: [5] });
        instructions.push({ gate: 'cx', qubits: [0, 1] }, { gate: 'cx', qubits: [2, 3] }, { gate: 'cx', qubits: [4, 5] });

        const payload = {
            n_qubits: 6, // Il Fato opera sempre a 6 qubit per accedere a tutte e 6 le fasce di successo
            shots: 1,
            mode: 'statevector', // [FIX-MODE] esplicito per evitare default non garantito dal backend
            hardware_profile: getActiveHardwareProfile(),
            instructions: instructions.map(inst => ({
                ...inst,
                qubits: inst.qubits.filter(q => q < 6)
            })).filter(inst => {
                if (inst.gate === 'cx') return inst.qubits.length === 2;
                return inst.qubits.length > 0;
            }),
            backend: 'auto'
        };

        let response;
        try {
            response = await fetch(`${QUANTUM_API_URL}/simulate`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json', 'X-SillyQuantum-Version': VERSION },
                body: JSON.stringify(payload),
                signal: controller.signal
            });
        } finally {
            clearTimeout(timeoutId);
        }

        if (response && response.ok) {  // [C2] guard: response è undefined se fetch ha throwato
            const result = await response.json();
            const bitValue = parseInt(result.bitstring_final || '000000', 2);

            // Dato che il Fato opera sempre a 6 Qubit, il maxVal è sempre 63
            const maxVal = 63;
            const percentage = (bitValue / maxVal) * 100;
            
            let resultText = "";
            let resultDirective = "";
            let logClass = "";

            if (percentage <= 15) {
                resultText = "CATASTROPHE";
                resultDirective = "The action fails catastrophically. Something goes terribly wrong — the character is hurt, disarmed, humiliated, or puts someone at risk. Narrate the worst plausible consequence.";
                logClass = "sq-judgement-fail";
            } else if (percentage <= 35) {
                resultText = "FAILURE";
                resultDirective = "The action fails completely. The character does NOT achieve what they attempted. The attack misses, the persuasion falls flat, the attempt is rejected. Do NOT let the action succeed.";
                logClass = "sq-judgement-fail";
            } else if (percentage <= 60) {
                resultText = "HESITATION";
                resultDirective = "The action is interrupted, blocked, or only partially executed. The character hesitates at the last moment, is deflected, or something intervenes. The full intended effect does NOT occur. Narrate the hesitation or interruption clearly.";
                logClass = "sq-judgement-partial";
            } else if (percentage <= 80) {
                resultText = "SUCCESS AT A COST";
                resultDirective = "The action succeeds, but at a price. The character achieves their goal but suffers a setback — takes a hit, loses something, creates a new problem, or the victory feels hollow. Narrate both the success AND its cost.";
                logClass = "sq-judgement-partial";
            } else if (percentage <= 95) {
                resultText = "FULL VICTORY";
                resultDirective = "The action succeeds cleanly and completely. The character achieves exactly what they intended with no significant drawback. Narrate a clear and satisfying success.";
                logClass = "sq-judgement-success";
            } else {
                resultText = "ABSOLUTE TRIUMPH";
                resultDirective = "The action succeeds beyond all expectation. The outcome is spectacular — the character performs at their absolute peak. Narrate an extraordinary, memorable success with maximum impact.";
                logClass = "sq-judgement-success";
            }

            const resultEmoji = resultText === 'CATASTROPHE' ? '💀' : resultText === 'ABSOLUTE TRIUMPH' ? '🏆' : '🎲';
            const safeActionContext = actionContext.replace(/[&<>"']/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
            const fullLog = `[${safeActionContext.toUpperCase()}]: ${resultText}`;
            lastQuantumJudgement = { label: fullLog, directive: resultDirective };
            $('#sq_judgement_log').html(fullLog).removeClass('sq-judgement-success sq-judgement-fail sq-judgement-partial').addClass(logClass);

            // ── RISCRITTURA MESSAGGIO UTENTE ──────────────────────────────────────
            // Il messaggio originale viene sostituito nel log della chat con due blocchi:
            // INTENZIONE (cosa voleva fare il giocatore) e CIÒ CHE ACCADE (esito del dado).
            // L'AI riceve questo testo riformattato e non vede mai l'intenzione grezza.
            const playerName = (getContext().name1 || 'Player').toUpperCase();
            const rewrittenMsg =
                `**[✨ ${playerName} INTENTION]**\n*${message}*\n\n` +
                `**[${resultEmoji} WHAT ACTUALLY HAPPENS — ${resultText}]**\n${resultDirective}`;

            // 1. Aggiorna il modello dati nella chat
            const ctx = getContext();
            if (ctx.chat[msgIdx]) {
                ctx.chat[msgIdx].mes = rewrittenMsg;
                // Aggiorna lastProcessedText per evitare un re-trigger del loop
                lastProcessedText = rewrittenMsg;
            }

            // 2. Aggiorna il DOM (il balloon visibile in chat)
            const $mesText = $(`.mes[mesid="${msgIdx}"] .mes_text`);
            if ($mesText.length) {
                const htmlMsg = rewrittenMsg
                    .replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
                    .replace(/\*\*(.+?)\*\*/g, '<b>$1</b>')
                    .replace(/\*([^*]+?)\*/g, '<em>$1</em>')
                    .replace(/\n/g, '<br>');
                $mesText.html(htmlMsg);
            }

            // 3. Salva la chat (compatibilità multi-versione ST)
            try {
                if (typeof saveChatConditional === 'function') saveChatConditional();
                else if (typeof window.saveChatConditional === 'function') window.saveChatConditional();
            } catch(e) { console.warn(`[${DISPLAY_NAME}] Chat save after rewrite failed:`, e); }
            // ─────────────────────────────────────────────────────────────────────

            // I2 — Salva il risultato del Judgement in MemPalace come fatto KG
            // [FIX-WINGNAME] wing usa canonicalCharKey per allineamento con MemPalace (come fix per oracle twist)
            try {
                const _mpCall = window.__sillybridge?.callMemPalace || window.callMemPalace;
                if (typeof _mpCall === 'function' && charData) {
                    const mpWing = (charData.name || '').trim().replace(/\s+/g, '_');
                    const kgFact = `${actionContext} OUTCOME_WAS ${resultText}`;
                    _mpCall('mempalace_add_drawer', {
                        wing: mpWing,
                        room: 'char',
                        content: `[Judgement] ${kgFact}`,
                        source_file: `judgement:${Date.now()}`
                    }).catch(() => {});
                }
            } catch (_) { /* MemPalace non disponibile */ }

            // Toast parlante con Bitstring di debug per capire se è bloccato
            toastr.info(`${resultText} (Binary: ${result.bitstring_final})`, `Fate: ${actionContext.toUpperCase()}`, {
                timeOut: 6000,
                progressBar: true
            });
        }
    } catch (err) {
        console.error("Quantum Judgement Error:", err);
        $('#sq_judgement_log').html(`<i class="fa-solid fa-circle-exclamation"></i> Errore Fato. Riprova.`);
    }
}

jQuery(async () => {
    try {
        if (typeof eventSource !== 'undefined') {
            await init();
        } else {
            console.error(`[${DISPLAY_NAME}] Failed to load: eventSource is undefined.`);
        }
    } catch (e) {
        console.error(`[${DISPLAY_NAME}] Error in jQuery ready:`, e);
    }
});
