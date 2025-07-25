import React, { useState, useEffect } from 'react';
import { Code, Play, Globe, Trash2, Copy, Check, Monitor, RefreshCw, AlertCircle, CheckCircle, Clock, ExternalLink, Eye, FileCode } from 'lucide-react';
import './App.css';

// Real axios implementation for production
const API_BASE_URL = 'https://backend-ai-coding-env-production.onrender.com';

// Toast notification component
const Toast = ({ message, type, onClose }) => (
  <div className={`fixed top-4 right-4 z-50 p-4 rounded-lg shadow-lg transition-all duration-300 transform ${
    type === 'success' ? 'bg-green-500' : type === 'error' ? 'bg-red-500' : 'bg-blue-500'
  } text-white max-w-sm`}>
    <div className="flex items-center justify-between">
      <span className="text-sm">{message}</span>
      <button onClick={onClose} className="ml-4 text-white hover:text-gray-200">×</button>
    </div>
  </div>
);

function App() {
  const [prompt, setPrompt] = useState('');
  const [generatedCode, setGeneratedCode] = useState('');
  const [isGenerating, setIsGenerating] = useState(false);
  const [isDeploying, setIsDeploying] = useState(false);
  const [deploymentInfo, setDeploymentInfo] = useState(null);
  const [currentProjectId, setCurrentProjectId] = useState(null);
  const [copied, setCopied] = useState(false);
  const [showPreview, setShowPreview] = useState(false);
  const [toast, setToast] = useState(null);
  const [projectStatus, setProjectStatus] = useState(null);
  const [statusPolling, setStatusPolling] = useState(false);
  const [viewMode, setViewMode] = useState('code'); // 'code' or 'preview'
  const [showResults, setShowResults] = useState(false);

  // Toast helper function
  const showToast = (message, type = 'success') => {
    setToast({ message, type });
    setTimeout(() => setToast(null), 4000);
  };

  // Poll project status
  useEffect(() => {
    let interval;
    if (currentProjectId && statusPolling) {
      interval = setInterval(async () => {
        try {
          const response = await fetch(`${API_BASE_URL}/projects/${currentProjectId}/status`);
          if (response.ok) {
            const status = await response.json();
            setProjectStatus(status);
            
            if (status.status === 'deployed') {
              setStatusPolling(false);
              setDeploymentInfo({
                project_id: status.project_id,
                public_url: status.public_url,
                sandbox_id: status.sandbox_id
              });
              setShowPreview(true);
              showToast('Application deployed successfully!');
            } else if (status.status === 'failed') {
              setStatusPolling(false);
              showToast(`Deployment failed: ${status.error_message || 'Unknown error'}`, 'error');
            }
          }
        } catch (error) {
          console.error('Error polling status:', error);
        }
      }, 3000);
    }

    return () => {
      if (interval) clearInterval(interval);
    };
  }, [currentProjectId, statusPolling]);

  const generateCode = async () => {
    if (!prompt.trim()) {
      showToast('Please enter a prompt', 'error');
      return;
    }

    setIsGenerating(true);
    setGeneratedCode('');
    setDeploymentInfo(null);
    setCurrentProjectId(null);
    setShowPreview(false);
    setProjectStatus(null);
    setShowResults(false);

    try {
      const response = await fetch(`${API_BASE_URL}/generate-code`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ prompt }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.detail || 'Failed to generate code');
      }

      const data = await response.json();
      setGeneratedCode(data.generated_code);
      setCurrentProjectId(data.project_id);
      
      // Trigger smooth animation
      setTimeout(() => {
        setShowResults(true);
      }, 100);
      
      showToast('Code generated successfully!');
    } catch (error) {
      console.error('Generation error:', error);
      showToast(error.message || 'Failed to generate code', 'error');
    } finally {
      setIsGenerating(false);
    }
  };

  const deployCode = async () => {
    if (!generatedCode || !currentProjectId) {
      showToast('No code to deploy', 'error');
      return;
    }

    setIsDeploying(true);
    setStatusPolling(true);
    
    try {
      const response = await fetch(`${API_BASE_URL}/deploy-code`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          project_id: currentProjectId,
          generated_code: generatedCode,
        }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.detail || 'Failed to deploy code');
      }

      const data = await response.json();
      setProjectStatus({
        project_id: data.project_id,
        status: data.status,
        public_url: data.public_url,
        sandbox_id: data.sandbox_id
      });
      
      showToast('Deployment started! Please wait...');
    } catch (error) {
      console.error('Deployment error:', error);
      showToast(error.message || 'Failed to deploy code', 'error');
      setStatusPolling(false);
    } finally {
      setIsDeploying(false);
    }
  };

  const cleanupProject = async () => {
    if (!currentProjectId) return;

    try {
      const response = await fetch(`${API_BASE_URL}/projects/${currentProjectId}`, {
        method: 'DELETE',
      });

      if (response.ok) {
        setDeploymentInfo(null);
        setCurrentProjectId(null);
        setGeneratedCode('');
        setShowPreview(false);
        setProjectStatus(null);
        setStatusPolling(false);
        setShowResults(false);
        setViewMode('code');
        showToast('Project cleaned up successfully!');
      } else {
        throw new Error('Failed to cleanup project');
      }
    } catch (error) {
      console.error('Cleanup error:', error);
      showToast('Failed to cleanup project', 'error');
    }
  };

  const copyCode = async () => {
    try {
      await navigator.clipboard.writeText(generatedCode);
      setCopied(true);
      showToast('Code copied to clipboard!');
      setTimeout(() => setCopied(false), 2000);
    } catch (error) {
      showToast('Failed to copy code', 'error');
    }
  };

  const formatCode = (code) => {
    return code.replace(/```/g, '').trim();
  };

  const getStatusIcon = () => {
    if (!projectStatus) return null;
    
    switch (projectStatus.status) {
      case 'deploying':
        return <RefreshCw className="w-4 h-4 animate-spin text-yellow-500" />;
      case 'deployed':
        return <CheckCircle className="w-4 h-4 text-green-500" />;
      case 'failed':
        return <AlertCircle className="w-4 h-4 text-red-500" />;
      default:
        return <Clock className="w-4 h-4 text-blue-500" />;
    }
  };

  const getStatusText = () => {
    if (!projectStatus) return 'No active deployment';
    
    switch (projectStatus.status) {
      case 'deploying':
        return 'Deploying application...';
      case 'deployed':
        return 'Successfully deployed';
      case 'failed':
        return `Deployment failed: ${projectStatus.error_message || 'Unknown error'}`;
      default:
        return projectStatus.status;
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-gray-100">
      {/* Toast Notification */}
      {toast && (
        <Toast
          message={toast.message}
          type={toast.type}
          onClose={() => setToast(null)}
        />
      )}

      {/* Header */}
      <div className="bg-white border-b border-gray-200 shadow-sm">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
          <div className="flex items-center space-x-3">
            <div className="flex items-center justify-center w-10 h-10 bg-blue-600 rounded-lg">
              <Code className="w-6 h-6 text-white" />
            </div>
            <div>
              <h1 className="text-2xl font-bold text-gray-900">AI Code Generator</h1>
              <p className="text-sm text-gray-600">Generate and deploy Next.js applications with E2B sandboxes</p>
            </div>
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Initial State - Just Prompt Input */}
        {!showResults && (
          <div className="max-w-2xl mx-auto">
            <div className="bg-white rounded-xl shadow-lg border border-gray-200 p-8 transition-all duration-500 transform">
              <div className="text-center mb-8">
                <div className="flex items-center justify-center w-16 h-16 bg-blue-100 rounded-full mx-auto mb-4">
                  <Code className="w-8 h-8 text-blue-600" />
                </div>
                <h2 className="text-2xl font-bold text-gray-900 mb-2">Create Your Next.js App</h2>
                <p className="text-gray-600">Describe your application and I'll generate complete TypeScript code</p>
              </div>
              
              <textarea
                value={prompt}
                onChange={(e) => setPrompt(e.target.value)}
                placeholder="Describe the Next.js application you want to create...

Examples:
• A todo app with add/delete functionality
• A weather dashboard with current conditions  
• A calculator with basic operations
• A blog homepage with article cards
• A portfolio landing page with projects
• An e-commerce product catalog
• A simple chat interface
• An image gallery with lightbox"
                className="w-full h-48 px-4 py-3 border border-gray-300 rounded-lg text-gray-900 placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent resize-none text-sm mb-6"
              />
              
              <button
                onClick={generateCode}
                disabled={isGenerating}
                className="flex items-center justify-center space-x-2 w-full bg-blue-600 hover:bg-blue-700 disabled:bg-gray-400 text-white px-6 py-4 rounded-lg font-medium transition-all duration-200 disabled:cursor-not-allowed transform hover:scale-105"
              >
                {isGenerating ? (
                  <>
                    <RefreshCw className="w-5 h-5 animate-spin" />
                    <span>Generating your app...</span>
                  </>
                ) : (
                  <>
                    <Code className="w-5 h-5" />
                    <span>Generate Code</span>
                  </>
                )}
              </button>
            </div>
          </div>
        )}

        {/* Results State - Code and Preview */}
        {showResults && (
          <div className={`transition-all duration-700 transform ${showResults ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-8'}`}>
            <div className="grid grid-cols-1 lg:grid-cols-4 gap-8">
              {/* Sidebar */}
              <div className="lg:col-span-1">
                {/* View Toggle */}
                <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-4 mb-6">
                  <h3 className="text-sm font-semibold text-gray-900 mb-3">View</h3>
                  <div className="flex bg-gray-100 rounded-lg p-1">
                    <button
                      onClick={() => setViewMode('code')}
                      className={`flex-1 flex items-center justify-center space-x-2 px-3 py-2 rounded-md text-sm font-medium transition-all duration-200 ${
                        viewMode === 'code'
                          ? 'bg-white text-blue-600 shadow-sm'
                          : 'text-gray-600 hover:text-gray-900'
                      }`}
                    >
                      <FileCode className="w-4 h-4" />
                      <span>Code</span>
                    </button>
                    <button
                      onClick={() => setViewMode('preview')}
                      disabled={!showPreview}
                      className={`flex-1 flex items-center justify-center space-x-2 px-3 py-2 rounded-md text-sm font-medium transition-all duration-200 ${
                        viewMode === 'preview' && showPreview
                          ? 'bg-white text-blue-600 shadow-sm'
                          : showPreview
                          ? 'text-gray-600 hover:text-gray-900'
                          : 'text-gray-400 cursor-not-allowed'
                      }`}
                    >
                      <Eye className="w-4 h-4" />
                      <span>Preview</span>
                    </button>
                  </div>
                </div>

                {/* Actions */}
                <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-4 mb-6">
                  <h3 className="text-sm font-semibold text-gray-900 mb-3">Actions</h3>
                  <div className="space-y-2">
                    {generatedCode && (
                      <button
                        onClick={deployCode}
                        disabled={isDeploying || statusPolling}
                        className="flex items-center justify-center space-x-2 w-full bg-green-600 hover:bg-green-700 disabled:bg-gray-400 text-white px-4 py-2 rounded-lg text-sm font-medium transition-colors duration-200 disabled:cursor-not-allowed"
                      >
                        {isDeploying || statusPolling ? (
                          <>
                            <RefreshCw className="w-4 h-4 animate-spin" />
                            <span>{isDeploying ? 'Starting...' : 'Deploying...'}</span>
                          </>
                        ) : (
                          <>
                            <Play className="w-4 h-4" />
                            <span>Deploy to E2B</span>
                          </>
                        )}
                      </button>
                    )}
                    
                    <button
                      onClick={copyCode}
                      className="flex items-center justify-center space-x-2 w-full bg-gray-100 hover:bg-gray-200 text-gray-700 px-4 py-2 rounded-lg text-sm font-medium transition-colors duration-200"
                    >
                      {copied ? (
                        <>
                          <Check className="w-4 h-4 text-green-600" />
                          <span>Copied!</span>
                        </>
                      ) : (
                        <>
                          <Copy className="w-4 h-4" />
                          <span>Copy Code</span>
                        </>
                      )}
                    </button>

                    {currentProjectId && (
                      <button
                        onClick={cleanupProject}
                        className="flex items-center justify-center space-x-2 w-full bg-red-50 hover:bg-red-100 text-red-600 px-4 py-2 rounded-lg text-sm font-medium transition-colors duration-200"
                      >
                        <Trash2 className="w-4 h-4" />
                        <span>Clean Up</span>
                      </button>
                    )}
                  </div>
                </div>

                {/* Status Panel */}
                <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-4">
                  <h3 className="text-sm font-semibold text-gray-900 mb-3">Status</h3>
                  
                  {projectStatus ? (
                    <div className="space-y-3">
                      <div className="flex items-center space-x-2">
                        {getStatusIcon()}
                        <span className="text-sm text-gray-700">{getStatusText()}</span>
                      </div>
                      
                      {projectStatus.status === 'deployed' && projectStatus.public_url && (
                        <a 
                          href={projectStatus.public_url} 
                          target="_blank" 
                          rel="noopener noreferrer"
                          className="inline-flex items-center space-x-2 bg-blue-600 hover:bg-blue-700 text-white px-3 py-2 rounded-md text-sm font-medium transition-colors duration-200"
                        >
                          <Globe className="w-4 h-4" />
                          <span>View Live</span>
                          <ExternalLink className="w-3 h-3" />
                        </a>
                      )}
                    </div>
                  ) : (
                    <div className="text-center py-4">
                      <Clock className="w-8 h-8 text-gray-300 mx-auto mb-2" />
                      <p className="text-gray-500 text-sm">Ready to deploy</p>
                    </div>
                  )}
                </div>
              </div>

              {/* Main Content */}
              <div className="lg:col-span-3">
                {/* Code View */}
                {viewMode === 'code' && generatedCode && (
                  <div className="bg-white rounded-xl shadow-sm border border-gray-200 transition-all duration-500">
                    <div className="p-6 border-b border-gray-200">
                      <h3 className="text-lg font-semibold text-gray-900">Generated Next.js Code</h3>
                    </div>
                    
                    <div className="p-6">
                      <div className="bg-gray-900 rounded-lg p-4 max-h-96 overflow-y-auto">
                        <pre className="text-green-400 text-sm whitespace-pre-wrap font-mono">
                          {formatCode(generatedCode)}
                        </pre>
                      </div>
                    </div>
                  </div>
                )}

                {/* Preview View */}
                {viewMode === 'preview' && showPreview && deploymentInfo && (
                  <div className="bg-white rounded-xl shadow-sm border border-gray-200 transition-all duration-500">
                    <div className="flex items-center justify-between p-6 border-b border-gray-200">
                      <div className="flex items-center space-x-3">
                        <h3 className="text-lg font-semibold text-gray-900">Live Preview</h3>
                        <span className="text-xs bg-green-100 text-green-800 px-2 py-1 rounded-full">E2B Sandbox</span>
                      </div>
                      <div className="flex items-center space-x-2 text-sm text-gray-600">
                        <div className="w-2 h-2 bg-green-400 rounded-full"></div>
                        <span>Live</span>
                      </div>
                    </div>
                    
                    <div className="p-6">
                      <div className="bg-gray-100 rounded-lg overflow-hidden border" style={{ height: '600px' }}>
                        <iframe
                          src={deploymentInfo.public_url}
                          className="w-full h-full border-0"
                          title="Live Preview"
                          sandbox="allow-scripts allow-same-origin allow-forms allow-popups allow-modals"
                          onError={() => showToast('Preview failed to load', 'error')}
                        />
                      </div>
                    </div>
                  </div>
                )}

                {/* Fallback when preview not available */}
                {viewMode === 'preview' && !showPreview && (
                  <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-12 text-center">
                    <Monitor className="w-16 h-16 text-gray-300 mx-auto mb-4" />
                    <h3 className="text-xl font-semibold text-gray-900 mb-2">Preview Not Available</h3>
                    <p className="text-gray-600 mb-4">Deploy your application to see the live preview</p>
                    <button
                      onClick={() => setViewMode('code')}
                      className="text-blue-600 hover:text-blue-700 font-medium"
                    >
                      View Code Instead
                    </button>
                  </div>
                )}
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

export default App;