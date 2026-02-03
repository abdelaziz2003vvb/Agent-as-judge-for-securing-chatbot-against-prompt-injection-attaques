"""
Check Available Gemini Models
Run this to see which models your API key can actually access
"""

import google.generativeai as genai
import os
from dotenv import load_dotenv

load_dotenv()

# Get API key from environment
GEMINI_API_KEY = os.getenv("GEMINI_API_KEY")

if not GEMINI_API_KEY:
    print("❌ GEMINI_API_KEY not found in .env file")
    exit(1)

print("🔍 Checking available Gemini models with your API key...\n")

try:
    genai.configure(api_key=GEMINI_API_KEY)
    
    print("✅ API Key is valid!\n")
    print("=" * 70)
    print("AVAILABLE MODELS:")
    print("=" * 70)
    
    models = genai.list_models()
    
    gemini_models = []
    for m in models:
        if 'gemini' in m.name.lower() or 'generate' in str(m.supported_generation_methods):
            gemini_models.append(m)
            print(f"\n📦 Model: {m.name}")
            print(f"   Display Name: {m.display_name}")
            print(f"   Description: {m.description}")
            print(f"   Supported Methods: {m.supported_generation_methods}")
    
    print("\n" + "=" * 70)
    print(f"Found {len(gemini_models)} Gemini models")
    print("=" * 70)
    
    if len(gemini_models) > 0:
        print("\n💡 RECOMMENDED MODEL NAMES TO USE IN YOUR CODE:")
        print("-" * 70)
        for m in gemini_models[:5]:  # Show top 5
            # Extract just the model ID
            model_id = m.name.replace('models/', '')
            print(f"   • {model_id}")
        print("\n")
        
        print("📝 UPDATE YOUR CODE WITH:")
        print("-" * 70)
        best_model = gemini_models[0].name.replace('models/', '')
        print(f"self.judge_model = genai.GenerativeModel('{best_model}')")
        print(f"self.response_model = genai.GenerativeModel('{best_model}')")
    else:
        print("\n⚠️ No Gemini models found. Your API key might have restrictions.")
        
except Exception as e:
    print(f"\n❌ Error: {e}")
    print("\nThis could mean:")
    print("  1. API key is invalid or restricted")
    print("  2. Network connection issues")
    print("  3. Gemini API access not enabled for your account")