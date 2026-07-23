import React, { useEffect, useState } from 'react';
import axios from 'axios';
import { Download, AlertCircle, CheckSquare, Square } from 'lucide-react';
import './Export.css';

const API_BASE = import.meta.env.VITE_API_BASE || 'https://intelx-148e.onrender.com';

interface Question {
  id: string;
  category: string;
  title: string;
  description: string;
  testCases?: any;
  companies?: string[];
}

export default function Export() {
  const [questions, setQuestions] = useState<Question[]>([]);
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [expandedGroups, setExpandedGroups] = useState<Set<string>>(new Set());
  const [groupBy, setGroupBy] = useState<'topic' | 'company'>('topic');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    const fetchQuestions = async () => {
      try {
        const response = await axios.get(`${API_BASE}/questions`);
        if (response.data.success) {
          setQuestions(response.data.data);
        }
      } catch (err: any) {
        setError('Failed to fetch questions.');
        console.error(err);
      } finally {
        setLoading(false);
      }
    };
    fetchQuestions();
  }, []);

  // Group questions by subtopic or company
  const groupedQuestions = questions.reduce((acc, q) => {
    if (groupBy === 'topic') {
      const topic = q.subtopic || q.category || 'General';
      if (!acc[topic]) acc[topic] = [];
      acc[topic].push(q);
    } else {
      if (!q.companies || q.companies.length === 0) {
        const company = 'Uncategorized';
        if (!acc[company]) acc[company] = [];
        acc[company].push(q);
      } else {
        q.companies.forEach(company => {
          if (!acc[company]) acc[company] = [];
          acc[company].push(q);
        });
      }
    }
    return acc;
  }, {} as Record<string, Question[]>);

  const toggleGroup = (group: string) => {
    const newSet = new Set(expandedGroups);
    if (newSet.has(group)) newSet.delete(group);
    else newSet.add(group);
    setExpandedGroups(newSet);
  };

  const toggleSelectAll = (groupQuestions: Question[]) => {
    const allSelected = groupQuestions.every(q => selectedIds.has(q.id));
    const newSet = new Set(selectedIds);
    groupQuestions.forEach(q => {
      if (allSelected) newSet.delete(q.id);
      else newSet.add(q.id);
    });
    setSelectedIds(newSet);
  };

  const toggleSelect = (id: string) => {
    const newSet = new Set(selectedIds);
    if (newSet.has(id)) newSet.delete(id);
    else newSet.add(id);
    setSelectedIds(newSet);
  };

  const downloadFile = (filename: string, content: string, type: string) => {
    const blob = new Blob([content], { type });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = filename;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  };

  const exportJSON = () => {
    const selected = questions.filter((q) => selectedIds.has(q.id));
    downloadFile('intelx_export.json', JSON.stringify(selected, null, 2), 'application/json');
  };

  const exportTXT = () => {
    const selected = questions.filter((q) => selectedIds.has(q.id));
    let txtContent = 'IntelX Problem Export\n=====================\n\n';

    selected.forEach((q) => {
      txtContent += `Title: ${q.title}\n`;
      txtContent += `Category: ${q.category}\n`;
      txtContent += `Description:\n${q.description.replace(/<[^>]+>/g, '')}\n\n`;

      if (q.testCases && Array.isArray(q.testCases)) {
        txtContent += `Test Cases:\n`;
        q.testCases.forEach((tc: any, idx: number) => {
          txtContent += `  Case ${idx + 1}:\n`;
          txtContent += `    Input: ${JSON.stringify(tc.input)}\n`;
          txtContent += `    Output: ${JSON.stringify(tc.expectedOutput)}\n`;
        });
      }
      txtContent += '\n----------------------------------------\n\n';
    });

    downloadFile('intelx_export.txt', txtContent, 'text/plain');
  };

  const exportMoodleXML = () => {
    const selected = questions.filter((q) => selectedIds.has(q.id));
    let xml = '<?xml version="1.0" encoding="UTF-8"?>\n<quiz>\n';

    selected.forEach((q) => {
      let testcasesXml = '';
      if (q.testCases && Array.isArray(q.testCases)) {
        q.testCases.forEach((tc: any, idx: number) => {
          const inputStr = JSON.stringify(tc.input);
          const outputStr = JSON.stringify(tc.expectedOutput);
          testcasesXml += `
    <testcase testtype="0" useasexample="${idx === 0 ? '1' : '0'}" hiderestiffail="0" mark="1.0000000" >
      <testcode>
        <text><![CDATA[${inputStr}]]></text>
      </testcode>
      <expected>
        <text><![CDATA[${outputStr}]]></text>
      </expected>
    </testcase>`;
        });
      }

      xml += `
  <question type="coderunner">
    <name>
      <text><![CDATA[${q.title}]]></text>
    </name>
    <questiontext format="html">
      <text><![CDATA[${q.description}]]></text>
    </questiontext>
    <coderunnertype>python3</coderunnertype>
    <testcases>
${testcasesXml}
    </testcases>
  </question>\n`;
    });

    xml += '</quiz>';
    downloadFile('moodle_coderunner_export.xml', xml, 'application/xml');
  };

  return (
    <div className="container export-container animate-fade-in">
      <div className="export-header flex-between">
        <div>
          <h1 className="page-title text-gradient">Bulk Export</h1>
          <p className="page-subtitle">Download grouped questions for your LMS or Moodle portal.</p>
        </div>
        
        <div className="group-toggle">
          <button 
            className={`toggle-btn ${groupBy === 'topic' ? 'active' : ''}`}
            onClick={() => { setGroupBy('topic'); setExpandedGroups(new Set()); }}
          >
            By Topic
          </button>
          <button 
            className={`toggle-btn ${groupBy === 'company' ? 'active' : ''}`}
            onClick={() => { setGroupBy('company'); setExpandedGroups(new Set()); }}
          >
            By Company
          </button>
        </div>

        <div className="export-actions">
          <button 
            className="btn-secondary" 
            onClick={exportTXT}
            disabled={selectedIds.size === 0}
          >
            <Download size={18} /> TXT
          </button>
          <button 
            className="btn-secondary" 
            onClick={exportJSON}
            disabled={selectedIds.size === 0}
          >
            <Download size={18} /> JSON
          </button>
          <button 
            className="btn-primary" 
            onClick={exportMoodleXML}
            disabled={selectedIds.size === 0}
          >
            <Download size={18} /> Moodle XML
          </button>
        </div>
      </div>

      {error && (
        <div className="error-banner flex-center">
          <AlertCircle size={20} />
          <span>{error}</span>
        </div>
      )}

      {loading ? (
        <div className="loading-state flex-center">
          <div className="spinner"></div>
          <span>Loading questions...</span>
        </div>
      ) : (
        <div className="table-container glass-panel">
          <table className="export-table">
            <thead>
              <tr>
                <th className="checkbox-col" onClick={toggleSelectAll} style={{cursor: 'pointer'}}>
                  {selectedIds.size === questions.length && questions.length > 0 ? (
                    <CheckSquare size={18} className="text-primary" />
                  ) : (
                    <Square size={18} className="text-secondary" />
                  )}
                </th>
                <th>Title</th>
                <th>Category</th>
              </tr>
            </thead>
            <tbody>
              {questions.length === 0 ? (
                <tr>
                  <td colSpan={3} className="empty-state">No questions found.</td>
                </tr>
              ) : (
                questions.map((q) => {
                  const isSelected = selectedIds.has(q.id);
                  return (
                    <tr 
                      key={q.id} 
                      className={`export-row ${isSelected ? 'selected' : ''}`}
                      onClick={() => toggleSelect(q.id)}
                    >
                      <td className="checkbox-col">
                        {isSelected ? (
                          <CheckSquare size={18} className="text-primary" />
                        ) : (
                          <Square size={18} className="text-secondary" />
                        )}
                      </td>
                      <td className="font-medium">{q.title}</td>
                      <td><span className="category-tag">{q.category}</span></td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
