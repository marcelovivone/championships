require('dotenv/config');

module.exports = ({ config }) => ({
  ...config,
  name: 'Championships Mobile',
  slug: 'championships-mobile',
  version: '0.1.0',
  orientation: 'portrait',
  userInterfaceStyle: 'light',
  extra: {
    API_BASE_URL: process.env.API_BASE_URL || 'http://10.0.2.2:3000',
  },
});
