import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import Split from 'react-split';
import Editor from '@monaco-editor/react';
import axios from 'axios';
import { Play, Check, AlertCircle } from 'lucide-react';
import { useAuthStore } from '../store/useAuthStore';
import './Workspace.css';

const API_BASE = import.meta.env.VITE_API_BASE || 'https://intelx-148e.onrender.com';

interface Question {
  id: string;
  title: string;
  description: string;
  category: string;
  difficulty?: string;
  testCases?: any;
}

const LANGUAGES = [
  { id: 'javascript', name: 'JavaScript', version: '18.15.0', defaultCode: 'function solution(nums, target) {\n  // Write your code here\n}\n' },
  { id: 'python', name: 'Python', version: '3.10.0', defaultCode: 'def solution(nums, target):\n    # Write your code here\n    pass\n' },
  { id: 'java', name: 'Java', version: '15.0.2', defaultCode: 'class Main {\n    public static void main(String[] args) {\n        // Write your code here\n    }\n}\n' },
  { id: 'cpp', name: 'C++', version: '10.2.0', defaultCode: '#include <iostream>\nusing namespace std;\n\nint main() {\n    // Write your code here\n    return 0;\n}\n' },
  { id: 'c', name: 'C', version: '10.2.0', defaultCode: '#include <stdio.h>\n\nint main() {\n    // Write your code here\n    return 0;\n}\n' }
];

export default function Workspace() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { isAuthenticated, user } = useAuthStore();
  
  const [question, setQuestion] = useState<Question | null>(null);
  const [selectedLang, setSelectedLang] = useState(LANGUAGES[0]);
  const [code, setCode] = useState(LANGUAGES[0].defaultCode);
  const [output, setOutput] = useState('');
  const [testResults, setTestResults] = useState<any[]>([]);
  const [allPassed, setAllPassed] = useState<boolean | null>(null);
  const [isRunning, setIsRunning] = useState(false);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
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

  const handleLanguageChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const lang = LANGUAGES.find(l => l.id === e.target.value) || LANGUAGES[0];
    setSelectedLang(lang);
    setCode(lang.defaultCode);
  };

  const handleRunOrSubmit = async (isSubmit: boolean) => {
    if (!isAuthenticated) {
      alert("Please login to run code");
      return;
    }
    
    setIsRunning(true);
    setOutput(isSubmit ? 'Running all test cases...' : 'Running example cases...');
    setTestResults([]);
    try {
      const response = await axios.post(`${API_BASE}/execute/submit`, {
        questionId: id,
        userId: user?.id,
        language: selectedLang.id,
        version: selectedLang.version,
        code: code,
        isRun: !isSubmit
      });
      
      if (response.data.success && response.data.data.results) {
        setTestResults(response.data.data.results);
        setAllPassed(response.data.data.allPassed);
        setOutput('');
      } else {
        setOutput('Execution failed');
      }
    } catch (err: any) {
      setOutput(err.response?.data?.error || 'An error occurred during execution. Please check your backend connection.');
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

  const isCodingProblem = ['dsa', 'ml', 'machine learning', 'ml/dl'].includes(question.category.toLowerCase());

  return (
    <div className="workspace-container">
      {isCodingProblem ? (
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
                <span className={`difficulty-tag ${question.difficulty?.toLowerCase() || 'medium'}`}>
                  {question.difficulty || 'Medium'}
                </span>
                <span className="category-tag">{question.category}</span>
              </div>
            </div>
            <div className="pane-content problem-description">
              <div dangerouslySetInnerHTML={{ __html: question.description }} />
              {question.testCases && (
                <div className="problem-examples mt-8">
                  <h3 className="mb-4 text-lg font-bold">Examples:</h3>
                  {(question.testCases as any[]).slice(0, 2).map((tc, index) => (
                    <div key={index} className="example-box mb-4 p-4 glass-panel rounded-md">
                      <p className="mb-2"><strong>Input:</strong> <code>{JSON.stringify(tc.input)}</code></p>
                      <p><strong>Output:</strong> <code>{JSON.stringify(tc.expectedOutput)}</code></p>
                    </div>
                  ))}
                </div>
              )}
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
                <div className="pane-header flex-between" style={{ padding: '8px 16px' }}>
                  <select 
                    className="editor-lang-dropdown"
                    value={selectedLang.id}
                    onChange={handleLanguageChange}
                  >
                    {LANGUAGES.map(lang => (
                      <option key={lang.id} value={lang.id}>{lang.name}</option>
                    ))}
                  </select>
                  
                  <div className="editor-actions">
                    <button className="btn-secondary flex-center btn-sm" onClick={() => setCode(selectedLang.defaultCode)}>Reset</button>
                    <button className="btn-primary flex-center btn-sm" onClick={() => handleRunOrSubmit(false)} disabled={isRunning}>
                      <Play size={14} className="mr-2" />
                      {isRunning ? 'Running...' : 'Run Code'}
                    </button>
                    <button className="btn-submit flex-center btn-sm" onClick={() => handleRunOrSubmit(true)} disabled={isRunning}>
                      <Check size={14} className="mr-2" />
                      Submit
                    </button>
                  </div>
                </div>
                <div className="monaco-wrapper">
                  <Editor
                    height="100%"
                    language={selectedLang.id}
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
                  <span className="console-title">Test Results</span>
                </div>
                <div className="console-output">
                  {output && <pre>{output}</pre>}
                  {testResults.length > 0 && (
                    <div className="test-results-list">
                      <div className={`overall-status ${allPassed ? 'text-green' : 'text-red'}`}>
                        {allPassed ? '✅ Accepted' : '❌ Wrong Answer'}
                      </div>
                      {testResults.map((tr, i) => {
                        if (i < 2) {
                          return (
                            <div key={i} className={`test-case-card ${tr.passed ? 'passed' : 'failed'}`}>
                              <h4>Test Case {tr.testCase} {tr.passed ? '✅' : '❌'}</h4>
                              <div className="tc-row"><strong>Input:</strong> <code>{JSON.stringify(tr.input)}</code></div>
                              <div className="tc-row"><strong>Expected:</strong> <code>{JSON.stringify(tr.expectedOutput)}</code></div>
                              <div className="tc-row"><strong>Actual:</strong> <code>{JSON.stringify(tr.actualOutput)}</code></div>
                              {tr.error && <div className="error-text">Error: {tr.error}</div>}
                            </div>
                          );
                        } else if (!tr.passed) {
                          return (
                            <div key={i} className="test-case-card failed">
                              <h4>Hidden Test Case {tr.testCase} ❌</h4>
                              <div className="tc-row text-muted italic">Input and Expected Output are hidden.</div>
                              <div className="tc-row"><strong>Your Output:</strong> <code>{JSON.stringify(tr.actualOutput)}</code></div>
                              {tr.error && <div className="error-text">Error: {tr.error}</div>}
                            </div>
                          );
                        }
                        return null;
                      })}
                      
                      {testResults.length > 2 && (
                        <div className="hidden-cases-summary">
                          {testResults.filter((_, i) => i >= 2 && !testResults[i].passed).length > 0 
                            ? "Some hidden test cases failed." 
                            : `${testResults.length - 2} remaining test cases hidden and passed successfully.`}
                          <br />
                          <span className={allPassed ? 'text-green' : 'text-red'}>
                            Status: {allPassed ? 'All passed!' : 'Some cases failed.'}
                          </span>
                        </div>
                      )}
                    </div>
                  )}
                  {testResults.length === 0 && !output && (
                    <pre>Run your code to see output here.</pre>
                  )}
                </div>
              </div>
            </Split>
          </div>
        </Split>
      ) : (
        <div className="problem-pane glass-panel single-pane">
          <div className="pane-header">
            <h2 className="problem-title">{question.title}</h2>
            <div className="problem-meta">
              <span className={`difficulty-tag ${question.difficulty?.toLowerCase() || 'medium'}`}>
                {question.difficulty || 'Medium'}
              </span>
              <span className="category-tag">{question.category}</span>
            </div>
          </div>
          <div className="pane-content problem-description" dangerouslySetInnerHTML={{ __html: question.description }}>
          </div>
        </div>
      )}
    </div>
  );
}
