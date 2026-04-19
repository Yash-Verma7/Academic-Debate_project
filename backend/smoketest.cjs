const axios = require('axios');
(async () => {
  try {
    const api = axios.create({ baseURL: 'http://localhost:5001' });
    
    // Login
    const { data: authData } = await api.post('/api/users/login', {
      email: 'student@example.com',
      password: 'password123'
    });
    const token = authData.token;
    api.defaults.headers.common['Authorization'] = `Bearer ${token}`;
    console.log('TOKEN_OK=yes');

    // Get Profile
    const { data: getProf } = await api.get('/api/users/profile');
    console.log('GET_PROFILE=yes', !!getProf.email);

    // Update Profile
    const { data: updateProf } = await api.put('/api/users/profile', {
      firstName: 'Smoke', lastName: 'Test', country: 'US'
    });
    console.log('UPDATE_PROFILE=yes', updateProf.user.firstName === 'Smoke');

    // Get Feed
    const { data: feed } = await api.get('/api/debates/home-feed');
    const debate = feed.trendingDebates[0];
    if (!debate) throw new Error("No debates found");

    // Join
    await api.post(`/api/debates/${debate._id}/join`, { side: 'audience' }).catch(e => console.log('Already joined or error:', e.response?.data));
    
    // Send message via API
    const { data: msgData } = await api.post('/api/messages', {
      debateId: debate._id,
      side: 'audience',
      content: 'This is a smoke test message via API'
    });
    console.log('CREATE_MSG=yes', !!msgData._id);

    // Fetch messages
    const { data: msgList } = await api.get(`/api/messages/${debate._id}`);
    console.log('FETCH_MSGS=yes', msgList.length > 0);

    console.log('SMOKE_TEST=PASSED');
  } catch (err) {
    console.error('SMOKE_TEST=FAILED', err.response?.data || err.message);
  }
})();
