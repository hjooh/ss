'use client';

import { useState } from 'react';

interface LoginProps {
  onLogin: (username: string, password: string) => void;
  onSignup: (username: string, password: string, nickname: string) => void;
}

export const Login = ({ onLogin, onSignup }: LoginProps) => {
  const [isSignupMode, setIsSignupMode] = useState(false);
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [nickname, setNickname] = useState('');
  const [isLoading, setIsLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!username.trim() || !password.trim()) return;
    
    if (isSignupMode) {
      if (!nickname.trim()) return;
      if (password !== confirmPassword) {
        // TODO: Add error handling
        return;
      }
      setIsLoading(true);
      try {
        onSignup(username.trim(), password, nickname.trim());
      } catch (error) {
        console.error('Signup error:', error);
      } finally {
        setIsLoading(false);
      }
    } else {
      setIsLoading(true);
      try {
        onLogin(username.trim(), password);
      } catch (error) {
        console.error('Login error:', error);
      } finally {
        setIsLoading(false);
      }
    }
  };

  const toggleMode = () => {
    setIsSignupMode(!isSignupMode);
    setUsername('');
    setPassword('');
    setConfirmPassword('');
    setNickname('');
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl shadow-xl p-8 w-full max-w-md">
        <div className="text-center mb-8">
          <h1 className="text-3xl font-bold text-gray-900 mb-2">PadMatch</h1>
          <p className="text-gray-600">
            {isSignupMode ? 'Create your account' : 'Welcome back'}
          </p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-6">
          {/* Username Input */}
          <div>
            <label htmlFor="username" className="block text-sm font-medium text-gray-700 mb-2">
              Username
            </label>
            <input
              type="text"
              id="username"
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              placeholder="Enter your username"
              className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-colors text-black"
              required
            />
          </div>

          {/* Nickname Input (Signup only) */}
          {isSignupMode && (
            <div>
              <label htmlFor="nickname" className="block text-sm font-medium text-gray-700 mb-2">
                Nickname
              </label>
              <input
                type="text"
                id="nickname"
                value={nickname}
                onChange={(e) => setNickname(e.target.value)}
                placeholder="Choose a nickname"
                className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-colors text-black"
                maxLength={20}
                required={isSignupMode}
              />
            </div>
          )}

          {/* Password Input */}
          <div>
            <label htmlFor="password" className="block text-sm font-medium text-gray-700 mb-2">
              Password
            </label>
            <input
              type="password"
              id="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="Enter your password"
              className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-colors text-black"
              required
            />
          </div>

          {/* Confirm Password Input (Signup only) */}
          {isSignupMode && (
            <div>
              <label htmlFor="confirmPassword" className="block text-sm font-medium text-gray-700 mb-2">
                Confirm Password
              </label>
              <input
                type="password"
                id="confirmPassword"
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                placeholder="Confirm your password"
                className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-colors text-black"
                required={isSignupMode}
              />
              {isSignupMode && password && confirmPassword && password !== confirmPassword && (
                <p className="text-sm text-red-600 mt-1">Passwords do not match</p>
              )}
            </div>
          )}

          {/* Submit Button */}
          <button
            type="submit"
            disabled={
              isLoading ||
              !username.trim() ||
              !password.trim() ||
              (isSignupMode && (!nickname.trim() || password !== confirmPassword))
            }
            className="w-full bg-blue-600 text-white py-3 px-4 rounded-lg font-medium hover:bg-blue-700 disabled:bg-gray-300 disabled:cursor-not-allowed transition-colors"
          >
            {isLoading
              ? (isSignupMode ? 'Creating Account...' : 'Signing In...')
              : (isSignupMode ? 'Create Account' : 'Sign In')
            }
          </button>
        </form>

        {/* Toggle Mode */}
        <div className="mt-6 text-center">
          <button
            onClick={toggleMode}
            className="text-blue-600 hover:text-blue-700 text-sm font-medium transition-colors"
          >
            {isSignupMode
              ? 'Already have an account? Sign In'
              : "Don't have an account? Sign Up"
            }
          </button>
        </div>

        {/* Footer */}
        <div className="mt-8 text-center">
          <p className="text-xs text-gray-400">
            Find your perfect apartment together
          </p>
        </div>
      </div>
    </div>
  );
};
