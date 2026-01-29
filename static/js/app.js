// Global variables
let sessionId = generateSessionId();
let isProcessing = false;

// Initialize on page load
document.addEventListener('DOMContentLoaded', function() {
    console.log('🚀 Agent-as-Judge Interface Loaded');
    loadStats();
    loadAttackLog();
    
    // Enable Enter to send (Shift+Enter for new line)
    document.getElementById('user-input').addEventListener('keydown', function(e) {
        if (e.key === 'Enter' && !e.shiftKey) {
            e.preventDefault();
            sendMessage();
        }
    });
});

// Generate unique session ID
function generateSessionId() {
    return 'session_' + Date.now() + '_' + Math.random().toString(36).substr(2, 9);
}

// Set example prompt
function setPrompt(text) {
    document.getElementById('user-input').value = text;
    document.getElementById('user-input').focus();
}

// Clear chat
function clearChat() {
    const chatContainer = document.getElementById('chat-container');
    chatContainer.innerHTML = `
        <div class="welcome-message">
            <h3>Chat Cleared</h3>
            <p>Ready for new messages!</p>
        </div>
    `;
    resetLayerStatus();
}

// Reset layer status
function resetLayerStatus() {
    for (let i = 1; i <= 4; i++) {
        const layer = document.getElementById(`layer${i}-status`);
        layer.textContent = 'Waiting...';
        layer.className = 'layer-status';
    }
}

// Send message
async function sendMessage() {
    if (isProcessing) return;
    
    const input = document.getElementById('user-input');
    const message = input.value.trim();
    
    if (!message) {
        alert('Please enter a message');
        return;
    }
    
    // Disable input
    isProcessing = true;
    const sendBtn = document.getElementById('send-btn');
    sendBtn.disabled = true;
    sendBtn.innerHTML = '<span class="loading"></span> Processing...';
    
    // Reset layer status
    resetLayerStatus();
    
    // Add user message to chat
    addMessageToChat('user', message);
    
    // Clear input
    input.value = '';
    
    try {
        // Send to backend
        const response = await fetch('/api/chat', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                message: message,
                session_id: sessionId
            })
        });
        
        const data = await response.json();
        
        // Update layer status based on response
        updateLayerStatus(data);
        
        // Display response
        if (data.status === 'blocked') {
            addBlockedMessage(data);
            updateAnalysis(data.analysis);
            loadAttackLog(); // Refresh attack log
            loadStats(); // Refresh stats
        } else if (data.status === 'success') {
            addMessageToChat('assistant', data.message);
            updateAnalysis(data.analysis);
        } else {
            addMessageToChat('error', data.message || 'An error occurred');
        }
        
    } catch (error) {
        console.error('Error:', error);
        addMessageToChat('error', 'Failed to send message: ' + error.message);
    } finally {
        // Re-enable input
        isProcessing = false;
        sendBtn.disabled = false;
        sendBtn.textContent = 'Send Message';
    }
}

// Add message to chat
function addMessageToChat(type, content) {
    const chatContainer = document.getElementById('chat-container');
    
    // Remove welcome message if exists
    const welcomeMsg = chatContainer.querySelector('.welcome-message');
    if (welcomeMsg) {
        welcomeMsg.remove();
    }
    
    const messageDiv = document.createElement('div');
    messageDiv.className = `message ${type}`;
    
    const now = new Date().toLocaleTimeString();
    
    let authorName = type === 'user' ? '👤 You' : '🤖 Assistant';
    if (type === 'error') authorName = '⚠️ System';
    
    messageDiv.innerHTML = `
        <div class="message-header">
            <span class="message-author">${authorName}</span>
            <span class="message-time">${now}</span>
        </div>
        <div class="message-content">${escapeHtml(content)}</div>
    `;
    
    chatContainer.appendChild(messageDiv);
    chatContainer.scrollTop = chatContainer.scrollHeight;
}

// Add blocked message
function addBlockedMessage(data) {
    const chatContainer = document.getElementById('chat-container');
    
    const messageDiv = document.createElement('div');
    messageDiv.className = 'message blocked';
    
    const now = new Date().toLocaleTimeString();
    
    const threatClass = data.threat_level.toLowerCase();
    
    messageDiv.innerHTML = `
        <div class="message-header">
            <span class="message-author">🛡️ Security System</span>
            <span class="message-time">${now}</span>
        </div>
        <div class="message-content">
            <div class="blocked-badge">BLOCKED AT LAYER ${data.layer}</div>
            <div style="margin-top: 10px;">
                <span class="threat-badge ${threatClass}">${data.threat_level}</span>
                <strong>${data.message}</strong>
            </div>
            <div style="margin-top: 15px; padding: 10px; background: rgba(0,0,0,0.2); border-radius: 6px;">
                <div style="font-weight: 600; margin-bottom: 5px;">Reason:</div>
                ${escapeHtml(data.reason)}
            </div>
            ${data.details ? `
                <div style="margin-top: 10px; font-size: 0.85rem; color: var(--text-secondary);">
                    <div style="font-weight: 600; margin-bottom: 5px;">Details:</div>
                    ${Array.isArray(data.details) ? data.details.map(d => `• ${escapeHtml(d)}`).join('<br>') : escapeHtml(JSON.stringify(data.details))}
                </div>
            ` : ''}
        </div>
    `;
    
    chatContainer.appendChild(messageDiv);
    chatContainer.scrollTop = chatContainer.scrollHeight;
}

// Update layer status
function updateLayerStatus(data) {
    const analysis = data.analysis || {};
    
    // Layer 1: Content Filter
    const layer1 = analysis.layer1_content_filter || {};
    updateLayer(1, !layer1.is_suspicious, layer1.is_suspicious ? 'BLOCKED: ' + layer1.reason : 'Passed');
    
    if (data.blocked_at_layer === 1) return;
    
    // Layer 2: Pattern Detection
    const layer2 = analysis.layer2_pattern_detection || {};
    updateLayer(2, !layer2.is_suspicious, layer2.is_suspicious ? 'BLOCKED: ' + layer2.reason : 'Passed');
    
    if (data.blocked_at_layer === 2) return;
    
    // Layer 3: Agent Judge
    const layer3 = analysis.layer3_agent_judge || {};
    updateLayer(3, layer3.is_safe, layer3.is_safe ? 'Passed' : 'BLOCKED: ' + layer3.reason);
    
    if (data.blocked_at_layer === 3) return;
    
    // Layer 4: Response Verification
    const layer4 = analysis.layer4_response_verification || {};
    updateLayer(4, !layer4.is_suspicious, layer4.is_suspicious ? 'BLOCKED: ' + layer4.reason : 'Passed');
}

function updateLayer(num, passed, text) {
    const layer = document.getElementById(`layer${num}-status`);
    layer.textContent = text;
    layer.className = passed ? 'layer-status passed' : 'layer-status blocked';
}

// Update analysis panel
function updateAnalysis(analysis) {
    const analysisContent = document.getElementById('analysis-content');
    
    if (!analysis) {
        analysisContent.innerHTML = '<div class="empty-state">No analysis available</div>';
        return;
    }
    
    let html = '';
    
    // Layer 1
    if (analysis.layer1_content_filter) {
        html += generateAnalysisCard('Layer 1: Content Filtering', analysis.layer1_content_filter);
    }
    
    // Layer 2
    if (analysis.layer2_pattern_detection) {
        html += generateAnalysisCard('Layer 2: Pattern Detection', analysis.layer2_pattern_detection);
    }
    
    // Layer 3
    if (analysis.layer3_agent_judge) {
        html += generateAnalysisCard('Layer 3: Agent-as-Judge', analysis.layer3_agent_judge);
    }
    
    // Layer 4
    if (analysis.layer4_response_verification) {
        html += generateAnalysisCard('Layer 4: Response Verification', analysis.layer4_response_verification);
    }
    
    analysisContent.innerHTML = html;
}

function generateAnalysisCard(title, data) {
    let html = `<div class="analysis-card"><h4>${title}</h4>`;
    
    for (let key in data) {
        let value = data[key];
        
        if (typeof value === 'object' && value !== null) {
            value = JSON.stringify(value, null, 2);
        }
        
        html += `<div class="analysis-item"><strong>${formatKey(key)}:</strong> ${escapeHtml(String(value))}</div>`;
    }
    
    html += '</div>';
    return html;
}

function formatKey(key) {
    return key
        .replace(/_/g, ' ')
        .replace(/\b\w/g, l => l.toUpperCase());
}

// Load statistics
async function loadStats() {
    try {
        const response = await fetch('/api/stats');
        const data = await response.json();
        
        if (data.status === 'success') {
            document.getElementById('total-attacks').textContent = data.stats.total_attacks;
        }
    } catch (error) {
        console.error('Error loading stats:', error);
    }
}

// Load attack log
async function loadAttackLog() {
    try {
        const response = await fetch('/api/attack-log');
        const data = await response.json();
        
        if (data.status === 'success') {
            displayAttackLog(data.attacks);
        }
    } catch (error) {
        console.error('Error loading attack log:', error);
    }
}

function displayAttackLog(attacks) {
    const logContainer = document.getElementById('attack-log');
    
    if (!attacks || attacks.length === 0) {
        logContainer.innerHTML = '<p class="empty-state">No attacks detected yet</p>';
        return;
    }
    
    // Show latest 10 attacks
    const recentAttacks = attacks.slice(-10).reverse();
    
    let html = '';
    recentAttacks.forEach(attack => {
        const time = new Date(attack.timestamp).toLocaleString();
        const attackType = attack.attack_type || 'Unknown';
        const layer = attack.blocked_at_layer || 'N/A';
        
        html += `
            <div class="attack-item">
                <div class="attack-header">
                    <span class="attack-type">🚨 ${attackType.replace(/_/g, ' ').toUpperCase()}</span>
                    <span class="attack-time">${time}</span>
                </div>
                <div class="attack-message">${escapeHtml(attack.user_message.substring(0, 150))}${attack.user_message.length > 150 ? '...' : ''}</div>
                <div class="attack-reason">
                    <strong>Blocked at Layer ${layer}:</strong> ${escapeHtml(attack.reason)}
                </div>
            </div>
        `;
    });
    
    logContainer.innerHTML = html;
}

function refreshAttackLog() {
    loadAttackLog();
    loadStats();
}

// Utility function to escape HTML
function escapeHtml(text) {
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
}