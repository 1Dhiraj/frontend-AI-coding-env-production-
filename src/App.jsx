import React, { useState, useEffect } from 'react';
import { Code, Play, Globe, Trash2, Copy, Check, Monitor, RefreshCw, AlertCircle, CheckCircle, Clock, ExternalLink, Eye, FileCode, Terminal, Zap } from 'lucide-react';
import './App.css';

// Real axios implementation for production
const API_BASE_URL = 'http://localhost:8000'; // Update with your actual API base URL

// Toast notification component
const Toast = ({ message, type, onClose }) => (
  <div className={`fixed top-6 right-6 z-50 p-4 rounded-lg shadow-xl border transition-all duration-300 transform ${
    type === 'success' 
      ? 'bg-white border-green-200 text-green-800' 
      : type === 'error' 
      ? 'bg-white border-red-200 text-red-800' 
      : 'bg-white border-blue-200 text-blue-800'
  } max-w-sm`}>
    <div className="flex items-center justify-between">
      <div className="flex items-center space-x-2">
        {type === 'success' && <CheckCircle className="w-4 h-4 text-green-600" />}
        {type === 'error' && <AlertCircle className="w-4 h-4 text-red-600" />}
        {type === 'info' && <Clock className="w-4 h-4 text-blue-600" />}
        <span className="text-sm font-medium">{message}</span>
      </div>
      <button onClick={onClose} className="ml-4 text-gray-400 hover:text-gray-600 text-lg leading-none">×</button>
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
              showToast('Application deployed successfully');
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
      showToast('Please enter a project description', 'error');
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
      
      showToast('Code generated successfully');
    } catch (error) {
      console.error('Generation error:', error);
      showToast(error.message || 'Failed to generate code', 'error');
    } finally {
      setIsGenerating(false);
    }
  };

  const deployCode = async () => {
    if (!generatedCode || !currentProjectId) {
      showToast('No code available for deployment', 'error');
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
      
      showToast('Deployment initiated successfully');
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
        showToast('Project resources cleaned up successfully');
      } else {
        throw new Error('Failed to cleanup project');
      }
    } catch (error) {
      console.error('Cleanup error:', error);
      showToast('Failed to cleanup project resources', 'error');
    }
  };

  const copyCode = async () => {
    try {
      await navigator.clipboard.writeText(generatedCode);
      setCopied(true);
      showToast('Code copied to clipboard');
      setTimeout(() => setCopied(false), 2000);
    } catch (error) {
      showToast('Failed to copy code to clipboard', 'error');
    }
  };

  const formatCode = (code) => {
    return code.replace(/```/g, '').trim();
  };

  const getStatusIcon = () => {
    if (!projectStatus) return null;
    
    switch (projectStatus.status) {
      case 'deploying':
        return <RefreshCw className="w-4 h-4 animate-spin text-amber-500" />;
      case 'deployed':
        return <CheckCircle className="w-4 h-4 text-green-500" />;
      case 'failed':
        return <AlertCircle className="w-4 h-4 text-red-500" />;
      default:
        return <Clock className="w-4 h-4 text-slate-500" />;
    }
  };

  const getStatusText = () => {
    if (!projectStatus) return 'Ready for deployment';
    
    switch (projectStatus.status) {
      case 'deploying':
        return 'Deployment in progress';
      case 'deployed':
        return 'Successfully deployed';
      case 'failed':
        return `Deployment failed: ${projectStatus.error_message || 'Unknown error'}`;
      default:
        return projectStatus.status;
    }
  };

  return (
    <div className="min-h-screen bg-slate-50">
      {/* Toast Notification */}
      {toast && (
        <Toast
          message={toast.message}
          type={toast.type}
          onClose={() => setToast(null)}
        />
      )}

      {/* Header */}
      <header className="bg-white border-b border-slate-200 shadow-sm">
        <div className="max-w-7xl mx-auto px-6 py-6">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-4">
              <div className="flex items-center justify-center w-12 h-12 bg-slate-900 rounded-xl">
                <Terminal className="w-6 h-6 text-white" />
              </div>
              <div>
                <h1 className="text-2xl font-bold text-slate-900">AI Code Generator</h1>
                <p className="text-sm text-slate-600 mt-1">Professional Next.js application development platform</p>
              </div>
            </div>
            <div className="flex items-center space-x-2 text-sm text-slate-500">
              <div className="w-2 h-2 bg-green-400 rounded-full"></div>
              <span>System Operational</span>
            </div>
          </div>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-6 py-8">
        {/* Initial State - Project Configuration */}
        {!showResults && (
          <div className="max-w-3xl mx-auto">
            <div className="bg-white rounded-2xl shadow-sm border border-slate-200 overflow-hidden">
              <div className="px-8 py-6 border-b border-slate-100">
                <div className="flex items-center space-x-3">
                  <Code className="w-6 h-6 text-slate-700" />
                  <h2 className="text-xl font-semibold text-slate-900">Project Configuration</h2>
                </div>
                <p className="text-slate-600 mt-2">Describe your Next.js application requirements and specifications</p>
              </div>
              
              <div className="p-8">
                <div className="mb-6">
                  <label className="block text-sm font-medium text-slate-700 mb-3">
                    Project Description
                  </label>
                  <textarea
                    value={prompt}
                    onChange={(e) => setPrompt(e.target.value)}
                    placeholder="Please provide a detailed description of your Next.js application...

Examples:
• A comprehensive todo management application with CRUD operations
• A responsive weather dashboard displaying current conditions and forecasts
• A professional calculator with standard and scientific operations
• A modern blog interface with article listings and search functionality
• A portfolio website with project showcase and contact form
• An e-commerce product catalog with filtering and sorting capabilities
• A real-time chat interface with message history
• An interactive image gallery with lightbox and categorization"
                    className="w-full h-40 px-4 py-3 border border-slate-300 rounded-xl text-slate-900 placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-slate-500 focus:border-transparent resize-none text-sm leading-relaxed"
                  />
                </div>
                
                <button
                  onClick={generateCode}
                  disabled={isGenerating}
                  className="flex items-center justify-center space-x-3 w-full bg-slate-900 hover:bg-slate-800 disabled:bg-slate-400 text-white px-6 py-4 rounded-xl font-medium transition-all duration-200 disabled:cursor-not-allowed"
                >
                  {isGenerating ? (
                    <>
                      <RefreshCw className="w-5 h-5 animate-spin" />
                      <span>Generating Application Code...</span>
                    </>
                  ) : (
                    <>
                      <Zap className="w-5 h-5" />
                      <span>Generate Application</span>
                    </>
                  )}
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Results State - Code Management Interface */}
        {showResults && (
          <div className={`transition-all duration-500 transform ${showResults ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-4'}`}>
            <div className="grid grid-cols-12 gap-6">
              {/* Control Panel */}
              <div className="col-span-12 lg:col-span-3">
                <div className="space-y-6">
                  {/* View Controls */}
                  <div className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden">
                    <div className="px-4 py-3 border-b border-slate-100 bg-slate-50">
                      <h3 className="text-sm font-semibold text-slate-900">Display Mode</h3>
                    </div>
                    <div className="p-4">
                      <div className="grid grid-cols-2 gap-2">
                        <button
                          onClick={() => setViewMode('code')}
                          className={`flex items-center justify-center space-x-2 px-3 py-2.5 rounded-lg text-sm font-medium transition-all duration-200 ${
                            viewMode === 'code'
                              ? 'bg-slate-900 text-white shadow-sm'
                              : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
                          }`}
                        >
                          <FileCode className="w-4 h-4" />
                          <span>Source</span>
                        </button>
                        <button
                          onClick={() => setViewMode('preview')}
                          disabled={!showPreview}
                          className={`flex items-center justify-center space-x-2 px-3 py-2.5 rounded-lg text-sm font-medium transition-all duration-200 ${
                            viewMode === 'preview' && showPreview
                              ? 'bg-slate-900 text-white shadow-sm'
                              : showPreview
                              ? 'bg-slate-100 text-slate-700 hover:bg-slate-200'
                              : 'bg-slate-50 text-slate-400 cursor-not-allowed'
                          }`}
                        >
                          <Eye className="w-4 h-4" />
                          <span>Preview</span>
                        </button>
                      </div>
                    </div>
                  </div>

                  {/* Operations */}
                  <div className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden">
                    <div className="px-4 py-3 border-b border-slate-100 bg-slate-50">
                      <h3 className="text-sm font-semibold text-slate-900">Operations</h3>
                    </div>
                    <div className="p-4 space-y-3">
                      {generatedCode && (
                        <button
                          onClick={deployCode}
                          disabled={isDeploying || statusPolling}
                          className="flex items-center justify-center space-x-2 w-full bg-green-600 hover:bg-green-700 disabled:bg-slate-400 text-white px-4 py-2.5 rounded-lg text-sm font-medium transition-all duration-200 disabled:cursor-not-allowed"
                        >
                          {isDeploying || statusPolling ? (
                            <>
                              <RefreshCw className="w-4 h-4 animate-spin" />
                              <span>{isDeploying ? 'Initializing...' : 'Deploying...'}</span>
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
                        className="flex items-center justify-center space-x-2 w-full bg-slate-100 hover:bg-slate-200 text-slate-700 px-4 py-2.5 rounded-lg text-sm font-medium transition-all duration-200"
                      >
                        {copied ? (
                          <>
                            <Check className="w-4 h-4 text-green-600" />
                            <span>Copied</span>
                          </>
                        ) : (
                          <>
                            <Copy className="w-4 h-4" />
                            <span>Copy Source</span>
                          </>
                        )}
                      </button>

                      {currentProjectId && (
                        <button
                          onClick={cleanupProject}
                          className="flex items-center justify-center space-x-2 w-full bg-red-50 hover:bg-red-100 text-red-600 px-4 py-2.5 rounded-lg text-sm font-medium transition-all duration-200 border border-red-200"
                        >
                          <Trash2 className="w-4 h-4" />
                          <span>Cleanup Resources</span>
                        </button>
                      )}
                    </div>
                  </div>

                  {/* Deployment Status */}
                  <div className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden">
                    <div className="px-4 py-3 border-b border-slate-100 bg-slate-50">
                      <h3 className="text-sm font-semibold text-slate-900">Deployment Status</h3>
                    </div>
                    <div className="p-4">
                      {projectStatus ? (
                        <div className="space-y-4">
                          <div className="flex items-center space-x-3">
                            {getStatusIcon()}
                            <div>
                              <p className="text-sm font-medium text-slate-900">{getStatusText()}</p>
                              {projectStatus.project_id && (
                                <p className="text-xs text-slate-500 mt-1">ID: {projectStatus.project_id.slice(0, 8)}</p>
                              )}
                            </div>
                          </div>
                          
                          {projectStatus.status === 'deployed' && projectStatus.public_url && (
                            <a 
                              href={projectStatus.public_url} 
                              target="_blank" 
                              rel="noopener noreferrer"
                              className="inline-flex items-center space-x-2 bg-slate-900 hover:bg-slate-800 text-white px-4 py-2 rounded-lg text-sm font-medium transition-all duration-200"
                            >
                              <Globe className="w-4 h-4" />
                              <span>View Application</span>
                              <ExternalLink className="w-3 h-3" />
                            </a>
                          )}
                        </div>
                      ) : (
                        <div className="text-center py-6">
                          <Clock className="w-8 h-8 text-slate-300 mx-auto mb-3" />
                          <p className="text-slate-500 text-sm">Awaiting deployment</p>
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              </div>

              {/* Main Content Area */}
              <div className="col-span-12 lg:col-span-9">
                {/* Source Code View */}
                {viewMode === 'code' && generatedCode && (
                  <div className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden">
                    <div className="px-6 py-4 border-b border-slate-100 bg-slate-50">
                      <div className="flex items-center justify-between">
                        <h3 className="text-lg font-semibold text-slate-900">Generated Source Code</h3>
                        <div className="flex items-center space-x-2 text-sm text-slate-500">
                          <div className="w-2 h-2 bg-green-400 rounded-full"></div>
                          <span>TypeScript • Next.js</span>
                        </div>
                      </div>
                    </div>
                    
                    <div className="p-6">
                      <div className="bg-slate-900 rounded-xl p-6 overflow-x-auto" style={{ maxHeight: '70vh' }}>
                        <pre className="text-green-400 text-sm whitespace-pre-wrap font-mono leading-relaxed">
                          {formatCode(generatedCode)}
                        </pre>
                      </div>
                    </div>
                  </div>
                )}

                {/* Live Preview */}
                {viewMode === 'preview' && showPreview && deploymentInfo && (
                  <div className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden">
                    <div className="px-6 py-4 border-b border-slate-100 bg-slate-50">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center space-x-3">
                          <h3 className="text-lg font-semibold text-slate-900">Live Application Preview</h3>
                          <span className="text-xs bg-green-100 text-green-800 px-2 py-1 rounded-full font-medium">E2B Sandbox</span>
                        </div>
                        <div className="flex items-center space-x-2 text-sm text-slate-600">
                          <div className="w-2 h-2 bg-green-400 rounded-full"></div>
                          <span>Live Instance</span>
                        </div>
                      </div>
                    </div>
                    
                    <div className="p-6">
                      <div className="bg-slate-100 rounded-xl overflow-hidden border border-slate-200" style={{ height: '70vh' }}>
                        <iframe
                          src={deploymentInfo.public_url}
                          className="w-full h-full border-0"
                          title="Application Preview"
                          sandbox="allow-scripts allow-same-origin allow-forms allow-popups allow-modals"
                          onError={() => showToast('Preview failed to load', 'error')}
                        />
                      </div>
                    </div>
                  </div>
                )}

                {/* Preview Unavailable State */}
                {viewMode === 'preview' && !showPreview && (
                  <div className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden">
                    <div className="px-6 py-4 border-b border-slate-100 bg-slate-50">
                      <h3 className="text-lg font-semibold text-slate-900">Application Preview</h3>
                    </div>
                    <div className="p-12 text-center">
                      <Monitor className="w-16 h-16 text-slate-300 mx-auto mb-4" />
                      <h3 className="text-xl font-semibold text-slate-900 mb-2">Preview Not Available</h3>
                      <p className="text-slate-600 mb-6 max-w-md mx-auto">
                        Deploy your application to the E2B sandbox environment to view the live preview
                      </p>
                      <button
                        onClick={() => setViewMode('code')}
                        className="text-slate-700 hover:text-slate-900 font-medium bg-slate-100 hover:bg-slate-200 px-4 py-2 rounded-lg transition-colors duration-200"
                      >
                        View Source Code
                      </button>
                    </div>
                  </div>
                )}
              </div>
            </div>
          </div>
        )}
      </main>
    </div>
  );
}

export default App;