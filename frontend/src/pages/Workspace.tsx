import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import Split from 'react-split';
import Editor from '@monaco-editor/react';
import axios from 'axios';
import { Play, Check, AlertCircle } from 'lucide-react';
import { useAuthStore } from '../store/useAuthStore';
import './Workspace.css';

const API_BASE = 'http://localhost:3000';

interface Question {
  id: string;
  title: string;
  description: string;
  category: string;
}

export default function Workspace() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { isAuthenticated, user } = useAuthStore();
  
  const [question, setQuestion] = useState<Question | null>(null);
  const [code, setCode] = useState('function solution() {\n  // Write your code here\n}\n');
  const [output, setOutput] = useState('');
  const [isRunning, setIsRunning] = useState(false);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    // In a real app, we'd fetch the specific question: GET /questions/:id
    // Since we don't have that endpoint explicitly in the snippet, we'll mock it or fetch all and find
    const fetchQuestion = async () => {
      try {
        const response = await axios.get(`${API_BASE}/questions`);
        if (response.data.success) {
          const found = response.data.data.find((q: Question) => q.id === id);
          if (found) {
            setQuestion(found);
          } else {
            setError('Question not found');
          }
        }
      } catch (err) {
        setError('Failed to fetch question details');
      } finally {
        setLoading(false);
      }
    };
    fetchQuestion();
  }, [id]);

  const handleRunCode = async () => {
    if (!isAuthenticated) {
      alert("Please login to run code");
      return;
    }
    
    setIsRunning(true);
    setOutput('Running code...');
    try {
      const response = await axios.post(`${API_BASE}/execute/code`, {
        language: 'javascript', // Hardcoded for now
        version: '18.15.0',
        code: code
      });
      
      if (response.data.success && response.data.data.run) {
        setOutput(response.data.data.run.output || 'Executed successfully with no output.');
        
        // Also record the submission
        await axios.post(`${API_BASE}/submissions`, {
          userId: user?.id,
          questionId: id,
          status: response.data.data.run.stderr ? 'Fail' : 'Pass', // Simple logic
          code: code,
          language: 'javascript'
        });
      } else {
        setOutput('Execution failed');
      }
    } catch (err: any) {
      setOutput(err.response?.data?.error || 'An error occurred during execution');
    } finally {
      setIsRunning(false);
    }
  };

  if (loading) {
    return <div className="workspace-loading flex-center"><div className="spinner"></div></div>;
  }

  if (error || !question) {
    return (
      <div className="container" style={{ marginTop: '40px' }}>
        <div className="error-banner flex-center">
          <AlertCircle size={20} />
          <span>{error || 'Question not found'}</span>
        </div>
      </div>
    );
  }

  return (
    <div className="workspace-container">
      <Split 
        sizes={[45, 55]} 
        minSize={300} 
        expandToMin={false} 
        gutterSize={8} 
        gutterAlign="center" 
        snapOffset={30} 
        dragInterval={1} 
        direction="horizontal" 
        cursor="col-resize"
        className="split-wrapper"
      >
        {/* Left Pane: Problem Description */}
        <div className="problem-pane glass-panel">
          <div className="pane-header">
            <h2 className="problem-title">{question.title}</h2>
            <div className="problem-meta">
              <span className="difficulty-tag medium">Medium</span>
              <span className="category-tag">{question.category}</span>
            </div>
          </div>
          <div className="pane-content problem-description" dangerouslySetInnerHTML={{ __html: question.description }}>
            {/* Using dangerouslySetInnerHTML assuming description contains HTML from scraper. 
                In a real prod app, use a sanitizer like DOMPurify. */}
          </div>
        </div>

        {/* Right Pane: Code Editor & Console */}
        <div className="editor-pane">
          <Split
            sizes={[70, 30]}
            minSize={100}
            direction="vertical"
            className="vertical-split-wrapper"
            gutterSize={8}
          >
            <div className="editor-container glass-panel">
              <div className="pane-header flex-between">
                <div className="editor-lang-selector">JavaScript</div>
                <div className="editor-actions">
                  <button className="btn-secondary flex-center btn-sm" onClick={() => setCode('')}>Reset</button>
                  <button className="btn-primary flex-center btn-sm" onClick={handleRunCode} disabled={isRunning}>
                    <Play size={14} className="mr-2" />
                    {isRunning ? 'Running...' : 'Run Code'}
                  </button>
                  <button className="btn-submit flex-center btn-sm" onClick={handleRunCode} disabled={isRunning}>
                    <Check size={14} className="mr-2" />
                    Submit
                  </button>
                </div>
              </div>
              <div className="monaco-wrapper">
                <Editor
                  height="100%"
                  defaultLanguage="javascript"
                  theme="vs-dark"
                  value={code}
                  onChange={(val) => setCode(val || '')}
                  options={{
                    minimap: { enabled: false },
                    fontSize: 14,
                    fontFamily: 'var(--font-mono)',
                    padding: { top: 16 },
                    scrollBeyondLastLine: false,
                    smoothScrolling: true,
                    cursorBlinking: "smooth",
                    cursorSmoothCaretAnimation: "on",
                    formatOnPaste: true
                  }}
                />
              </div>
            </div>

            <div className="console-container glass-panel">
              <div className="pane-header">
                <span className="console-title">Console Output</span>
              </div>
              <div className="console-output">
                <pre>{output || 'Run your code to see output here.'}</pre>
              </div>
            </div>
          </Split>
        </div>
      </Split>
    </div>
  );
}
