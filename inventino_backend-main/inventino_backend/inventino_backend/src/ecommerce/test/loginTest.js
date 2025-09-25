import axios from 'axios';

const loginUser = async () => {
  try {
    const response = await axios.post('http://localhost:3000/api/users/login', {
      email: 'testuser@example.com',
      password: 'password123'
    });
    console.log('Login successful:', response.data);
  } catch (error) {
    console.error('Error logging in:', error.response ? error.response.data : error.message);
    console.error('Full error details:', error);
  }
};

loginUser();
