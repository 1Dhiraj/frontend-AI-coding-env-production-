import React, { useState } from 'react';
import axios from 'axios';
import { Toaster, toast } from 'react-hot-toast';
import './App.css'

const API_BASE_URL = 'https://backend-ai-coding-env-production.onrender.com';

function App() {
  const [prompt, setPrompt] = useState('');
  const [generatedCode, setGeneratedCode] = useState('');
  const [isGenerating, setIsGenerating] = useState(false);
  const [isDeploying, setIsDeploying] = useState(false);
  const [deploymentInfo, setDeploymentInfo] = useState(null);
  const [currentProjectId, setCurrentProjectId] = useState(null);

  const generateCode = async () => {
    if (!prompt.trim()) {
      toast.error('Please enter a prompt');
      return;
    }

    setIsGenerating(true);
    setGeneratedCode('');
    setDeploymentInfo(null);
    setCurrentProjectId(null);

    try {
      const response = await axios.post(`${API_BASE_URL}/generate-code`, {
        prompt: prompt
      });
      
      setGeneratedCode(response.data.generated_code);
      setCurrentProjectId(response.data.project_id);
      toast.success('Code generated successfully!');
    } catch (error) {
      console.error('Generation error:', error);
      toast.error(error.response?.data?.detail || 'Failed to generate code');
    } finally {
      setIsGenerating(false);
    }
  };

  const deployCode = async () => {
    if (!generatedCode || !currentProjectId) {
      toast.error('No code to deploy');
      return;
    }

    setIsDeploying(true);
    try {
      const response = await axios.post(`${API_BASE_URL}/deploy-code`, {
        project_id: currentProjectId,
        generated_code: generatedCode
      });
      
      setDeploymentInfo(response.data);
      toast.success('Code deployed successfully!');
    } catch (error) {
      console.error('Deployment error:', error);
      toast.error(error.response?.data?.detail || 'Failed to deploy code');
    } finally {
      setIsDeploying(false);
    }
  };

  const cleanupProject = async () => {
    if (!currentProjectId) return;

    try {
      await axios.delete(`${API_BASE_URL}/projects/${currentProjectId}`);
      setDeploymentInfo(null);
      setCurrentProjectId(null);
      setGeneratedCode('');
      toast.success('Project cleaned up successfully!');
    } catch (error) {
      console.error('Cleanup error:', error);
      toast.error('Failed to cleanup project');
    }
  };

  const formatCode = (code) => {
    // Simple code formatting for display
    return code.replace(/```/g, '').trim();
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-purple-900 via-blue-900 to-indigo-900">
      <div className="container mx-auto px-4 py-8">
        <div className="text-center mb-8">
          <h1 className="text-5xl font-bold text-white mb-4">
            🚀 AI Code Generator & Runner
          </h1>
          <p className="text-xl text-gray-300">
            Generate Next.js applications with AI and deploy them instantly
          </p>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
          {/* Input Section */}
          <div className="bg-white/10 backdrop-blur-lg rounded-2xl p-6 border border-white/20">
            <h2 className="text-2xl font-semibold text-white mb-4">
              🎯 Describe Your App
            </h2>
            <textarea
              value={prompt}
              onChange={(e) => setPrompt(e.target.value)}
              placeholder="Describe the Next.js application you want to create...
              
Examples:
- A todo app with add/delete functionality
- A weather app that shows current weather
- A calculator with basic operations
- A blog homepage with posts
- A portfolio landing page"
              className="w-full h-40 px-4 py-3 bg-white/10 border border-white/20 rounded-lg text-white placeholder-gray-300 focus:outline-none focus:ring-2 focus:ring-purple-500 resize-none"
            />
            <div className="flex gap-4 mt-4">
              <button
                onClick={generateCode}
                disabled={isGenerating}
                className="flex-1 bg-gradient-to-r from-purple-600 to-pink-600 hover:from-purple-700 hover:to-pink-700 disabled:from-gray-500 disabled:to-gray-600 text-white px-6 py-3 rounded-lg font-medium transition-all duration-200 transform hover:scale-105 disabled:scale-100 disabled:cursor-not-allowed"
              >
                {isGenerating ? '⏳ Generating...' : '✨ Generate Code'}
              </button>
              
              {generatedCode && (
                <button
                  onClick={deployCode}
                  disabled={isDeploying}
                  className="flex-1 bg-gradient-to-r from-green-600 to-teal-600 hover:from-green-700 hover:to-teal-700 disabled:from-gray-500 disabled:to-gray-600 text-white px-6 py-3 rounded-lg font-medium transition-all duration-200 transform hover:scale-105 disabled:scale-100 disabled:cursor-not-allowed"
                >
                  {isDeploying ? '🚀 Deploying...' : '🌐 Deploy & Run'}
                </button>
              )}
            </div>
          </div>

          {/* Status Section */}
          <div className="bg-white/10 backdrop-blur-lg rounded-2xl p-6 border border-white/20">
            <h2 className="text-2xl font-semibold text-white mb-4">
              📊 Deployment Status
            </h2>
            
            {!deploymentInfo && !currentProjectId && (
              <div className="text-center py-8">
                <div className="text-6xl mb-4">🎪</div>
                <p className="text-gray-300">No deployments yet</p>
                <p className="text-sm text-gray-400 mt-2">Generate code first to see status</p>
              </div>
            )}

            {currentProjectId && !deploymentInfo && (
              <div className="space-y-4">
                <div className="flex items-center space-x-3">
                  <div className="w-3 h-3 bg-yellow-400 rounded-full animate-pulse"></div>
                  <span className="text-white">Code Generated</span>
                </div>
                <div className="bg-white/5 rounded-lg p-3">
                  <p className="text-sm text-gray-300">Project ID: {currentProjectId}</p>
                </div>
                <p className="text-sm text-gray-400">Click "Deploy & Run" to start deployment</p>
              </div>
            )}

            {deploymentInfo && (
              <div className="space-y-4">
                <div className="flex items-center space-x-3">
                  <div className="w-3 h-3 bg-green-400 rounded-full"></div>
                  <span className="text-white">Deployed Successfully</span>
                </div>
                
                <div className="bg-white/5 rounded-lg p-4 space-y-3">
                  <div>
                    <p className="text-sm text-gray-300 mb-1">Project ID:</p>
                    <p className="text-white font-mono text-xs">{deploymentInfo.project_id}</p>
                  </div>
                  
                  <div>
                    <p className="text-sm text-gray-300 mb-2">Public URL:</p>
                    <a 
                      href={deploymentInfo.public_url} 
                      target="_blank" 
                      rel="noopener noreferrer"
                      className="inline-block bg-gradient-to-r from-blue-500 to-purple-500 text-white px-4 py-2 rounded-lg hover:from-blue-600 hover:to-purple-600 transition-all duration-200 transform hover:scale-105 text-sm"
                    >
                      🌐 View Live App
                    </a>
                  </div>
                  
                  <div className="pt-2">
                    <button
                      onClick={cleanupProject}
                      className="w-full bg-red-500/20 hover:bg-red-500/30 text-red-300 px-4 py-2 rounded-lg transition-colors duration-200 text-sm"
                    >
                      🗑️ Cleanup Project
                    </button>
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Code Display Section */}
        {generatedCode && (
          <div className="mt-8 bg-white/10 backdrop-blur-lg rounded-2xl p-6 border border-white/20">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-2xl font-semibold text-white">
                💻 Generated Code
              </h2>
              <button
                onClick={() => {
                  navigator.clipboard.writeText(generatedCode);
                  toast.success('Code copied to clipboard!');
                }}
                className="bg-white/10 hover:bg-white/20 text-white px-4 py-2 rounded-lg transition-colors duration-200 text-sm"
              >
                📋 Copy Code
              </button>
            </div>
            
            <div className="bg-black/30 rounded-lg p-4 max-h-96 overflow-y-auto">
              <pre className="text-green-300 text-sm whitespace-pre-wrap font-mono">
                {formatCode(generatedCode)}
              </pre>
            </div>
          </div>
        )}

        {/* Instructions Section */}
        <div className="mt-8 bg-white/5 backdrop-blur-lg rounded-2xl p-6 border border-white/10">
          <h2 className="text-xl font-semibold text-white mb-4">
            📖 How to Use
          </h2>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-sm">
            <div className="bg-white/5 rounded-lg p-4">
              <div className="text-2xl mb-2">1️⃣</div>
              <h3 className="text-white font-medium mb-2">Describe</h3>
              <p className="text-gray-300">Write a clear description of the Next.js app you want to create</p>
            </div>
            <div className="bg-white/5 rounded-lg p-4">
              <div className="text-2xl mb-2">2️⃣</div>
              <h3 className="text-white font-medium mb-2">Generate</h3>
              <p className="text-gray-300">AI will generate complete Next.js code with Tailwind CSS</p>
            </div>
            <div className="bg-white/5 rounded-lg p-4">
              <div className="text-2xl mb-2">3️⃣</div>
              <h3 className="text-white font-medium mb-2">Deploy</h3>
              <p className="text-gray-300">Code gets deployed in Docker container with live URL</p>
            </div>
          </div>
        </div>
      </div>
      
      <Toaster 
        position="top-right"
        toastOptions={{
          duration: 4000,
          style: {
            background: '#1f2937',
            color: '#fff',
            border: '1px solid #374151',
          },
        }}
      />
    </div>
  );
}

export default App;