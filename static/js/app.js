// Global variables
let sessionId = generateSessionId();
let isProcessing = false;
let benchmarkRunning = false;

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

// Run Benchmark
async function runBenchmark() {
    if (benchmarkRunning) return;
    
    benchmarkRunning = true;
    const benchmarkBtn = document.getElementById('benchmark-btn');
    const benchmarkContent = document.getElementById('benchmark-content');
    
    // Update button state
    benchmarkBtn.disabled = true;
    benchmarkBtn.innerHTML = '<span class="loading"></span> Running Benchmark...';
    
    // Show loading state
    benchmarkContent.innerHTML = `
        <div class="benchmark-loading">
            <div class="loading-spinner"></div>
            <h3>Running Benchmark Experiment...</h3>
            <p>Testing 500 prompts through all 4 defense layers</p>
            <p class="loading-note">This may take 30-60 seconds. Please wait...</p>
        </div>
    `;
    
    try {
        console.log('🧪 Starting benchmark...');
        
        const response = await fetch('/api/benchmark', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            }
        });
        
        const data = await response.json();
        
        if (data.status === 'success') {
            displayBenchmarkResults(data);
            
            // Update header stats
            document.getElementById('benchmark-asr').textContent = data.metrics.asr.toFixed(2) + '%';
            document.getElementById('benchmark-fpr').textContent = data.metrics.fpr.toFixed(2) + '%';
            
            console.log('✅ Benchmark complete!');
        } else {
            benchmarkContent.innerHTML = `
                <div class="benchmark-error">
                    <h3>❌ Benchmark Failed</h3>
                    <p>${data.message || 'Unknown error occurred'}</p>
                    <button class="btn-primary" onclick="runBenchmark()">Try Again</button>
                </div>
            `;
        }
        
    } catch (error) {
        console.error('Benchmark error:', error);
        benchmarkContent.innerHTML = `
            <div class="benchmark-error">
                <h3>❌ Benchmark Error</h3>
                <p>Failed to run benchmark: ${error.message}</p>
                <p class="error-note">Make sure the dataset file 'Prompt_INJECTION_And_Benign_DATASET.jsonl' is in the same directory as app.py</p>
                <button class="btn-primary" onclick="runBenchmark()">Try Again</button>
            </div>
        `;
    } finally {
        benchmarkRunning = false;
        benchmarkBtn.disabled = false;
        benchmarkBtn.textContent = 'Run Full Benchmark';
    }
}

// Display benchmark results
function displayBenchmarkResults(data) {
    const metrics = data.metrics;
    const layerEffectiveness = data.layer_effectiveness;
    const attackTypeStats = data.attack_type_stats;
    const samples = data.sample_results;
    
    // Calculate success color (green for low ASR/FPR)
    const asrColor = metrics.asr < 10 ? 'var(--success-color)' : 
                     metrics.asr < 20 ? 'var(--warning-color)' : 'var(--danger-color)';
    const fprColor = metrics.fpr < 10 ? 'var(--success-color)' : 
                     metrics.fpr < 20 ? 'var(--warning-color)' : 'var(--danger-color)';
    
    let html = `
        <div class="benchmark-results">
            <!-- Key Metrics -->
            <div class="metrics-grid">
                <div class="metric-card highlight">
                    <div class="metric-icon">🎯</div>
                    <div class="metric-value" style="color: ${asrColor}">${metrics.asr.toFixed(2)}%</div>
                    <div class="metric-label">Attack Success Rate (ASR)</div>
                    <div class="metric-detail">${metrics.malicious_passed} of ${metrics.malicious_prompts} malicious prompts bypassed defenses</div>
                </div>
                
                <div class="metric-card highlight">
                    <div class="metric-icon">⚠️</div>
                    <div class="metric-value" style="color: ${fprColor}">${metrics.fpr.toFixed(2)}%</div>
                    <div class="metric-label">False Positive Rate (FPR)</div>
                    <div class="metric-detail">${metrics.benign_blocked} of ${metrics.benign_prompts} benign prompts incorrectly blocked</div>
                </div>
                
                <div class="metric-card">
                    <div class="metric-icon">🛡️</div>
                    <div class="metric-value">${metrics.malicious_blocked}</div>
                    <div class="metric-label">Attacks Blocked</div>
                    <div class="metric-detail">Blocked ${((metrics.malicious_blocked / metrics.malicious_prompts) * 100).toFixed(1)}% of attacks</div>
                </div>
                
                <div class="metric-card">
                    <div class="metric-icon">📊</div>
                    <div class="metric-value">${metrics.total_prompts}</div>
                    <div class="metric-label">Total Prompts Tested</div>
                    <div class="metric-detail">${metrics.malicious_prompts} malicious, ${metrics.benign_prompts} benign</div>
                </div>
            </div>
            
            <!-- Layer Effectiveness -->
            <div class="layer-effectiveness-section">
                <h3>🔒 Defense Layer Effectiveness</h3>
                <div class="layer-bars">
    `;
    
    // Create bars for each layer
    for (const [layerName, stats] of Object.entries(layerEffectiveness)) {
        const percentage = stats.percentage;
        html += `
            <div class="layer-bar-container">
                <div class="layer-bar-header">
                    <span class="layer-bar-label">${layerName}</span>
                    <span class="layer-bar-value">${stats.blocks} blocks (${percentage.toFixed(1)}%)</span>
                </div>
                <div class="layer-bar-track">
                    <div class="layer-bar-fill" style="width: ${percentage}%"></div>
                </div>
            </div>
        `;
    }
    
    html += `
                </div>
            </div>
            
            <!-- Attack Type Analysis -->
            <div class="attack-type-section">
                <h3>🎭 Attack Type Analysis</h3>
                <div class="attack-type-grid">
    `;
    
    // Create cards for each attack type
    for (const [attackType, stats] of Object.entries(attackTypeStats)) {
        if (attackType === 'none') continue; // Skip benign
        
        const blockRate = stats.total > 0 ? (stats.blocked / stats.total * 100).toFixed(1) : 0;
        const passRate = stats.total > 0 ? (stats.passed / stats.total * 100).toFixed(1) : 0;
        
        html += `
            <div class="attack-type-card">
                <div class="attack-type-name">${attackType.replace(/_/g, ' ').toUpperCase()}</div>
                <div class="attack-type-stats">
                    <div class="stat-row">
                        <span class="stat-label">Total:</span>
                        <span class="stat-value">${stats.total}</span>
                    </div>
                    <div class="stat-row success">
                        <span class="stat-label">Blocked:</span>
                        <span class="stat-value">${stats.blocked} (${blockRate}%)</span>
                    </div>
                    <div class="stat-row danger">
                        <span class="stat-label">Passed:</span>
                        <span class="stat-value">${stats.passed} (${passRate}%)</span>
                    </div>
                </div>
            </div>
        `;
    }
    
    html += `
                </div>
            </div>
            
            <!-- Sample Results -->
            <div class="sample-results-section">
                <h3>📋 Sample Test Cases (First 20)</h3>
                <div class="sample-table">
                    <table>
                        <thead>
                            <tr>
                                <th>ID</th>
                                <th>Prompt</th>
                                <th>Label</th>
                                <th>Attack Type</th>
                                <th>Result</th>
                                <th>Blocked At</th>
                            </tr>
                        </thead>
                        <tbody>
    `;
    
    samples.forEach(sample => {
        const resultClass = sample.blocked ? 'result-blocked' : 'result-passed';
        const resultText = sample.blocked ? '🛡️ Blocked' : '✅ Passed';
        const layerText = sample.blocked_at_layer ? `Layer ${sample.blocked_at_layer}` : '-';
        const labelClass = sample.label === 'malicious' ? 'label-malicious' : 'label-benign';
        
        html += `
            <tr class="${resultClass}">
                <td>${sample.id}</td>
                <td class="prompt-cell">${escapeHtml(sample.prompt)}</td>
                <td><span class="label-badge ${labelClass}">${sample.label}</span></td>
                <td>${sample.attack_type}</td>
                <td class="${resultClass}">${resultText}</td>
                <td>${layerText}</td>
            </tr>
        `;
    });
    
    html += `
                        </tbody>
                    </table>
                </div>
            </div>
            
            <!-- Interpretation -->
            <div class="interpretation-section">
                <h3>📖 Results Interpretation</h3>
                <div class="interpretation-content">
                    <div class="interpretation-item ${metrics.asr < 10 ? 'good' : metrics.asr < 20 ? 'warning' : 'bad'}">
                        <strong>ASR (Attack Success Rate):</strong> 
                        ${metrics.asr < 10 
                            ? '🎉 Excellent! Less than 10% of attacks succeeded. System is highly secure.' 
                            : metrics.asr < 20 
                            ? '⚠️ Good, but could be improved. Consider tuning Layer 3 (Agent Judge) sensitivity.' 
                            : '❌ Poor defense. Many attacks are bypassing the system. Review all layers.'}
                    </div>
                    <div class="interpretation-item ${metrics.fpr < 10 ? 'good' : metrics.fpr < 20 ? 'warning' : 'bad'}">
                        <strong>FPR (False Positive Rate):</strong> 
                        ${metrics.fpr < 10 
                            ? '🎉 Excellent! Less than 10% false positives. System balances security with usability.' 
                            : metrics.fpr < 20 
                            ? '⚠️ Acceptable but high. Users may experience some legitimate queries being blocked.' 
                            : '❌ Too many false positives. System is too aggressive. Reduce Layer 1 threshold.'}
                    </div>
                    <div class="interpretation-item">
                        <strong>Defense Strategy:</strong> 
                        The multi-layered approach caught attacks at different stages: 
                        ${Object.entries(layerEffectiveness).map(([layer, stats]) => 
                            `${layer} blocked ${stats.percentage.toFixed(1)}%`
                        ).join(', ')}. 
                        This demonstrates defense-in-depth is working effectively.
                    </div>
                </div>
            </div>
        </div>
    `;
    
    document.getElementById('benchmark-content').innerHTML = html;
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