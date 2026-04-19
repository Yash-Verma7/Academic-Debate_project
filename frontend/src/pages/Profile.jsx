import { useEffect, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import TopNav from '../components/TopNav';
import api from '../services/api';

const countries = ['India', 'USA', 'UK', 'Canada', 'Australia', 'Germany', 'UAE', 'Singapore'];
const genderOptions = [
  { label: 'Male', value: 'male' },
  { label: 'Female', value: 'female' },
  { label: 'Other', value: 'other' },
  { label: 'Prefer not to say', value: 'prefer_not_to_say' }
];
const roleOptions = [
  { label: 'Student', value: 'student' },
  { label: 'Moderator', value: 'moderator' },
  { label: 'Other', value: 'other' }
];
const MAX_PROFILE_IMAGE_BYTES = 1024 * 1024;

function Profile() {
  const [profile, setProfile] = useState(null);
  const [form, setForm] = useState({
    firstName: '',
    middleName: '',
    lastName: '',
    email: '',
    role: 'student',
    country: '',
    phoneNumber: '',
    dateOfBirth: '',
    gender: '',
    profileImage: ''
  });
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const fileInputRef = useRef(null);
  const navigate = useNavigate();

  const loadProfile = async () => {
    try {
      setLoading(true);
      setError('');
      const { data } = await api.get('/api/users/profile');
      setProfile(data);
      setForm({
        firstName: data.firstName || '',
        middleName: data.middleName || '',
        lastName: data.lastName || '',
        email: data.email || '',
        role: data.role || 'student',
        country: data.country || '',
        phoneNumber: data.phoneNumber || '',
        dateOfBirth: data.dateOfBirth ? new Date(data.dateOfBirth).toISOString().slice(0, 10) : '',
        gender: data.gender || '',
        profileImage: data.profileImage || data.avatarUrl || ''
      });
    } catch (apiError) {
      const status = apiError?.response?.status;
      if (status === 401) {
        setError('Session expired. Redirecting to login...');
        return;
      }

      setError(apiError.response?.data?.message || 'Failed to load profile');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadProfile();
  }, []);

  const handleAvatarChange = (event) => {
    const file = event.target.files?.[0];
    if (!file) return;

    if (!file.type.startsWith('image/')) {
      setError('Please choose a valid image file');
      event.target.value = '';
      return;
    }

    if (file.size > MAX_PROFILE_IMAGE_BYTES) {
      setError('Profile image must be 1MB or smaller');
      event.target.value = '';
      return;
    }

    setError('');
    const reader = new FileReader();
    reader.onload = () => {
      setForm((prev) => ({ ...prev, profileImage: reader.result?.toString() || '' }));
    };
    reader.readAsDataURL(file);
  };

  const handleUpdate = async (event) => {
    event.preventDefault();
    try {
      setSaving(true);
      setError('');
      setSuccess('');

      if (!form.firstName.trim()) {
        setError('First name is required');
        setSaving(false);
        return;
      }

      if (!form.email.trim()) {
        setError('Email is required');
        setSaving(false);
        return;
      }

      const emailPattern = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
      if (!emailPattern.test(form.email.trim())) {
        setError('Enter a valid email address');
        setSaving(false);
        return;
      }

      const phonePattern = /^\d{10}$/;
      const trimmedPhone = form.phoneNumber.trim();
      if (trimmedPhone.length > 0 && !phonePattern.test(trimmedPhone)) {
        setError('Phone number must be exactly 10 digits');
        setSaving(false);
        return;
      }

      const payload = {
        firstName: form.firstName.trim(),
        middleName: form.middleName.trim(),
        lastName: form.lastName.trim(),
        email: form.email.trim(),
        role: form.role,
        country: form.country,
        phoneNumber: trimmedPhone,
        dateOfBirth: form.dateOfBirth || null,
        gender: form.gender,
        profileImage: form.profileImage,
        avatarUrl: form.profileImage
      };

      const { data } = await api.put('/api/users/profile', payload);
      setProfile((prev) => ({ ...prev, ...data.user }));

      const storedUser = JSON.parse(localStorage.getItem('user') || '{}');
      localStorage.setItem(
        'user',
        JSON.stringify({
          ...storedUser,
          name: data.user.name,
          email: data.user.email,
          profileImage: data.user.profileImage,
          avatarUrl: data.user.avatarUrl,
          role: data.user.role
        })
      );

      setSuccess('Profile updated successfully');
    } catch (apiError) {
      setError(apiError.response?.data?.message || 'Failed to update profile');
    } finally {
      setSaving(false);
    }
  };

  const avatarText = (profile?.name || 'U').charAt(0).toUpperCase();
  const phoneDigitsLength = form.phoneNumber.length;
  const isPhoneValid = /^\d{10}$/.test(form.phoneNumber);
  const showPhoneWarning = phoneDigitsLength > 0 && !isPhoneValid;

  const handleLogout = () => {
    localStorage.removeItem('token');
    localStorage.removeItem('user');
    navigate('/login');
  };

  return (
    <div className="profile-edit-page">
      <TopNav />

      <main className="profile-edit-shell">
        <section className="profile-edit-card">
        <div className="profile-card-toolbar">
          <h3>Edit Profile</h3>
          <button type="button" className="profile-logout-btn" onClick={handleLogout}>
            Logout
          </button>
        </div>

        {loading && <p className="subtle">Loading profile...</p>}
        {error && <p className="error-text">{error}</p>}
        {success && <p className="success-text">{success}</p>}

        {!loading && profile && (
          <>
            <section className="profile-avatar-section">
              <div className="profile-avatar-wrap">
                {form.profileImage ? (
                  <img src={form.profileImage} alt="Profile" className="profile-avatar-image" />
                ) : (
                  <div className="profile-avatar-fallback">{avatarText}</div>
                )}
                <button
                  type="button"
                  className="profile-avatar-edit-btn"
                  onClick={() => fileInputRef.current?.click()}
                >
                  📷
                </button>
                <input
                  ref={fileInputRef}
                  type="file"
                  accept="image/*"
                  style={{ display: 'none' }}
                  onChange={handleAvatarChange}
                />
              </div>
              <h2 className="profile-name">{profile.name}</h2>
              <p className="profile-email">{profile.email}</p>
            </section>

            <form className="profile-edit-form" onSubmit={handleUpdate}>
              <div className="profile-field-group">
                <label htmlFor="firstName">First Name</label>
                <input
                  id="firstName"
                  placeholder="Enter first name"
                  value={form.firstName}
                  onChange={(event) => setForm((prev) => ({ ...prev, firstName: event.target.value }))}
                  required
                />
              </div>

              <div className="profile-field-group">
                <label htmlFor="middleName">Middle Name</label>
                <input
                  id="middleName"
                  placeholder="Enter middle name"
                  value={form.middleName}
                  onChange={(event) => setForm((prev) => ({ ...prev, middleName: event.target.value }))}
                />
              </div>

              <div className="profile-field-group">
                <label htmlFor="lastName">Last Name</label>
                <input
                  id="lastName"
                  placeholder="Enter last name"
                  value={form.lastName}
                  onChange={(event) => setForm((prev) => ({ ...prev, lastName: event.target.value }))}
                />
              </div>

              <div className="profile-field-group">
                <label htmlFor="email">Email</label>
                <input
                  id="email"
                  type="email"
                  placeholder="Enter email"
                  value={form.email}
                  onChange={(event) => setForm((prev) => ({ ...prev, email: event.target.value }))}
                  required
                />
              </div>

              <div className="profile-field-group">
                <label htmlFor="role">Role</label>
                <select
                  id="role"
                  value={form.role}
                  onChange={(event) => setForm((prev) => ({ ...prev, role: event.target.value }))}
                >
                  {roleOptions.map((item) => (
                    <option key={item.value} value={item.value}>{item.label}</option>
                  ))}
                </select>
              </div>

              <div className="profile-field-group">
                <label htmlFor="country">Country</label>
                <select id="country" value={form.country} onChange={(event) => setForm((prev) => ({ ...prev, country: event.target.value }))}>
                  <option value="">Select country</option>
                  {countries.map((item) => (
                    <option key={item} value={item}>{item}</option>
                  ))}
                </select>
              </div>

              <div className="profile-field-group">
                <label htmlFor="phoneNumber">Phone Number</label>
                <input
                  id="phoneNumber"
                  placeholder="Enter 10-digit phone number"
                  inputMode="numeric"
                  maxLength={10}
                  className={phoneDigitsLength === 0 ? '' : isPhoneValid ? 'border-green-500' : 'border-red-500'}
                  value={form.phoneNumber}
                  onChange={(event) => {
                    const digitsOnly = event.target.value.replace(/\D/g, '').slice(0, 10);
                    setForm((prev) => ({ ...prev, phoneNumber: digitsOnly }));
                  }}
                />
                <p className={`phone-validation-message ${showPhoneWarning ? 'visible' : ''}`}>
                  Phone number must be 10 digits
                </p>
              </div>

              <div className="profile-field-group">
                <label htmlFor="dateOfBirth">Date of Birth</label>
                <input
                  id="dateOfBirth"
                  type="date"
                  value={form.dateOfBirth}
                  onChange={(event) => setForm((prev) => ({ ...prev, dateOfBirth: event.target.value }))}
                />
              </div>

              <div className="profile-field-group">
                <label htmlFor="gender">Gender</label>
                <select id="gender" value={form.gender} onChange={(event) => setForm((prev) => ({ ...prev, gender: event.target.value }))}>
                  <option value="">Select gender</option>
                  {genderOptions.map((item) => (
                    <option key={item.value} value={item.value}>{item.label}</option>
                  ))}
                </select>
              </div>

              <button type="submit" className="profile-update-btn" disabled={saving}>
                {saving ? 'Updating...' : 'Save / Update'}
              </button>
            </form>
          </>
        )}
        </section>
      </main>
    </div>
  );
}

export default Profile;
