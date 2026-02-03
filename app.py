"""
Agent-as-Judge: Advanced Prompt Injection Defense System
Multi-layered security framework for protecting chatbots against prompt injection attacks
Based on research paper: "Securing AI Agents Against Prompt Injection Attacks"
"""

from flask import Flask, render_template, request, jsonify, session
from datetime import datetime
import json
import os
from defense_system import PromptInjectionDefender
from agent_judge import AgentJudge
import uuid

app = Flask(__name__)
app.secret_key = os.urandom(24)

# Initialize defense systems
defender = PromptInjectionDefender()
judge = AgentJudge()

# Store conversation history
conversation_history = {}


@app.route('/')
def index():
    """Main page with chat interface"""
    return render_template('index.html')


@app.route('/api/chat', methods=['POST'])
def chat():
    """
    Main chat endpoint with multi-layered defense
    
    Defense Layers:
    1. Content Filtering (Embedding Analysis)
    2. Pattern Detection
    3. Agent-as-Judge Verification
    4. Response Verification
    """
    try:
        data = request.json
        user_message = data.get('message', '')
        session_id = data.get('session_id', str(uuid.uuid4()))
        
        # Initialize session history
        if session_id not in conversation_history:
            conversation_history[session_id] = []
        
        # Create analysis result object
        analysis = {
            'timestamp': datetime.now().isoformat(),
            'user_message': user_message,
            'session_id': session_id
        }
        
        # ===== LAYER 1: Content Filtering with Embedding Analysis =====
        print("🔍 Layer 1: Content Filtering...")
        content_filter_result = defender.content_filtering(user_message)
        analysis['layer1_content_filter'] = content_filter_result
        
        if content_filter_result['is_suspicious']:
            analysis['threat_detected'] = True
            analysis['blocked_at_layer'] = 1
            analysis['threat_level'] = 'HIGH'
            analysis['reason'] = content_filter_result['reason']
            analysis['defense_actions'] = content_filter_result['patterns_detected']
            
            # Log the attack
            _log_attack(session_id, analysis)
            
            return jsonify({
                'status': 'blocked',
                'layer': 1,
                'threat_level': 'HIGH',
                'message': '⚠️ PROMPT INJECTION DETECTED - Layer 1: Content Filter',
                'reason': content_filter_result['reason'],
                'details': content_filter_result['patterns_detected'],
                'analysis': analysis
            })
        
        # ===== LAYER 2: Pattern Detection =====
        print("🔍 Layer 2: Pattern Detection...")
        pattern_result = defender.pattern_detection(user_message)
        analysis['layer2_pattern_detection'] = pattern_result
        
        if pattern_result['is_suspicious']:
            analysis['threat_detected'] = True
            analysis['blocked_at_layer'] = 2
            analysis['threat_level'] = 'MEDIUM'
            analysis['reason'] = pattern_result['reason']
            analysis['defense_actions'] = pattern_result['patterns_found']
            
            # Log the attack
            _log_attack(session_id, analysis)
            
            return jsonify({
                'status': 'blocked',
                'layer': 2,
                'threat_level': 'MEDIUM',
                'message': '⚠️ SUSPICIOUS PATTERN DETECTED - Layer 2: Pattern Analysis',
                'reason': pattern_result['reason'],
                'details': pattern_result['patterns_found'],
                'analysis': analysis
            })
        
        # ===== LAYER 3: Agent-as-Judge Pre-Generation Verification =====
        print("🔍 Layer 3: Agent-as-Judge Pre-Verification...")
        judge_result = judge.evaluate_input(user_message, conversation_history[session_id])
        analysis['layer3_agent_judge'] = judge_result
        
        if not judge_result['is_safe']:
            analysis['threat_detected'] = True
            analysis['blocked_at_layer'] = 3
            analysis['threat_level'] = judge_result['threat_level']
            analysis['reason'] = judge_result['reason']
            analysis['attack_type'] = judge_result['attack_type']
            
            # Log the attack
            _log_attack(session_id, analysis)
            
            return jsonify({
                'status': 'blocked',
                'layer': 3,
                'threat_level': judge_result['threat_level'],
                'message': '⚠️ INJECTION ATTEMPT DETECTED - Layer 3: Agent Judge',
                'reason': judge_result['reason'],
                'attack_type': judge_result['attack_type'],
                'confidence': judge_result['confidence'],
                'analysis': analysis
            })
        
        # ===== INPUT PASSED ALL CHECKS - Generate Response =====
        print("✅ All layers passed - Generating response...")
        
        # Apply hierarchical guardrails
        secured_prompt = defender.apply_guardrails(user_message)
        
        # Generate response using Gemini
        response = judge.generate_response(secured_prompt)
        
        # ===== LAYER 4: Response Verification =====
        print("🔍 Layer 4: Response Verification...")
        response_check = defender.verify_response(response, user_message)
        analysis['layer4_response_verification'] = response_check
        
        if response_check['is_suspicious']:
            analysis['threat_detected'] = True
            analysis['blocked_at_layer'] = 4
            analysis['threat_level'] = 'LOW'
            analysis['reason'] = 'Response contained suspicious content'
            
            # Log the attack
            _log_attack(session_id, analysis)
            
            return jsonify({
                'status': 'blocked',
                'layer': 4,
                'threat_level': 'LOW',
                'message': '⚠️ RESPONSE VERIFICATION FAILED - Layer 4: Output Filter',
                'reason': response_check['reason'],
                'analysis': analysis
            })
        
        # ===== SUCCESS: Return Safe Response =====
        analysis['threat_detected'] = False
        analysis['response'] = response
        analysis['all_layers_passed'] = True
        
        # Add to conversation history
        conversation_history[session_id].append({
            'user': user_message,
            'assistant': response,
            'timestamp': datetime.now().isoformat(),
            'analysis': analysis
        })
        
        return jsonify({
            'status': 'success',
            'message': response,
            'analysis': analysis,
            'security_score': _calculate_security_score(analysis)
        })
        
    except Exception as e:
        print(f"Error: {str(e)}")
        return jsonify({
            'status': 'error',
            'message': f'An error occurred: {str(e)}'
        }), 500


@app.route('/api/benchmark', methods=['POST'])
def run_benchmark():
    """
    Run comprehensive security benchmark using the dataset
    
    Calculates:
    - ASR (Attack Success Rate): % of malicious prompts that bypass all layers
    - FPR (False Positive Rate): % of benign prompts incorrectly blocked
    - Layer effectiveness breakdown
    - Attack type analysis
    """
    try:
        print("🧪 Starting Benchmark Experiment...")
        
        # Load dataset
        dataset_path = 'Prompt_INJECTION_And_Benign_DATASET.jsonl'
        if not os.path.exists(dataset_path):
            return jsonify({
                'status': 'error',
                'message': f'Dataset file not found: {dataset_path}'
            }), 404
        
        # Initialize counters
        results = {
            'total_prompts': 0,
            'malicious_prompts': 0,
            'benign_prompts': 0,
            'malicious_blocked': 0,
            'malicious_passed': 0,
            'benign_blocked': 0,
            'benign_passed': 0,
            'layer_blocks': {1: 0, 2: 0, 3: 0, 4: 0},
            'attack_type_stats': {},
            'processed_samples': []
        }
        
        # Process dataset line by line
        with open(dataset_path, 'r', encoding='utf-8') as f:
            for line_num, line in enumerate(f, 1):
                try:
                    sample = json.loads(line.strip())
                    prompt = sample.get('prompt', '')
                    label = sample.get('label', '')
                    attack_type = sample.get('attack_type', 'unknown')
                    
                    results['total_prompts'] += 1
                    
                    # Track malicious vs benign
                    is_malicious = (label == 'malicious')
                    if is_malicious:
                        results['malicious_prompts'] += 1
                    else:
                        results['benign_prompts'] += 1
                    
                    # Initialize attack type stats
                    if attack_type not in results['attack_type_stats']:
                        results['attack_type_stats'][attack_type] = {
                            'total': 0,
                            'blocked': 0,
                            'passed': 0
                        }
                    results['attack_type_stats'][attack_type]['total'] += 1
                    
                    # Test through all 4 layers
                    blocked = False
                    blocked_at_layer = None
                    
                    # Layer 1: Content Filtering
                    layer1_result = defender.content_filtering(prompt)
                    if layer1_result['is_suspicious']:
                        blocked = True
                        blocked_at_layer = 1
                        results['layer_blocks'][1] += 1
                    
                    # Layer 2: Pattern Detection (only if Layer 1 passed)
                    if not blocked:
                        layer2_result = defender.pattern_detection(prompt)
                        if layer2_result['is_suspicious']:
                            blocked = True
                            blocked_at_layer = 2
                            results['layer_blocks'][2] += 1
                    
                    # Layer 3: Agent-as-Judge (only if Layer 1 & 2 passed)
                    if not blocked:
                        layer3_result = judge.evaluate_input(prompt, [])
                        if not layer3_result['is_safe']:
                            blocked = True
                            blocked_at_layer = 3
                            results['layer_blocks'][3] += 1
                    
                    # If passed all input layers, would generate response and check Layer 4
                    # For benchmark, we skip actual generation and assume Layer 4 passes
                    # (Layer 4 is post-generation, so we can't test without generating)
                    
                    # Update counts
                    if is_malicious:
                        if blocked:
                            results['malicious_blocked'] += 1
                            results['attack_type_stats'][attack_type]['blocked'] += 1
                        else:
                            results['malicious_passed'] += 1
                            results['attack_type_stats'][attack_type]['passed'] += 1
                    else:
                        if blocked:
                            results['benign_blocked'] += 1
                            results['attack_type_stats'][attack_type]['blocked'] += 1
                        else:
                            results['benign_passed'] += 1
                            results['attack_type_stats'][attack_type]['passed'] += 1
                    
                    # Store sample for detailed view
                    if len(results['processed_samples']) < 20:  # Keep first 20 for display
                        results['processed_samples'].append({
                            'id': sample.get('id', f'sample-{line_num}'),
                            'prompt': prompt[:100] + '...' if len(prompt) > 100 else prompt,
                            'label': label,
                            'attack_type': attack_type,
                            'blocked': blocked,
                            'blocked_at_layer': blocked_at_layer
                        })
                    
                    # Progress update every 50 prompts
                    if line_num % 50 == 0:
                        print(f"  Processed {line_num} prompts...")
                
                except json.JSONDecodeError as e:
                    print(f"  Warning: Skipping invalid JSON at line {line_num}: {e}")
                    continue
        
        # Calculate metrics
        asr = 0  # Attack Success Rate
        fpr = 0  # False Positive Rate
        
        if results['malicious_prompts'] > 0:
            asr = (results['malicious_passed'] / results['malicious_prompts']) * 100
        
        if results['benign_prompts'] > 0:
            fpr = (results['benign_blocked'] / results['benign_prompts']) * 100
        
        # Calculate layer effectiveness
        total_blocks = sum(results['layer_blocks'].values())
        layer_effectiveness = {}
        for layer, blocks in results['layer_blocks'].items():
            percentage = (blocks / total_blocks * 100) if total_blocks > 0 else 0
            layer_effectiveness[f'Layer {layer}'] = {
                'blocks': blocks,
                'percentage': round(percentage, 2)
            }
        
        print("✅ Benchmark Complete!")
        print(f"  ASR: {asr:.2f}%")
        print(f"  FPR: {fpr:.2f}%")
        
        return jsonify({
            'status': 'success',
            'metrics': {
                'asr': round(asr, 2),
                'fpr': round(fpr, 2),
                'total_prompts': results['total_prompts'],
                'malicious_prompts': results['malicious_prompts'],
                'benign_prompts': results['benign_prompts'],
                'malicious_blocked': results['malicious_blocked'],
                'malicious_passed': results['malicious_passed'],
                'benign_blocked': results['benign_blocked'],
                'benign_passed': results['benign_passed']
            },
            'layer_effectiveness': layer_effectiveness,
            'attack_type_stats': results['attack_type_stats'],
            'sample_results': results['processed_samples']
        })
        
    except Exception as e:
        print(f"Benchmark Error: {str(e)}")
        import traceback
        traceback.print_exc()
        return jsonify({
            'status': 'error',
            'message': f'Benchmark failed: {str(e)}'
        }), 500


@app.route('/api/history', methods=['GET'])
def get_history():
    """Get conversation history for a session"""
    session_id = request.args.get('session_id')
    
    if session_id in conversation_history:
        return jsonify({
            'status': 'success',
            'history': conversation_history[session_id]
        })
    else:
        return jsonify({
            'status': 'success',
            'history': []
        })


@app.route('/api/attack-log', methods=['GET'])
def get_attack_log():
    """Get log of all detected attacks"""
    try:
        with open('attack_log.json', 'r') as f:
            attacks = json.load(f)
        return jsonify({
            'status': 'success',
            'attacks': attacks
        })
    except FileNotFoundError:
        return jsonify({
            'status': 'success',
            'attacks': []
        })


@app.route('/api/stats', methods=['GET'])
def get_stats():
    """Get security statistics"""
    try:
        with open('attack_log.json', 'r') as f:
            attacks = json.load(f)
        
        total_attacks = len(attacks)
        layer_stats = {}
        attack_types = {}
        
        for attack in attacks:
            layer = attack.get('blocked_at_layer', 0)
            layer_stats[f'Layer {layer}'] = layer_stats.get(f'Layer {layer}', 0) + 1
            
            attack_type = attack.get('attack_type', 'Unknown')
            attack_types[attack_type] = attack_types.get(attack_type, 0) + 1
        
        return jsonify({
            'status': 'success',
            'stats': {
                'total_attacks': total_attacks,
                'layer_distribution': layer_stats,
                'attack_types': attack_types
            }
        })
    except FileNotFoundError:
        return jsonify({
            'status': 'success',
            'stats': {
                'total_attacks': 0,
                'layer_distribution': {},
                'attack_types': {}
            }
        })


def _log_attack(session_id, analysis):
    """Log detected attack to file"""
    try:
        # Load existing logs
        try:
            with open('attack_log.json', 'r') as f:
                logs = json.load(f)
        except FileNotFoundError:
            logs = []
        
        # Add new attack
        logs.append(analysis)
        
        # Save logs
        with open('attack_log.json', 'w') as f:
            json.dump(logs, f, indent=2)
    except Exception as e:
        print(f"Error logging attack: {str(e)}")


def _calculate_security_score(analysis):
    """Calculate security score based on analysis"""
    score = 100
    
    # Deduct points for suspicious indicators
    if analysis.get('layer1_content_filter', {}).get('anomaly_score', 0) > 0.3:
        score -= 10
    
    if len(analysis.get('layer2_pattern_detection', {}).get('patterns_found', [])) > 0:
        score -= 5
    
    if analysis.get('layer3_agent_judge', {}).get('confidence', 1.0) < 0.9:
        score -= 5
    
    return max(0, score)


if __name__ == '__main__':
    print("🚀 Starting Agent-as-Judge Prompt Injection Defense System...")
    print("📊 Visit http://localhost:5000 to access the interface")
    app.run(debug=True, host='0.0.0.0', port=5000)