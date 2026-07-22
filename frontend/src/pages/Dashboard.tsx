import React from 'react';
import { useNavigate } from 'react-router-dom';
import { Code2, BrainCircuit, Network, Cpu, Layout, Database } from 'lucide-react';
import './Dashboard.css';

const categories = [
  {
    id: 'dsa',
    name: 'Data Structures and Algorithms',
    shortName: 'DSA',
    icon: Code2,
    color: 'var(--accent-primary)',
    description: 'Master the fundamentals of problem solving and optimize your code.'
  },
  {
    id: 'machine-learning',
    name: 'Machine Learning',
    shortName: 'ML',
    icon: BrainCircuit,
    color: '#8b5cf6', // Purple
    description: 'Explore neural networks, models, and artificial intelligence.'
  },
  {
    id: 'computer-networks',
    name: 'Computer Networks',
    shortName: 'CN',
    icon: Network,
    color: '#3b82f6', // Blue
    description: 'Understand the protocols and architecture of the internet.'
  },
  {
    id: 'system-design',
    name: 'System Design',
    shortName: 'System Design',
    icon: Layout,
    color: '#f59e0b', // Amber
    description: 'Learn to build scalable, highly available distributed systems.'
  },
  {
    id: 'dbms',
    name: 'DBMS',
    shortName: 'DB',
    icon: Database,
    color: '#ef4444', // Red
    description: 'Master SQL, NoSQL, indexing, and data modeling.'
  },
  {
    id: 'cyber-security',
    name: 'Cyber Security',
    shortName: 'Sec',
    icon: Cpu,
    color: '#10b981', // Emerald
    description: 'Learn about network security, cryptography, and vulnerabilities.'
  },
  {
    id: 'cloud-computing',
    name: 'Cloud Computing',
    shortName: 'Cloud',
    icon: Database,
    color: '#0ea5e9', // Sky blue
    description: 'Master AWS, GCP, distributed architectures, and microservices.'
  },
  {
    id: 'operating-systems',
    name: 'Operating Systems',
    shortName: 'OS',
    icon: Cpu,
    color: '#f43f5e', // Rose
    description: 'Dive deep into memory management, threading, and kernels.'
  }
];

export default function Dashboard() {
  const navigate = useNavigate();

  return (
    <div className="dashboard-container animate-fade-in">
      <div className="dashboard-header">
        <h1 className="intelx-title text-gradient">IntelX</h1>
        <p className="dashboard-subtitle">Select a domain to begin your mastery journey.</p>
      </div>

      <div className="categories-grid">
        {categories.map((cat) => (
          <div 
            key={cat.id} 
            className="category-card glass-panel" 
            onClick={() => navigate(`/category/${cat.id}`)}
          >
            <div className="category-icon-wrapper" style={{ backgroundColor: `${cat.color}20`, color: cat.color }}>
              <cat.icon size={32} />
            </div>
            <h2 className="category-name">{cat.name}</h2>
            <h3 className="category-shortname">{cat.shortName}</h3>
            <p className="category-desc">{cat.description}</p>
            <div className="card-hover-effect" style={{ background: `radial-gradient(circle at center, ${cat.color}30 0%, transparent 70%)`}}></div>
          </div>
        ))}
      </div>
    </div>
  );
}
