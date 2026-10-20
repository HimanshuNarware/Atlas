import React, { useState } from 'react';
import { api } from '../services/api';
import { User, LoginResponse } from '../types';

export const UserManagement: React.FC = () => {
  // Login state
  const [loginEmail, setLoginEmail] = useState('');
  const [loginPassword, setLoginPassword] = useState('');
  const [loggedInUser, setLoggedInUser] = useState<LoginResponse | null>(null);

  // Create User state with all fields requested by user:
  // email, name, last name, role, approve, delete, block
  const [createForm, setCreateForm] = useState({
    email: '',
    name: '',
    last_name: '',
    password: '',
    role: 'user' as 'user' | 'admin',
    approve: false,
    delete: false,
    block: false,
  });

  // Admin Token state for admin operations
  const [adminToken, setAdminToken] = useState('admin-super-secret-key-12345');
  const [usersList, setUsersList] = useState<User[]>([]);
  const [loading, setLoading] = useState(false);
  const [feedback, setFeedback] = useState<{ message: string; isError?: boolean } | null>(null);

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setFeedback(null);
    try {
      const res = await api.login(loginEmail, loginPassword);
      if (res.success && res.data) {
        setLoggedInUser(res.data);
        if (res.data.user.role === 'admin') {
          setAdminToken(res.data.token);
        }
        setFeedback({ message: `Logged in successfully as ${res.data.user.email} (${res.data.user.role})` });
      } else {
        setFeedback({ message: res.error?.message || 'Login failed', isError: true });
      }
    } catch (err) {
      setFeedback({ message: 'Network error connecting to backend', isError: true });
    } finally {
      setLoading(false);
    }
  };

  const handleCreateUser = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setFeedback(null);
    try {
      const res = await api.createUser(createForm);
      if (res.success && res.data) {
        setFeedback({ message: `User "${res.data.email}" created successfully!` });
        // Reset form
        setCreateForm({
          email: '',
          name: '',
          last_name: '',
          password: '',
          role: 'user',
          approve: false,
          delete: false,
          block: false,
        });
        if (adminToken) {
          fetchUsers();
        }
      } else {
        setFeedback({ message: res.error?.message || 'Failed to create user', isError: true });
      }
    } catch (err) {
      setFeedback({ message: 'Failed to create user: Network error', isError: true });
    } finally {
      setLoading(false);
    }
  };

  const fetchUsers = async () => {
    if (!adminToken) {
      setFeedback({ message: 'Please provide an admin token to list users', isError: true });
      return;
    }
    setLoading(true);
    try {
      const res = await api.listUsers(adminToken);
      if (res.success && res.data) {
        setUsersList(res.data);
        setFeedback({ message: `Fetched ${res.data.length} users successfully.` });
      } else {
        setFeedback({ message: res.error?.message || 'Failed to fetch users', isError: true });
      }
    } catch (err) {
      setFeedback({ message: 'Error fetching users', isError: true });
    } finally {
      setLoading(false);
    }
  };

  const handleBlockToggle = async (user: User) => {
    if (!adminToken) return;
    setLoading(true);
    try {
      const res = await api.blockUser(user.id, !user.block, adminToken);
      if (res.success) {
        setFeedback({ message: `User ${user.email} ${!user.block ? 'blocked' : 'unblocked'}` });
        fetchUsers();
      } else {
        setFeedback({ message: res.error?.message || 'Operation failed', isError: true });
      }
    } catch (err) {
      setFeedback({ message: 'Failed to update block status', isError: true });
    } finally {
      setLoading(false);
    }
  };

  const handleApproveToggle = async (user: User) => {
    if (!adminToken) return;
    setLoading(true);
    try {
      const res = await api.approveUser(user.id, !user.approve, adminToken);
      if (res.success) {
        setFeedback({ message: `User ${user.email} ${!user.approve ? 'approved' : 'approval revoked'}` });
        fetchUsers();
      } else {
        setFeedback({ message: res.error?.message || 'Operation failed', isError: true });
      }
    } catch (err) {
      setFeedback({ message: 'Failed to update approve status', isError: true });
    } finally {
      setLoading(false);
    }
  };

  const handleDeleteUser = async (id: string, email: string) => {
    if (!adminToken) return;
    if (!window.confirm(`Are you sure you want to delete user ${email}?`)) return;
    setLoading(true);
    try {
      const res = await api.deleteUser(id, adminToken);
      if (res.success) {
        setFeedback({ message: `User ${email} deleted.` });
        fetchUsers();
      } else {
        setFeedback({ message: res.error?.message || 'Deletion failed', isError: true });
      }
    } catch (err) {
      setFeedback({ message: 'Failed to delete user', isError: true });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '2rem' }}>
      {feedback && (
        <div
          style={{
            padding: '1rem',
            borderRadius: '8px',
            backgroundColor: feedback.isError ? '#ef444420' : '#10b98120',
            border: `1px solid ${feedback.isError ? '#ef4444' : '#10b981'}`,
            color: feedback.isError ? '#fca5a5' : '#6ee7b7',
            fontSize: '0.9rem',
          }}
        >
          {feedback.message}
        </div>
      )}

      {/* Grid: Create User & Login */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(360px, 1fr))', gap: '1.5rem' }}>
        {/* Create User Card */}
        <div className="card">
          <h2 style={{ fontSize: '1.25rem', marginBottom: '1rem', fontWeight: 600 }}>Create New User</h2>
          <p style={{ color: 'var(--text-secondary)', fontSize: '0.85rem', marginBottom: '1.25rem' }}>
            Endpoints: <code>POST /userrouter/create</code> (or <code>/users</code>)
          </p>
          <form onSubmit={handleCreateUser}>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.75rem' }}>
              <div className="form-group">
                <label className="form-label">Name</label>
                <input
                  type="text"
                  required
                  placeholder="First name"
                  className="form-control"
                  value={createForm.name}
                  onChange={(e) => setCreateForm({ ...createForm, name: e.target.value })}
                />
              </div>
              <div className="form-group">
                <label className="form-label">Last Name</label>
                <input
                  type="text"
                  required
                  placeholder="Last name"
                  className="form-control"
                  value={createForm.last_name}
                  onChange={(e) => setCreateForm({ ...createForm, last_name: e.target.value })}
                />
              </div>
            </div>

            <div className="form-group">
              <label className="form-label">Email</label>
              <input
                type="email"
                required
                placeholder="user@example.com"
                className="form-control"
                value={createForm.email}
                onChange={(e) => setCreateForm({ ...createForm, email: e.target.value })}
              />
            </div>

            <div className="form-group">
              <label className="form-label">Password (hashed with bcrypt)</label>
              <input
                type="password"
                required
                placeholder="Min 6 characters"
                className="form-control"
                value={createForm.password}
                onChange={(e) => setCreateForm({ ...createForm, password: e.target.value })}
              />
            </div>

            <div className="form-group">
              <label className="form-label">Role</label>
              <select
                className="form-control"
                value={createForm.role}
                onChange={(e) => setCreateForm({ ...createForm, role: e.target.value as 'user' | 'admin' })}
              >
                <option value="user">User</option>
                <option value="admin">Admin</option>
              </select>
            </div>

            {/* Checkbox fields: approve, block, delete */}
            <div style={{ display: 'flex', gap: '1.5rem', marginBottom: '1.25rem', marginTop: '0.5rem' }}>
              <label style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', fontSize: '0.85rem' }}>
                <input
                  type="checkbox"
                  checked={createForm.approve}
                  onChange={(e) => setCreateForm({ ...createForm, approve: e.target.checked })}
                />
                Approve
              </label>
              <label style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', fontSize: '0.85rem' }}>
                <input
                  type="checkbox"
                  checked={createForm.block}
                  onChange={(e) => setCreateForm({ ...createForm, block: e.target.checked })}
                />
                Block
              </label>
              <label style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', fontSize: '0.85rem' }}>
                <input
                  type="checkbox"
                  checked={createForm.delete}
                  onChange={(e) => setCreateForm({ ...createForm, delete: e.target.checked })}
                />
                Delete (soft)
              </label>
            </div>

            <button type="submit" disabled={loading} className="btn btn-primary" style={{ width: '100%' }}>
              {loading ? 'Creating...' : 'Register User'}
            </button>
          </form>
        </div>

        {/* User Login Card */}
        <div className="card">
          <h2 style={{ fontSize: '1.25rem', marginBottom: '1rem', fontWeight: 600 }}>Login System</h2>
          <p style={{ color: 'var(--text-secondary)', fontSize: '0.85rem', marginBottom: '1.25rem' }}>
            Endpoint: <code>POST /userrouter/login</code> with bcrypt validation
          </p>
          <form onSubmit={handleLogin}>
            <div className="form-group">
              <label className="form-label">Email</label>
              <input
                type="email"
                required
                placeholder="user@example.com"
                className="form-control"
                value={loginEmail}
                onChange={(e) => setLoginEmail(e.target.value)}
              />
            </div>
            <div className="form-group">
              <label className="form-label">Password</label>
              <input
                type="password"
                required
                placeholder="Password"
                className="form-control"
                value={loginPassword}
                onChange={(e) => setLoginPassword(e.target.value)}
              />
            </div>
            <button type="submit" disabled={loading} className="btn btn-primary" style={{ width: '100%', marginBottom: '1rem' }}>
              {loading ? 'Authenticating...' : 'Sign In'}
            </button>
          </form>

          {loggedInUser && (
            <div style={{ marginTop: '1.5rem', padding: '1rem', background: '#0f172a', borderRadius: '8px' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.5rem' }}>
                <span style={{ fontWeight: 600, fontSize: '0.9rem' }}>Active Session</span>
                <span className={`badge badge-${loggedInUser.user.role}`}>{loggedInUser.user.role}</span>
              </div>
              <p style={{ fontSize: '0.85rem', color: 'var(--text-secondary)' }}>
                {loggedInUser.user.name} {loggedInUser.user.last_name} ({loggedInUser.user.email})
              </p>
              <div style={{ marginTop: '0.5rem', fontSize: '0.75rem', color: '#64748b', wordBreak: 'break-all' }}>
                <strong>JWT:</strong> {loggedInUser.token.slice(0, 36)}...
              </div>
              <button
                onClick={() => setLoggedInUser(null)}
                className="btn btn-outline"
                style={{ marginTop: '0.75rem', width: '100%', fontSize: '0.8rem', padding: '0.35rem' }}
              >
                Sign Out
              </button>
            </div>
          )}
        </div>
      </div>

      {/* Admin Panel: Check Admin Token & User Operations */}
      <div className="card">
        <div style={{ display: 'flex', flexWrap: 'wrap', justifyContent: 'space-between', alignItems: 'center', gap: '1rem', marginBottom: '1rem' }}>
          <div>
            <h2 style={{ fontSize: '1.25rem', fontWeight: 600 }}>Admin User Management & Token Guard</h2>
            <p style={{ color: 'var(--text-secondary)', fontSize: '0.85rem' }}>
              Protected by admin token check middleware (<code>x-admin-token</code> or Bearer JWT admin token)
            </p>
          </div>
          <button onClick={fetchUsers} disabled={loading} className="btn btn-primary">
            {loading ? 'Refreshing...' : 'Load All Users'}
          </button>
        </div>

        <div className="form-group" style={{ maxWidth: '600px' }}>
          <label className="form-label">Admin Secret Token / Admin Bearer JWT</label>
          <input
            type="text"
            className="form-control"
            value={adminToken}
            onChange={(e) => setAdminToken(e.target.value)}
            placeholder="admin-super-secret-key-12345 or admin JWT"
          />
        </div>

        {usersList.length > 0 ? (
          <div style={{ overflowX: 'auto', marginTop: '1rem' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left', fontSize: '0.85rem' }}>
              <thead>
                <tr style={{ borderBottom: '1px solid var(--border-color)', color: 'var(--text-secondary)' }}>
                  <th style={{ padding: '0.75rem' }}>User</th>
                  <th style={{ padding: '0.75rem' }}>Role</th>
                  <th style={{ padding: '0.75rem' }}>Approved</th>
                  <th style={{ padding: '0.75rem' }}>Status</th>
                  <th style={{ padding: '0.75rem' }}>Actions</th>
                </tr>
              </thead>
              <tbody>
                {usersList.map((u) => (
                  <tr key={u.id} style={{ borderBottom: '1px solid #33415550' }}>
                    <td style={{ padding: '0.75rem' }}>
                      <div style={{ fontWeight: 600 }}>{u.name} {u.last_name}</div>
                      <div style={{ color: 'var(--text-secondary)', fontSize: '0.8rem' }}>{u.email}</div>
                    </td>
                    <td style={{ padding: '0.75rem' }}>
                      <span className={`badge badge-${u.role}`}>{u.role}</span>
                    </td>
                    <td style={{ padding: '0.75rem' }}>
                      {u.approve ? (
                        <span style={{ color: '#10b981' }}>✓ Approved</span>
                      ) : (
                        <span style={{ color: '#f59e0b' }}>Pending</span>
                      )}
                    </td>
                    <td style={{ padding: '0.75rem' }}>
                      {u.block ? (
                        <span className="badge badge-blocked">Blocked</span>
                      ) : (
                        <span className="badge badge-active">Active</span>
                      )}
                    </td>
                    <td style={{ padding: '0.75rem' }}>
                      <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap' }}>
                        <button
                          onClick={() => handleBlockToggle(u)}
                          className={`btn ${u.block ? 'btn-success' : 'btn-warning'}`}
                          style={{ fontSize: '0.75rem', padding: '0.3rem 0.6rem' }}
                        >
                          {u.block ? 'Unblock' : 'Block'}
                        </button>
                        <button
                          onClick={() => handleApproveToggle(u)}
                          className="btn btn-outline"
                          style={{ fontSize: '0.75rem', padding: '0.3rem 0.6rem' }}
                        >
                          {u.approve ? 'Revoke' : 'Approve'}
                        </button>
                        <button
                          onClick={() => handleDeleteUser(u.id, u.email)}
                          className="btn btn-danger"
                          style={{ fontSize: '0.75rem', padding: '0.3rem 0.6rem' }}
                        >
                          Delete
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          <div style={{ textAlign: 'center', padding: '2rem', color: 'var(--text-secondary)' }}>
            No users loaded yet. Enter your admin token and click "Load All Users".
          </div>
        )}
      </div>
    </div>
  );
};
