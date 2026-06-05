![Silly Quantum](Banner%20Silly%20Quantum.png)

# Silly Quantum

> **An experiment in applying quantum circuit simulation to narrative roleplay.**
> Silly Quantum started as a personal project to explore whether quantum circuit mathematics could produce more interesting emotional state transitions than a standard random number generator. It uses QuantumA Core, a classical simulator of quantum circuits, to compute character states from real circuit math. No actual quantum hardware is involved.
>
> Two things make it more interesting than a plain random picker. First, conversation keywords are translated into RY rotation angles before the circuit runs: the narrative context literally deforms the probability landscape of the circuit before the math takes over. Second, CNOT entanglement gates couple qubit pairs, so the 6 output bits are not independent coin flips — the circuit geometry creates correlations between emotional dimensions that a flat random function cannot reproduce.

[![Version](https://img.shields.io/badge/version-1.6.4-blue)](https://github.com/ShinRalexis/Silly-Quantum/releases)
[![SillyTavern](https://img.shields.io/badge/SillyTavern-compatible-green)](https://github.com/SillyTavern/SillyTavern)
[![QuantumA Core](https://img.shields.io/badge/QuantumA_Core-required-purple)](https://github.com/ShinRalexis/QuantumA-Core)
[![License](https://img.shields.io/badge/license-MIT-orange)](LICENSE)

---

## What it does

The idea was simple: instead of rolling a plain random number to pick a character mood, run a 6-qubit quantum circuit through a simulator and let the mathematics of superposition and entanglement shape the output. The result is a mood engine with 64 named states where the transitions follow quantum circuit logic rather than uniform randomness.

A note on honesty: the randomness still comes from JavaScript (`Math.random()` seeds the random gate applications). What the quantum simulation adds is the mathematical transformation: context keywords bend the rotation angles, entanglement gates couple qubit pairs, and the dominant state of the resulting superposition becomes the character mood. The simulation is classically exact, not running on real quantum hardware.

- **64 emotional states**: a 6-qubit circuit produces 64 possible bitstrings, each mapped to a named emotional state (Openness, Shadow, Chaos, Focus, and more)
- **Contextual bias**: circuit angles are shaped by the last 5 messages, tension and strength keywords shift the quantum rotations
- **Narrative injection**: the resulting state is injected into the prompt before the LLM generates its response
- **Persistent state**: each character's quantum state persists across messages and sessions via browser localStorage
- **Fate Engine**: tracks narrative arcs and fires Judgement events with quantum-determined outcomes
- **Oracle**: generates plot twists using Grover search or Multiverse (Monte Carlo) mode
- **Entanglement**: synchronizes emotional states between two characters with configurable coupling force
- **Quantum Drift**: if a character has not been active for more than 30 minutes, their state drifts proportionally to the time elapsed

---

## How it works

### Architecture

```
SillyTavern (browser)              QuantumA Core (localhost:8227)
+------------------------+         +------------------------------+
|  extensions/           |         |  FastAPI server              |
|  silly-quantum/        |         |  POST /simulate              |
|                        | HTTP/   |  POST /grover                |
|  index.js              | JSON    |  GET  /status                |
|  - bias analysis       |<------->|                              |
|  - circuit builder     |         |  PyTorch/CUDA simulator      |
|  - prompt injection    |         |  GPU backend (auto)          |
|  - UI panel            |         |  up to 30 qubits             |
+------------------------+         +------------------------------+
```

On every user message, Silly Quantum:

1. Analyzes the last 5 messages for contextual keywords (tension, vulnerability, strength)
2. Computes a `contextualBias` value in the range `[-2.5, +2.5]`
3. Builds a 6-qubit circuit: random X gates + RY rotations scaled by the bias + H gates + CX entanglement pairs
4. Sends `POST /simulate` to QuantumA Core
5. Reads `bitstring_final` (the maximum-amplitude state, deterministic for a given circuit)
6. Maps the 6-bit string to one of 64 named emotional states
7. Injects the state description into the prompt via `setExtensionPrompt`

### The 64-State Map

The 6-qubit bitstring encodes the character's emotional state. The first two bits define the quadrant:

| Prefix | Quadrant | Character disposition |
|---|---|---|
| `00xxxx` | Light / Stable | Openness, clarity, warmth |
| `01xxxx` | Active / Growth | Energy, curiosity, ambition |
| `10xxxx` | Shadow / Tension | Doubt, conflict, vulnerability |
| `11xxxx` | Chaos / Edge | Instability, intensity, transformation |

The remaining 4 bits refine the specific shade within each quadrant, producing 64 distinct states.

### Quantum Circuit

```
qubit 0: [X?] [RY(bias)] [H] ──●──────────────────────
qubit 1: [X?] [RY(bias)] [H] ──X──                    
qubit 2: [X?] [RY(bias)] [H] ────────●────────────────
qubit 3: [X?] [RY(bias)] [H] ────────X──              
qubit 4: [X?] [RY(bias)] [H] ──────────────●──────────
qubit 5: [X?] [RY(bias)] [H] ──────────────X──────────
```

The X gates inject randomness (seeded from `Math.random()`), the RY angles are shaped by context, and the CX pairs create entanglement between adjacent qubit pairs. The result is a superposition whose dominant state reflects the narrative moment.

---

## Requirements

### Dependencies

| Dependency | Version | Required | Notes |
|---|---|---|---|
| [SillyTavern](https://github.com/SillyTavern/SillyTavern) | latest | Yes | The base platform |
| [QuantumA Core](https://github.com/ShinRalexis/QuantumA-Core) | v1.0.0+ | Yes | The quantum simulation backend, port 8227 |
| Docker Desktop | latest | Recommended | For running QuantumA Core |
| Python 3.11+ | 3.11+ | Alternative | If running QuantumA Core without Docker |
| CUDA-capable GPU | any | Optional | Strongly recommended for performance |

### QuantumA Core

Silly Quantum requires **QuantumA Core** as its simulation backend. QuantumA Core is a standalone FastAPI server built on PyTorch that simulates quantum circuits up to 30 qubits, with GPU acceleration via CUDA.

Install and start QuantumA Core first: [https://github.com/ShinRalexis/QuantumA-Core](https://github.com/ShinRalexis/QuantumA-Core)

Once running, the server exposes `http://127.0.0.1:8227`. Silly Quantum connects to that address automatically. No configuration needed if you use the default port.

> **CPU-only machines**: QuantumA Core runs on CPU as well. For Silly Quantum's 6-qubit circuits the simulation is fast regardless. CUDA only becomes relevant above 20+ qubits.

---

## Installation

### Step 1: Install QuantumA Core

Follow the instructions at [https://github.com/ShinRalexis/QuantumA-Core](https://github.com/ShinRalexis/QuantumA-Core) and verify it is running:

```bash
curl http://localhost:8227/status
```

Expected response: `{"status": "running", ...}`

### Step 2: Install Silly Quantum extension

**Option A: SillyTavern Extension Manager (recommended)**

1. Open SillyTavern
2. Extensions -> Install extension
3. Paste the URL: `https://github.com/ShinRalexis/Silly-Quantum`
4. Click Install

**Option B: Manual**

```powershell
cd "path\to\SillyTavern\public\scripts\extensions"
git clone https://github.com/ShinRalexis/Silly-Quantum silly-quantum
```

### Step 3: Enable

1. Reload SillyTavern
2. Extensions -> Silly Quantum -> Enable

The status indicator in the panel turns green when QuantumA Core is reachable.

---

## Configuration

| Setting | Description |
|---|---|
| Enable / Disable | Master switch for the entire extension |
| Qubit Count | 2, 3, 4, or 6 qubits (6 = full 64-state map) |
| Mood Injection | Toggle narrative injection into the prompt |
| Language | Injection language: Italian or English |
| Hardware Profile | Auto (detected from character description) or manual: Superconducting, Trapped Ion, Silicon Spin, Neutral Atom |
| Entanglement | Link two characters with configurable coupling force (0.1 to 1.0) |
| Fate Engine / Judgement | Enables narrative challenge events with quantum-determined outcomes |
| Oracle | Generates plot twists. Modes: standard, Multiverse (Monte Carlo, 16 parallel universes), Grover (quantum search) |
| Noisy Mind | Activates density matrix mode with hardware noise when the character is in a chaos state |
| Quantum Drift | Controls temporal state decay on session resume |

---

## Features

### Mood Engine

The core feature. Every AI generation fires a 6-qubit circuit simulation. The resulting bitstring maps to one of 64 named emotional states, which is injected as a system prompt fragment. The character's emotional arc evolves naturally based on the content of the conversation.

### Fate Engine

Tracks narrative tension across turns. When a challenge threshold is reached, it fires a Judgement event: a quantum-determined binary outcome (success / failure) that shapes the story. Configurable with custom keywords to tune what counts as a challenge.

### Oracle

On demand (or on a configurable auto-interval), the Oracle generates a narrative plot twist. Three modes:

- **Standard**: single simulation
- **Multiverse**: 16 parallel `monte_carlo` simulations, the most frequent outcome wins
- **Grover**: uses `POST /grover` with a target state derived from the current bias, for directed narrative search

Multiverse and Grover are mutually exclusive and auto-disable each other in the UI.

### Entanglement

Synchronizes the emotional state of two characters. The `entanglementForce` (0.1 to 1.0) scales how strongly one character's state influences the other. Natural decay (-1 per turn) is not affected by this parameter.

### Quantum Drift

When a chat is reloaded after more than 30 minutes of inactivity, a silent simulation runs with a temporal bias proportional to the elapsed time (capped at 2 hours). The character "arrives" in the new session with a state that reflects the passage of time.

### Hardware Profiles

Four quantum hardware models are available, each with distinct T1/T2 coherence times and gate fidelities:

| Profile | T1 | T2 | Use case |
|---|---|---|---|
| Superconducting | 100 µs | 80 µs | Default, fast circuits |
| Trapped Ion | 1 s | 500 ms | High fidelity, long coherence |
| Silicon Spin | 1 ms | 0.1 ms | Compact, noisy |
| Neutral Atom | 1 s | 300 ms | Balanced |

With `hardwareProfileMode: "auto"`, the profile is selected by scanning the character's description for relevant keywords.

---

## Repository Structure

```
Silly-Quantum/
+-- index.js          <- main logic: circuit builder, bias analysis, mood engine, UI
+-- manifest.json     <- SillyTavern extension manifest
+-- settings.html     <- settings panel UI
+-- style.css         <- Quantum Neon visual theme
+-- README.md
+-- LICENSE
+-- Banner Silly Quantum.png
```

---

## Integration with MemPalace

Silly Quantum integrates with [Silly Tavern MemPalace Extension](https://github.com/ShinRalexis/Silly-Tavern-MemPalace-Extension) via a shared bridge (`window.__sillybridge`):

| Direction | Event | Effect |
|---|---|---|
| SQ -> MP | Chaos state (`111xxx` / `110xxx`) | +1 personal memory fragment per generation |
| SQ -> MP | Oracle twist generated | Saved to character's `lore` room automatically |
| SQ -> MP | Judgement outcome | Saved to character's `char` room automatically |
| MP -> SQ | RAG injection active | SQ reads MP bridge for cross-extension state |

The bridge is load-order independent: whichever extension initializes first creates the shared object and the second one attaches to it.

---

## License

MIT License, see [LICENSE](LICENSE)

---

## Acknowledgements

Silly Quantum is built on [QuantumA Core](https://github.com/ShinRalexis/QuantumA-Core), a classical quantum circuit simulator running on PyTorch/CUDA.

---

Author: [MetaDarko](https://github.com/ShinRalexis) · Contact: MetaDarko@pm.me

---

If you use Silly Quantum regularly, consider supporting development. It helps keep the project alive and motivates new features.

<a href="https://mempool.space/it/address/179gN4aknE1R53w2yNJpiE4sp7nDucZ1He"><img src="https://wsrv.nl/?url=files.catbox.moe/3cojtz.png&h=30" align="absmiddle" alt="Bitcoin"> 179gN4aknE1R53w2yNJpiE4sp7nDucZ1He</a>

<a href="https://liberapay.com/MetaDarko/donate"><img alt="Donate using Liberapay" src="https://liberapay.com/assets/widgets/donate.svg"></a>
