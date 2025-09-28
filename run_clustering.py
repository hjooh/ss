#!/usr/bin/env python3
"""
Setup and run apartment clustering analysis
"""

import subprocess
import sys
import os

def install_requirements():
    """Install required Python packages"""
    print("📦 Installing Python dependencies...")
    try:
        subprocess.check_call([sys.executable, "-m", "pip", "install", "-r", "requirements.txt"])
        print("✅ Dependencies installed successfully")
        return True
    except subprocess.CalledProcessError as e:
        print(f"❌ Failed to install dependencies: {e}")
        return False

def check_env_vars():
    """Check if required environment variables are set"""
    required_vars = ["NEXT_PUBLIC_SUPABASE_URL", "SUPABASE_SERVICE_ROLE_KEY"]
    missing_vars = []
    
    for var in required_vars:
        if not os.getenv(var):
            missing_vars.append(var)
    
    if missing_vars:
        print(f"❌ Missing environment variables: {', '.join(missing_vars)}")
        print("Please set these in your .env file or environment")
        return False
    
    print("✅ Environment variables found")
    return True

def main():
    """Main setup and run function"""
    print("🏠 Apartment Clustering Setup")
    print("=" * 40)
    
    # Check environment variables
    if not check_env_vars():
        return
    
    # Install requirements
    if not install_requirements():
        return
    
    # Run clustering analysis
    print("\n🚀 Starting clustering analysis...")
    try:
        import clustering
        clustering.main()
    except ImportError as e:
        print(f"❌ Import error: {e}")
        print("Make sure all dependencies are installed")
    except Exception as e:
        print(f"❌ Error running clustering: {e}")

if __name__ == "__main__":
    main()

