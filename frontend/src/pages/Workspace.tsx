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
  type?: string;
  metadata?: any;
}

const LANGUAGES = [
  { id: 'javascript', name: 'JavaScript', version: '18.15.0', defaultCode: '' },
  { id: 'python', name: 'Python', version: '3.10.0', defaultCode: '' },
  { id: 'java', name: 'Java', version: '15.0.2', defaultCode: '' },
  { id: 'cpp', name: 'C++', version: '10.2.0', defaultCode: '' },
  { id: 'c', name: 'C', version: '10.2.0', defaultCode: '' }
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
  
  // Theory Questions State
  const [textAnswer, setTextAnswer] = useState('');
  const [theoryScore, setTheoryScore] = useState<number | null>(null);
  const [theoryFeedback, setTheoryFeedback] = useState<string>('');
  const [showReferenceAnswer, setShowReferenceAnswer] = useState(false);

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

  const isTheory = question ? (
    question.type?.toLowerCase() === 'theory' || 
    ['system design', 'sysdesign', 'dbms', 'db', 'databases', 'machine learning', 'ml', 'ml-dl', 'ml/dl', 'cyber security', 'sec', 'cloud computing', 'cloud', 'computer networks', 'cn', 'operating systems', 'os'].includes(question.category.toLowerCase())
  ) : false;

  const isCodingProblem = !isTheory;

  const handleRunOrSubmit = async (isSubmit: boolean) => {
    if (!isAuthenticated) {
      alert("Please login to participate");
      return;
    }
    
    setIsRunning(true);
    
    // Theory Evaluation Flow
    if (isTheory) {
      setOutput('Evaluating answer with AI...');
      setTheoryScore(null);
      setTheoryFeedback('');
      try {
        const response = await axios.post(`${API_BASE}/evaluate-theory`, {
          questionId: id,
          userId: user?.id,
          answer: textAnswer
        });
        if (response.data.success) {
          setTheoryScore(response.data.data.accuracyScore);
          setTheoryFeedback(response.data.data.feedback);
          setOutput('');
        } else {
          setOutput('Evaluation failed');
        }
      } catch (err: any) {
        setOutput(err.response?.data?.error || 'An error occurred during evaluation.');
      } finally {
        setIsRunning(false);
      }
      return;
    }

    // Programming Flow
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

  // Handled above via isCodingProblem

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
                      <div className="mb-2"><strong>Input:</strong> <pre className="mt-1 p-2 bg-black bg-opacity-30 rounded-md text-sm whitespace-pre-wrap">{tc.input}</pre></div>
                      <div><strong>Output:</strong> <pre className="mt-1 p-2 bg-black bg-opacity-30 rounded-md text-sm whitespace-pre-wrap">{tc.expectedOutput}</pre></div>
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
                              <div className="tc-row"><strong>Input:</strong> <pre className="inline-block align-top mt-1 p-2 bg-black bg-opacity-30 rounded-md text-xs whitespace-pre-wrap">{tr.input}</pre></div>
                              <div className="tc-row"><strong>Expected:</strong> <pre className="inline-block align-top mt-1 p-2 bg-black bg-opacity-30 rounded-md text-xs whitespace-pre-wrap">{tr.expectedOutput}</pre></div>
                              <div className="tc-row"><strong>Actual:</strong> <pre className="inline-block align-top mt-1 p-2 bg-black bg-opacity-30 rounded-md text-xs whitespace-pre-wrap">{tr.actualOutput}</pre></div>
                              {tr.error && <div className="error-text">Error: {tr.error}</div>}
                            </div>
                          );
                        } else if (!tr.passed) {
                          return (
                            <div key={i} className="test-case-card failed">
                              <h4>Hidden Test Case {tr.testCase} ❌</h4>
                              <div className="tc-row text-muted italic">Input and Expected Output are hidden.</div>
                              <div className="tc-row"><strong>Your Output:</strong> <pre className="inline-block align-top mt-1 p-2 bg-black bg-opacity-30 rounded-md text-xs whitespace-pre-wrap">{tr.actualOutput}</pre></div>
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
                  {testResults.length === 0 && !output && question.testCases && (
                    <div className="test-results-list">
                      <div className="text-muted mb-3 italic">These are the visible test cases your code will be run against.</div>
                      {(question.testCases as any[]).slice(0, 2).map((tc, i) => (
                        <div key={i} className="test-case-card" style={{ borderLeft: '3px solid var(--accent)' }}>
                          <h4>Test Case {i + 1}</h4>
                          <div className="tc-row"><strong>Input:</strong> <pre className="inline-block align-top mt-1 p-2 bg-black bg-opacity-30 rounded-md text-xs whitespace-pre-wrap">{tc.input}</pre></div>
                          <div className="tc-row"><strong>Expected Output:</strong> <pre className="inline-block align-top mt-1 p-2 bg-black bg-opacity-30 rounded-md text-xs whitespace-pre-wrap">{tc.expectedOutput}</pre></div>
                        </div>
                      ))}
                    </div>
                  )}
                  {testResults.length === 0 && !output && !question.testCases && (
                    <pre>Run your code to see output here.</pre>
                  )}
                </div>
              </div>
            </Split>
          </div>
        </Split>
      ) : (
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
          {/* Left Pane: Theory Problem Description */}
          <div className="problem-pane glass-panel single-pane overflow-y-auto">
            <div className="pane-header">
              <h2 className="problem-title">{question.title}</h2>
              <div className="problem-meta">
                <span className={`difficulty-tag ${question.difficulty?.toLowerCase() || 'medium'}`}>
                  {question.difficulty || 'Medium'}
                </span>
                <span className="category-tag">{question.category}</span>
                <span className="type-tag bg-purple-600 text-white px-2.5 py-0.5 rounded-full text-xs font-semibold ml-2">Theory</span>
              </div>
            </div>
            <div className="pane-content problem-description">
              <div className="prose prose-invert max-w-none text-gray-200" dangerouslySetInnerHTML={{ __html: question.description }} />
              
              {/* Optional Reference Answer toggle */}
              {question.metadata?.detailed_answer && (
                <div className="mt-6 pt-4 border-t border-gray-800">
                  <button 
                    className="btn-secondary btn-sm text-xs" 
                    onClick={() => setShowReferenceAnswer(!showReferenceAnswer)}
                  >
                    {showReferenceAnswer ? 'Hide Reference Answer' : 'View Scraped Reference Answer'}
                  </button>
                  {showReferenceAnswer && (
                    <div className="mt-3 p-4 bg-black bg-opacity-40 rounded-lg text-sm text-gray-300 whitespace-pre-wrap border border-gray-800">
                      <strong className="text-purple-400 block mb-2">Reference Answer:</strong>
                      {question.metadata.detailed_answer}
                    </div>
                  )}
                </div>
              )}
            </div>
          </div>

          {/* Right Pane: Text Editor & AI Evaluation Console */}
          <div className="editor-pane">
            <Split
              sizes={[65, 35]}
              minSize={100}
              direction="vertical"
              className="vertical-split-wrapper"
              gutterSize={8}
            >
              <div className="editor-container glass-panel flex flex-col h-full">
                <div className="pane-header flex-between" style={{ padding: '10px 16px' }}>
                  <span className="text-white font-semibold text-sm">Your Answer</span>
                  <div className="editor-actions flex gap-2">
                    <button className="btn-secondary btn-sm" onClick={() => setTextAnswer('')}>Clear</button>
                    <button className="btn-submit flex-center btn-sm bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-500 hover:to-indigo-500 text-white px-4 py-1.5 rounded-md font-medium" onClick={() => handleRunOrSubmit(true)} disabled={isRunning}>
                      <Check size={14} className="mr-1.5" />
                      {isRunning ? 'Evaluating...' : 'Submit Answer'}
                    </button>
                  </div>
                </div>
                <div className="flex-1 p-3 h-full flex flex-col">
                  <textarea 
                    className="w-full h-full bg-black bg-opacity-50 text-gray-100 border border-gray-800 resize-none p-4 font-sans text-sm leading-relaxed outline-none focus:border-purple-500 rounded-lg"
                    placeholder="Type your explanation or system design answer here..."
                    value={textAnswer}
                    onChange={(e) => setTextAnswer(e.target.value)}
                  />
                </div>
              </div>

              <div className="console-container glass-panel flex flex-col overflow-hidden">
                <div className="pane-header">
                  <span className="console-title">AI Evaluation Results</span>
                </div>
                <div className="console-output p-4 overflow-y-auto flex-1">
                  {output && <div className="text-purple-400 animate-pulse font-medium">{output}</div>}
                  {theoryScore !== null && (
                    <div className="evaluation-results">
                      <div className={`text-xl font-bold mb-3 flex items-center gap-2 ${theoryScore >= 70 ? 'text-green-400' : 'text-amber-400'}`}>
                        <span>Score: {theoryScore} / 100</span>
                        <span className="text-xs px-2 py-0.5 rounded bg-black bg-opacity-40 border border-current">
                          {theoryScore >= 80 ? 'Excellent' : theoryScore >= 60 ? 'Good' : 'Needs Improvement'}
                        </span>
                      </div>
                      <div className="text-gray-200 whitespace-pre-wrap leading-relaxed text-sm bg-black bg-opacity-40 p-4 rounded-lg border border-gray-800">
                        {theoryFeedback}
                      </div>
                    </div>
                  )}
                  {theoryScore === null && !output && (
                    <div className="text-gray-400 text-sm italic">Enter your answer above and click <span className="text-purple-400 font-semibold">Submit Answer</span> to receive AI grading & feedback.</div>
                  )}
                </div>
              </div>
            </Split>
          </div>
        </Split>
      )}
    </div>
  );
}
