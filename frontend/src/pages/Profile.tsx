import React, { useEffect, useState } from 'react';
import axios from 'axios';
import { useAuthStore } from '../store/useAuthStore';
import { Trophy, Activity, Calendar as CalendarIcon, User as UserIcon, Code2 } from 'lucide-react';
import './Profile.css';

const API_BASE = 'http://localhost:3000';

interface UserData {
  username: string;
  joinedAt: string;
  stats: {
    totalSolved: number;
    categoryBreakdown: Record<string, number>;
    calendarHeatmap: Record<string, number>;
  };
  recentSubmissions: any[];
}

export default function Profile() {
  const { user } = useAuthStore();
  const [profileData, setProfileData] = useState<UserData | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchProfile = async () => {
      if (!user) return;
      try {
        const response = await axios.get(`${API_BASE}/users/${user.id}`);
        if (response.data.success) {
          setProfileData(response.data.data);
        }
      } catch (err) {
        console.error('Failed to fetch profile', err);
      } finally {
        setLoading(false);
      }
    };
    fetchProfile();
  }, [user]);

  if (!user) {
    return (
      <div className="container" style={{ marginTop: '40px' }}>
        <div className="glass-panel" style={{ padding: '40px', textAlign: 'center' }}>
          <h2>Please log in to view your profile</h2>
        </div>
      </div>
    );
  }

  if (loading) {
    return <div className="loading-state flex-center"><div className="spinner"></div></div>;
  }

  return (
    <div className="container profile-container animate-fade-in">
      <div className="profile-header glass-panel">
        <div className="avatar-circle">
          <UserIcon size={48} color="var(--accent-primary)" />
        </div>
        <div className="profile-info">
          <h1 className="profile-username">{profileData?.username || user.username}</h1>
          <p className="profile-joined">
            <CalendarIcon size={14} className="mr-2" />
            Joined {profileData?.joinedAt ? new Date(profileData.joinedAt).toLocaleDateString() : 'recently'}
          </p>
        </div>
      </div>

      <div className="stats-grid">
        {/* Total Solved Card */}
        <div className="stat-card glass-panel">
          <div className="stat-header">
            <Trophy size={20} className="stat-icon trophy" />
            <h3>Total Solved</h3>
          </div>
          <div className="stat-value">{profileData?.stats?.totalSolved || 0}</div>
          <p className="stat-desc">Questions conquered</p>
        </div>

        {/* Category Breakdown Card */}
        <div className="stat-card glass-panel col-span-2">
          <div className="stat-header">
            <Activity size={20} className="stat-icon activity" />
            <h3>Category Breakdown</h3>
          </div>
          <div className="category-chart">
            {profileData?.stats?.categoryBreakdown && Object.keys(profileData.stats.categoryBreakdown).length > 0 ? (
              Object.entries(profileData.stats.categoryBreakdown).map(([cat, count]) => (
                <div key={cat} className="category-bar-container">
                  <div className="cat-label">{cat}</div>
                  <div className="cat-bar-wrapper">
                    <div 
                      className="cat-bar" 
                      style={{ width: `${(count / Math.max(1, profileData.stats.totalSolved)) * 100}%` }}
                    ></div>
                  </div>
                  <div className="cat-count">{count}</div>
                </div>
              ))
            ) : (
              <p className="empty-stats">No categories solved yet.</p>
            )}
          </div>
        </div>
      </div>

      <div className="recent-submissions glass-panel">
        <div className="stat-header">
          <Code2 size={20} className="stat-icon recent" />
          <h3>Recent Submissions</h3>
        </div>
        {profileData?.recentSubmissions && profileData.recentSubmissions.length > 0 ? (
          <ul className="submissions-list">
            {profileData.recentSubmissions.map((sub, i) => (
              <li key={i} className="submission-item">
                <span className={`status-badge ${sub.status === 'Pass' ? 'success' : 'error'}`}>
                  {sub.status}
                </span>
                <span className="sub-lang">{sub.language}</span>
                <span className="sub-date">{new Date(sub.submittedAt).toLocaleDateString()}</span>
              </li>
            ))}
          </ul>
        ) : (
          <p className="empty-stats" style={{ marginTop: '16px' }}>No recent submissions.</p>
        )}
      </div>
    </div>
  );
}
